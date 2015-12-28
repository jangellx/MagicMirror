jQuery.fn.updateWithText = function(text, speed)
{
	var dummy = $('<div/>').html(text);

	if ($(this).html() != dummy.html())
	{
		$(this).fadeOut(speed/2, function() {
			$(this).html(text);
			$(this).fadeIn(speed/2, function() {
				//done
			});
		});
	}
}

jQuery.fn.outerHTML = function(s) {
    return s
        ? this.before(s).remove()
        : jQuery("<p>").append(this.eq(0).clone()).html();
};

function roundVal(temp)
{
	return Math.round( temp );
}

function kmh2beaufort(kmh)
{
	var speeds = [1, 5, 11, 19, 28, 38, 49, 61, 74, 88, 102, 117, 1000];
	for (var beaufort in speeds) {
		var speed = speeds[beaufort];
		if (speed > kmh) {
			return beaufort;
		}
	}
	return 12;
}

// from http://stackoverflow.com/questions/5560248/programmatically-lighten-or-darken-a-hex-color-or-rgb-and-blend-colors
function shadeColor2(color, percent) {   
    var f=parseInt(color.slice(1),16),t=percent<0?0:255,p=percent<0?percent*-1:percent,R=f>>16,G=f>>8&0x00FF,B=f&0x0000FF;
    return "#"+(0x1000000+(Math.round((t-R)*p)+R)*0x10000+(Math.round((t-G)*p)+G)*0x100+(Math.round((t-B)*p)+B)).toString(16).slice(1);
}

jQuery(document).ready(function($) {

	var news = [];
	var newsIndex = 0;

	var eventList = [];

	var lastCompliment;
	var compliment;

	var mbtaAlerts          = [];				// List of MBTA alerts as HTML, one for each alert we have a JSON request for
	var mbtaAlertsPending   = 0;				// Number of JSON requests for MBTA alerts that we're waiting on.  Once this gets to 0, we update the div with the contents of the mbtaAlerts

	var holidayThisDay      = -1				// Used to decide if this is the same day as the last time we checked.  -1 means we havne't checked yet.

	var tempGraphSVG;							// SVG used to draw the temp/rain graph into
	var weekGraphSVG;							// SVG used to draw the weekly forecast graph into

	moment.locale(lang, {						// Language localization
		calendar : {							// Calendar localization used for upcoming holidays.  Should really be localized too...
			lastDay : '[Yesterday was] ' ,
			sameDay : '[Today is] ',
			nextDay : '[Tomorrow is] ',
			thisWeek : 'dddd [is] ',
			lastWeek : '[Last] dddd [was] ',
			nextWeek : 'dddd [is] ',
			sameElse : 'MM/DD [is] '
		}
	});

	//connect do Xbee monitor
	// var socket = io.connect('http://rpi-alarm.local:8082');
	// socket.on('dishwasher', function (dishwasherReady) {
	// 	if (dishwasherReady) {
	// 		$('.dishwasher').fadeIn(2000);
	// 		$('.lower-third').fadeOut(2000);
	// 	} else {
	// 		$('.dishwasher').fadeOut(2000);
	// 		$('.lower-third').fadeIn(2000);
	// 	}
	// });


	(function checkVersion()
	{
		$.getJSON('githash.php', {}, function(json, textStatus) {
			if (json) {
				if (json.gitHash != gitHash) {
					window.location.reload();
					window.location.href=window.location.href;
				}
			}
		});
		setTimeout(function() {
			checkVersion();
		}, 3000);
	})();

	(function updateTime()
	{
		var now  = moment();
        var date = now.format('dddd, MMMM Do, YYYY');

		var isWarningTime = (now.hour() == 7) && (now.minute() >= 10) && (now.minute() < 20);		// Between 7:10 and 7:20 AM, turn the color read

		$('.date').html(date);
		$('.time').html(				// Ugly table here, but it gets the job done
		    '<table>' +
			    '<tr>' +
				    '<td class="time' + (isWarningTime ? ' warning"' : '"') +  						// If it's warning time, use the red color
					    'rowspan=4 cellpadding=0>' + now.format('h:mm') +'</td>' +					// Time cell is four rows tall
					'<td> </td>' + 																	// Empty cell next to it
				'</tr><tr>' +
					'<td class="sec">'   + now.format('ss') + '</td>' +								// Seconds cell is pushed down a bit to line up with the top of the time
				'<tr>' +
					'<td class="am_pm">' + now.format('a')  + '</td>' +								// AM/PM cell is pushed up a bit to line up with the bottom of the time
				'</tr><tr><td></td>' +
				'</tr>' +
			'</table>');

		setTimeout(function() {
			updateTime();
		}, 1000);
	})();

	(function updateCalendarData()
	{
		new ical_parser("calendar.php", function(cal){
        	events = cal.getEvents();
        	eventList = [];

        	for (var i in events) {
        		var e = events[i];
        		for (var key in e) {
        			var value = e[key];
					var seperator = key.search(';');
					if (seperator >= 0) {
						var mainKey = key.substring(0,seperator);
						var subKey = key.substring(seperator+1);

						var dt;
						if (subKey == 'VALUE=DATE') {
							//date
							dt = new Date(value.substring(0,4), value.substring(4,6) - 1, value.substring(6,8));
						} else {
							//time
							dt = new Date(value.substring(0,4), value.substring(4,6) - 1, value.substring(6,8), value.substring(9,11), value.substring(11,13), value.substring(13,15));
						}

						if (mainKey == 'DTSTART') e.startDate = dt;
						if (mainKey == 'DTEND') e.endDate = dt;
					}
        		}

                if (e.startDate == undefined){
                    //some old events in Gmail Calendar is "start_date"
                    //FIXME: problems with Gmail's TimeZone
            		var days = moment(e.DTSTART).diff(moment(), 'days');
            		var seconds = moment(e.DTSTART).diff(moment(), 'seconds');
                    var startDate = moment(e.DTSTART);
                } else {
            		var days = moment(e.startDate).diff(moment(), 'days');
            		var seconds = moment(e.startDate).diff(moment(), 'seconds');
                    var startDate = moment(e.startDate);
                }

        		//only add fututre events, days doesn't work, we need to check seconds
        		if (seconds >= 0) {
                    if (seconds <= 60*60*5 || seconds >= 60*60*24*2) {
                        var time_string = moment(startDate).fromNow();
                    }else {
                        var time_string = moment(startDate).calendar()
                    }
                    if (!e.RRULE) {
    	        		eventList.push({'description':e.SUMMARY,'seconds':seconds,'days':time_string});
                    }
                    e.seconds = seconds;
        		}
                
                // Special handling for rrule events
                if (e.RRULE) {
                    var options = new RRule.parseString(e.RRULE);
                    options.dtstart = e.startDate;
                    var rule = new RRule(options);
                    
                    // TODO: don't use fixed end date here, use something like now() + 1 year
                    var dates = rule.between(new Date(), new Date(2016,11,31), true, function (date, i){return i < 10});
                    for (date in dates) {
                        var dt = new Date(dates[date]);
                        var days = moment(dt).diff(moment(), 'days');
                        var seconds = moment(dt).diff(moment(), 'seconds');
                        var startDate = moment(dt);
                     	if (seconds >= 0) {
                            if (seconds <= 60*60*5 || seconds >= 60*60*24*2) {
                                var time_string = moment(dt).fromNow();
                            } else {
                                var time_string = moment(dt).calendar()
                            }
                            eventList.push({'description':e.SUMMARY,'seconds':seconds,'days':time_string});
                        }           
                    }
                }
            };
        	eventList.sort(function(a,b){return a.seconds-b.seconds});

        	setTimeout(function() {
        		updateCalendarData();
        	}, 60000);
    	});
	})();

	(function updateCalendar()
	{
		table = $('<table/>').addClass('xsmall').addClass('calendar-table');
		opacity = 1;

		for (var i in eventList) {
			var e = eventList[i];

			var row = $('<tr/>').css('opacity',opacity);
			row.append($('<td/>').html(e.description).addClass('description'));
			row.append($('<td/>').html(e.days).addClass('days dimmed'));
			table.append(row);

			opacity -= 1 / eventList.length;
		}

		$('.calendar').updateWithText(table,1000);

		setTimeout(function() {
        	updateCalendar();
        }, 1000);
	})();

	// Holiday data comes from holidayapi.com.  We report the next holiday coming up after today,
	//  and if today is a holiday.
	(function updateHolidays()
	{
		// The timer updates a once an hour, but we only need to refresh once a day.  We check to
		//  see if the last time we updated on a different day; if not, we just rearm the timer.
		if( holidayThisDay == moment().day() ) {
			setTimeout(function() {
				updateHolidays();
			}, 3500000);

			return;
		}

		holidayThisDay = moment().day();

		var now        = moment();
		var holidayURL = 'http://holidayapi.com/v1/holidays?country=' + holidayCountry + '&year=';

		$.getJSON( holidayURL + now.format('YYYY'), function(jsonDate, textStatus) {
			// Success; update the holiday string, even if it's just empty
			if( !jsonDate.status == 200 ) {
				setTimeout(function() {
					updateHolidays();
				}, 120000);
				
				return;
			}

			// We got a year's worth of data, so we look for the first five holidays after today
			var holidayText = "";
			var numFound    = 0;
			var opacity     = 1.0;
			var now         = moment();

			addHolidaysFromList( jsonDate.holidays, true );
			if( numFound < holidaysShown) {
				// Didn't find enough holidays this year; try next year, and give up after that
				$.getJSON( holidayURL + now.add( 1, "years" ).format('YYYY'), function(jsonDate2, textStatus) {
					if( !jsonDate.status == 200 ) {
						setTimeout(function() {
							updateHolidays();
						}, 120000);
						
						return;
					}

					addHolidaysFromList( jsonDate2.holidays, false );
					$('.holidays').updateWithText( holidayText, 1000 );

				}).fail (function( jqxhr, textStatus, error ) {
					// Failed; restart the timer for two minutes
					setTimeout(function() {
						updateHolidays();
					}, 120000);
				});
				
			} else{
				// We're done
				$('.holidays').updateWithText( holidayText, 1000 );
			}

			if( numFound == holidaysShown) {
				// Restart the timer in an hour
				setTimeout(function() {
					updateHolidays();
				}, 3500000);
			}

			// Nested function to add holidays from the list
			function addHolidaysFromList( holidays, doDateTest ) {
				var	prevDate = moment();
				prevDate.add( -1, "days" ); 			// To make sure that we get today as well as future dates

				for( var key in holidays ) {
					var thisHoliday = holidays[key];
					var futureDate = moment( thisHoliday[0].date, 'YYYY-MM-DD' );
					if( doDateTest && (prevDate > futureDate) )
							continue;

					// Filter out holidays we don't care about
					var i, j;
					for( i=0; i < holidayFilter.length; i++ ) {
						if( (futureDate.format( "YYYY-" ) + holidayFilter[i]) == key )
							break;
					}

					if( i != holidayFilter.length )
						continue;

					// See if any custom holidays should be inserted before this one
					for( j=0; j < holidaysCustom.length; j++ ) {
						var customDate = moment( futureDate.format( "YYYY-" ) + holidaysCustom[j].date, 'YYYY-MM-DD' );
						var thisCustom = [ {date:holidaysCustom[j].date, name: holidaysCustom[j].name, isCustom:true } ];

						if( (futureDate.format( "YYYY-" ) + holidaysCustom[j].date) == key ) {
							// Same date as the test date; add it to that date
							thisHoliday.push( thisCustom[0] );
							continue;
						} 

						// New date; if it fits between the current and previous date, add it
						if( (customDate > prevDate) && (customDate < futureDate) ) {
							holidayText += buildHolidayString( thisCustom, customDate );
							if( holidaysShown == numFound )
								break;
						}
					}

					// Test before adding, just to be sure
					if( holidaysShown == numFound )
						break;

					// Add this holiday
					holidayText += buildHolidayString( thisHoliday, futureDate );

					// If we've hit our limit, stop
					if( holidaysShown == numFound )
						break;

					prevDate = futureDate;
				}

				// Nested function to return a single holiday as text 
				function buildHolidayString( thisHoliday, date ) {
					var thisHolidayText = "";
					var numAddedHere    = 0;

					for( i=0; i < thisHoliday.length; i++ ) {
						// Filter out any holidays we don't care about
						for( var j=0; j < holidayFilter.length; j++ ) {
							if( thisHoliday[i].name.search( holidayFilter[j] ) != -1 )
								break;
						}

						if( j < holidayFilter.length )
							continue;

						if( numAddedHere == 0 ) {
							// Newly-added element; set the opacity
							thisHolidayText += '<div style="opacity:' + opacity + '">';
							thisHolidayText += '&bull; ';
						}

						if( numAddedHere > 0 ) {
							// Add commas/"and" if applicable
							if( i < thisHoliday.length-1 )
								thisHolidayText += ",";
							else
								thisHolidayText += " and ";

						} else {
							// Add the date
							thisHolidayText += date.calendar();
						}

						// Add the name, coloring custom holidays specially
						if( thisHoliday[i].hasOwnProperty( 'isCustom' ) )
							thisHolidayText += '<span class="holidayCustom">';

						numAddedHere++;
						thisHolidayText += thisHoliday[i].name;

						if( thisHoliday[i].hasOwnProperty( 'isCustom' ) )
							thisHolidayText += "</span>";
					}

					if( numAddedHere > 0 ) {
						if( date.month() == now.month() && date.day() == now.day() )
							thisHolidayText += "!"

						thisHolidayText += '</div>'
						opacity         -= (numFound == 0) ? 0.4 : (numAddedHere / (holidaysShown-1)) * 0.4;
						numFound++;
					}

					return thisHolidayText;
				}
			}

		}).fail (function( jqxhr, textStatus, error ) {
			// Failed; restart the timer for two minutes
			setTimeout(function() {
				updateHolidays();
			}, 120000);

		});
	})();

	(function updateCompliment()
	{
        //see compliments.js
		while (compliment == lastCompliment) {
			//Check for current time  
			var compliments;
			var date = new Date();
			var hour = date.getHours();

			//set compliments to use
			if (hour >= 3 && hour < 12) compliments  = morning;
			if (hour >= 12 && hour < 17) compliments = afternoon;
			if (hour >= 17 || hour < 3) compliments  = evening;

			compliment = Math.floor(Math.random()*compliments.length);
		}

		$('.compliment').updateWithText(compliments[compliment], 4000);

		lastCompliment = compliment;

		setTimeout(function() {
			updateCompliment(true);
		}, 30000);

	})();

	// Get the weather via Dark Sky's API.  We get 1000 free updates a day,
	//  so we only check once every 15 minutes.  That should be more than
	//  frequent enough.  This updates the current conditions, forecast,
	//  summary and graph in the same place so that we can use just one
	//  JSON call.
	(function updateWeatherForecast()
	{
		$.getJSON('proxy.php?url=https://api.forecast.io/forecast/' + darkSkyAPIKey + '/' + darkSkyLat + ',' + darkSkyLon, function(json, textStatus) {
			// Update the current weather
			var current    = json.currently;
			var temp       = roundVal(current.temperature);
			var wind       = roundVal(current.wind);

			var iconClass  = "wi-forecast-io-" + current.icon;
			var icon       = $('<span/>').addClass('icon').addClass('dimmed').addClass('wi').addClass(iconClass);
			$('.temp').updateWithText( icon.outerHTML() + temp + '&deg;', 1000 );

			var today      = json.daily.data[0];
			var now        = new Date();

			var sunString;
			if (today.sunriseTime*1000 < now && today.sunsetTime*1000 > now) {
				var sunset = new moment.unix(today.sunsetTime).format( "h:mm a" );
				sunString = '<span class="wi wi-sunset xdimmed"></span> '  + sunset;
			} else {
				var sunrise = new moment.unix(today.sunriseTime).format( "h:mm a" );
				sunString = '<span class="wi wi-sunrise xdimmed"></span> ' + sunrise;
			}

			var windString = '<span class="wi wi-strong-wind xdimmed"></span> ' + kmh2beaufort(wind) ;
			$('.windsun').updateWithText(windString+' '+sunString, 1000);

			// Update the weekly forecast
//			updateWeatherForcast_UpdateWeeklyTable( json );
			updateWeatherForcast_UpdateWeeklyGraph( json.daily.data );

			// Update the summary text
			$('.summary').updateWithText(json.hourly.summary + ' ' + json.daily.summary /*+ '<br><br>' +
			                             '<span class="xxxsmall xxdimmed">last updated: ' + moment().format('h:mm a ddd MMM D YYYY') + '</span>'*/, 1000);

			$('.luWeather').updateWithText('weather: ' + moment().format('h:mm a ddd MMM D YYYY'), 1000);

			// Generate the graph
			updateWeatherForecast_DrawGraph( json.daily.data, json.hourly.data );

			// Update in 15 minutes
			setTimeout(updateWeatherForecast, 900000);

		}).fail( function() {
			// JSON call failed; re-arm the timer for 5 minutes
			setTimeout(updateWeatherForecast, 300000);
		});
	})();

	// Update the weekly forecast as a table of temperatures with an weather icon on each day
	function updateWeatherForcast_UpdateWeeklyTable( json ) {
		var forecastTable = $('<table />').addClass('forecast-table');
		var opacity = 1;

		for (var i in json.daily.data) {
			var day       = json.daily.data[i];
			var iconClass = "wi wi-forecast-io-" + day.icon;
			var dt        = new Date( day.time * 1000 );

			var row = $('<tr />').css('opacity', opacity);
			row.append($('<td/>').addClass('day').html(moment.weekdaysShort(dt.getDay())));
			row.append($('<td/>').addClass('icon-small forecast-icon').addClass(iconClass));
			row.append($('<td/>').addClass('temp-max').html(roundVal(day.temperatureMax) + '&deg;'));
			row.append($('<td/>').addClass('temp-min').html(roundVal(day.temperatureMin) + '&deg;'));

			forecastTable.append(row);
			opacity -= 0.155;

			if( i > 5 )
				break;
		}

		$('.forecast').updateWithText(forecastTable, 1000);
	}

    // Draw the weekly forecast as a graph, similar to how Dark Sky does.  Each day is drawn as a bar
	// prepresenting the low and high temperature.
	function updateWeatherForcast_UpdateWeeklyGraph( dailyData ) {
		var marginL       = 85;
		var marginR       = 17;
		var marginT       =  2;
		var marginB       = 10;
		var lineMargin    =  8;
		var dayRightEdge  = 37;
		var barShift      =  8;
		var barTextMargin =  2;
		var barTextShift  = -2;
		var iconRightEdge = dayRightEdge + 27;
		var w = parseInt( $('.weekgraph').css('width') );
		var h = parseInt( $('.weekgraph').css('height') );
		var numDays       =  7;
		var lineHeight    = (h - marginT - marginB) / numDays;
		var opacityShift  =  0.12

		// We just want 7 days of data
		var filteredDays = dailyData.filter( function(d, i) { return (i < numDays); });

		weekGraphSVG = d3.select( "#weekGraphSVG" );
		if( weekGraphSVG.empty() ) {
			// Set up the SVG
			weekGraphSVG = d3.select(".weekgraph").append("svg")
							 .attr('width',  w)
							 .attr('height', h)
							 .attr('id',     "weekGraphSVG" );
		}

		// Set up the scale for the temps
		var tempXScale = d3.time.scale().domain([ d3.min( filteredDays, function(d) { return d.temperatureMin } ),
												  d3.max( filteredDays, function(d) { return d.temperatureMax } ) ])
										.range([ marginL, w - marginR ]);

		// Add the freezing and hot lines
		updateWeatherForcast_UpdateWeeklyGraph_HotColdLine( 32, "freezeLine", "\uf076",  0 )			// f076 is wi-snowflake-cold
		updateWeatherForcast_UpdateWeeklyGraph_HotColdLine( 80, "hotLine",    "\uf072", -4 )			// f076 is wi-hot

		// Draw labels down the left side
		// - Create the labels
		weekGraphSVG.selectAll( ".weekgraphDayText" )
					.data( filteredDays )
					.enter()
					.append( "text" )
					.attr(   "class", "weekgraphDayText" )
					.attr(   "x", dayRightEdge )
					.attr(   "text-anchor", "end")
					.style(  "fill",    function(d,i) { return shadeColor2( "#DDDDDD", -i * opacityShift ) } );

		// - Update all labels
		weekGraphSVG.selectAll( ".weekgraphDayText" )
					.text( function(d) {
						var dt = new Date( d.time * 1000 );
						return moment.weekdaysShort( dt.getDay() );
					})
					.attr( "y", function(d,i) {
						return i * lineHeight + lineHeight + marginT;
					});

		// Draw the weather icon to the right of each day
		// - Create the icon label
		weekGraphSVG.selectAll( ".weekgraphDayIcon" )
					.data( filteredDays )
					.enter()
					.append( "text" )
					.attr(   "class", "weekgraphDayIcon wi" )
					.attr(   "x", iconRightEdge )
					.attr(   "text-anchor", "end")
					.style(  "fill",    function(d,i) { return shadeColor2( "#DDDDDD", -i * opacityShift ) } );

		// - Update all icon labels
		//   We can't use the convenient CSS from weather-icons.css because Javascript can't read that, and :before isn't available
		//    without evaluating the element, so we just build our own table and look into that.
		var svgWeatherIcons = { "clear-day"           : "\uf00d",
								"clear-night"         : "\uf02e",
								"rain"                : "\uf019",
								"snow"                : "\uf01b",
								"sleet"               : "\uf0b5",
								"wind"                : "\uf050",
								"partly-cloudy-day"   : "\uf002",
								"fog"                 : "\uf014",
								"cloudy"              : "\uf013",
								"partly-cloudy-night" : "\uf031",
								"hail"                : "\uf015",
								"thunderstorm"        : "\uf01e",
								"tornado"             : "\uf056" }

		weekGraphSVG.selectAll( ".weekgraphDayIcon" )
					.text( function(d) {
						return svgWeatherIcons[ d.icon ];
					})
					.attr( "y", function(d,i) {
						return i * lineHeight + lineHeight + marginT;
					});

		// Draw rounded rectangles for each day
		// - Add one rect per day
		weekGraphSVG.selectAll( ".weekgraphDayTempBar" )
					.data( filteredDays )
					.enter()
					.append( "rect" )
					.attr(   "class", "weekgraphDayTempBar" )
					.attr(   "y",  function(d,i) { 
						return i * lineHeight + marginT + lineMargin + barShift;
					})
					.attr(   "height",   lineHeight - lineMargin*2  )
					.attr(   "ry",      (lineHeight - lineMargin)/4 )
					.attr(   "rx",      (lineHeight - lineMargin)/4 )
					.style(  "fill",    function(d,i) { return shadeColor2( "#DDDDDD", -i * opacityShift ) } );

		// - Update the left and right edges of the rect
		weekGraphSVG.selectAll( ".weekgraphDayTempBar" )
					.attr(   "x",     function(d,i) { 
						return tempXScale( d.temperatureMin );
					})
					.attr(   "width", function(d,i) { 
						return tempXScale( d.temperatureMax ) - tempXScale( d.temperatureMin );
					});


		// Draw temperature labels on the left and right side of each bar
		// - Create min labels
		weekGraphSVG.selectAll( ".weekgraphTempTextMin" )
					.data( filteredDays )
					.enter()
					.append( "text" )
					.attr(   "class", "weekgraphTempTextMin weekgraphTempText" )
					.attr(   "text-anchor", "end")
					.style(  "fill",    function(d,i) { return shadeColor2( "#DDDDDD", -i * opacityShift ) } );

		// - Update all min labels
		weekGraphSVG.selectAll( ".weekgraphTempTextMin" )
					.text( function(d) {
						return Math.round( d.temperatureMin ).toString() + "\u00B0";				// Unicode for &deg;
					})
					.attr( "x", function(d,i) {
						return tempXScale( d.temperatureMin ) - barTextMargin;
					})
					.attr( "y", function(d,i) {
						return i * lineHeight + lineHeight + marginT + barTextShift;
					});

		// - Create max labels
		weekGraphSVG.selectAll( ".weekgraphTempTextMax" )
					.data( filteredDays )
					.enter()
					.append( "text" )
					.attr(   "class", "weekgraphTempTextMax weekgraphTempText" )
					.attr(   "text-anchor", "begin")
					.style(  "fill",    function(d,i) { return shadeColor2( "#DDDDDD", -i * opacityShift ) } );

		// - Update all max labels
		weekGraphSVG.selectAll( ".weekgraphTempTextMax" )
					.text( function(d) {
						return Math.round( d.temperatureMax ).toString() + "\u00B0";				// Unicode for &deg;
					})
					.attr( "x", function(d,i) {
						return tempXScale( d.temperatureMax ) + barTextMargin;
					})
					.attr( "y", function(d,i) {
						return i * lineHeight + lineHeight + marginT + barTextShift;
					});

		function updateWeatherForcast_UpdateWeeklyGraph_HotColdLine( temp, className, icon, offset ) {	// Subfunction of updateWeatherForcast_UpdateWeeklyGraph() for access to tempXScale
			// Draw a line across the graph and place an icon at a given temperature
			var tempPoint = tempXScale( temp );

			// Add/update the line
			if( weekGraphSVG.select( ".tempGraphHotColdLine ." + className ).empty() ) {
				weekGraphSVG.append( "line").attr("class", "tempGraphHotColdLine " + className );
			}

			weekGraphSVG.select( ".tempGraphHotColdLine." + className).attr("x1", tempPoint ).attr("y1", marginT + lineMargin + barShift )
																	  .attr("x2", tempPoint ).attr("y2", h - marginB );

/*			// Add/update the icon -- these don't really work well here
			if( weekGraphSVG.select( ".tempGraphHotColdLine.lineIcon." + className ).empty() ) {
				weekGraphSVG.append( "text").attr("class", "tempGraphHotColdLine lineIcon wi " + className )
											.text( icon )
											.attr( "text-anchor", "middle" );
			}

			weekGraphSVG.select( ".tempGraphHotColdLine.lineIcon." + className ).attr("y", h - 14 + offset).attr("x", tempPoint);
*/
		}
	}
	
	// Draw the weather graph.  This is similar to the graph drawn in the Weather Underground iOS app,
	//  with the next 24 hours temperature curve overlaid over the chance of rain.  We take advantage
	//  of Dark Sky's confidence to draw a wider or thinner rain line.
	function updateWeatherForecast_DrawGraph( dailyData, hourlyData ) {
		// Create the SVG, if needed.  We just reuse the SVG instead of creating a new one each time,
		//  and animate the values within it
		var marginL  =  5;
		var marginR  =  5;
		var marginT  = 15;
		var marginB  =  5;
		var w = parseInt( $('.tempgraph').css('width') );
		var h = parseInt( $('.tempgraph').css('height') );

		tempGraphSVG = d3.select( "#tempGraphSVG" );
		if( tempGraphSVG.empty() ) {
			// Set up the SVG
			tempGraphSVG = d3.select(".tempgraph").append("svg")
							 .attr('width',  w)
							 .attr('height', h)
							 .attr('id',     "tempGraphSVG" );

			// Draw a line at the top of the graph so that we know where 100% chance of rain is
			tempGraphSVG.append( "line").attr("x1", marginL ).attr("y1", 0 )
										.attr("x2", w       ).attr("y2", 0 )
										.attr("class", "tempGraphTopEdgeLine");
		}

		// Filter the data down to just the requested number of hours
		var filteredHourlyData = hourlyData.filter( function(d, i) { return (i < tempGraphRangeOfHours-1); });

		// Set up the time scale
		var timeXScale = d3.time.scale().domain([ d3.min( filteredHourlyData, function(d) { return d.time } ),
												  d3.max( filteredHourlyData, function(d) { return d.time } ) ])
										.range([ marginL, w - marginR ]);


		// Draw each graph into the SVG
		updateWeatherForecast_DrawGraph_Sunlight( dailyData );
		updateWeatherForecast_DrawGraph_Rain( filteredHourlyData );
		updateWeatherForecast_DrawGraph_Temp( filteredHourlyData );
		updateWeatherForecast_DrawGraph_HourMarkers( filteredHourlyData );

		updateWeatherForecast_DrawGraph_Rain( filteredHourlyData );

		// - Graph Drawing Functions - 
		function updateWeatherForecast_DrawGraph_Sunlight( hourlyData ) {
			// Draw two boxes representing daylight over the next 48 hours.
			// The boxes span the time from sunrise to sunset
			// - Create the boxes, if needed
			if( tempGraphSVG.select( ".tempgraphDaylight" ).empty() ) {
				for( var i=0; i < 3; i++ ) {
					tempGraphSVG.append( "rect" )
								.attr( "class", "tempgraphDaylight" )
								.attr( "y",      1   )
								.attr( "height", h-1 );
				}
			}
			
			// - Update the x and width of the boxes
			tempGraphSVG.selectAll( ".tempgraphDaylight" )
						.attr( "x", function(d,i) {
							return Math.max( marginL, timeXScale( dailyData[i].sunriseTime ) );
						})
						.attr( "width", function(d,i) {
							var sunrise = timeXScale( dailyData[i].sunriseTime );

							if( marginL > sunrise )
								sunrise = (sunrise > 0) ? marginL - sunrise : marginL;

							var sunset = Math.max( marginL, timeXScale( dailyData[i].sunsetTime ) );
							return sunset - sunrise;
						})
						.attr( "opacity", function(d,i) {
							if( (timeXScale( dailyData[i].sunsetTime  ) <     marginL) ||
							    (timeXScale( dailyData[i].sunriseTime ) > w - marginR) )
								return 0.0;
							else
								return 1.0;
						});
		}

		function updateWeatherForecast_DrawGraph_Rain( hourlyData ) {
			// Draw a filled line graph for the rain as a propability from 0 to 100% over time
			//  Note that hourly data includes 48 hous worth, so we can it at 24.
		
			var rainYScale = d3.time.scale().domain([ 0.0, 1.0 ])
											.range([ h, 0 ]);

			// Draw a filled area under the line
			var rainAreaValue = d3.svg.area()
								  .x(  function(d){ return timeXScale( d.time ); })
								  .y0( h )
								  .y1( function(d){ return rainYScale( d.precipProbability ); });

			// - Create the path, if needed
			if( tempGraphSVG.select( ".tempgraphRainArea" ).empty() ) {
				tempGraphSVG.append( "path" )
							.attr( "class", "tempgraphRainArea" );
			}
			
			// - Update the elements in the path
			var s = tempGraphSVG.select( ".tempgraphRainArea" )
						s.datum( hourlyData )
						s.attr( "d", rainAreaValue );

			// Draw a line between the data points
			var rainLineValue = d3.svg.line()
								  .x( function(d){ return timeXScale( d.time ); })
								  .y( function(d){ return rainYScale( d.precipProbability ); });

			// - Create the path, if needed
			if( tempGraphSVG.select( ".tempgraphRainPath" ).empty() ) {
				tempGraphSVG.append( "path" )
							.attr( "class", "tempgraphRainPath" );
			}

			// - Update the elements in the path
			tempGraphSVG.select( ".tempgraphRainPath" )
						.attr( "d", rainLineValue( hourlyData ));
		}

		function updateWeatherForecast_DrawGraph_Temp( hourlyData ) {
			// Create dots for the temp, scaling to limit the min/max temps to the bounds of the view
			//  Note that hourly data includes 48 hous worth, not 24.  We only draw 12 dots to keep
			//  things from getting too cluttered, but graph 24.
			var tempYScale = d3.time.scale().domain([ d3.min( hourlyData, function(d) { return d.temperature } ),
													  d3.max( hourlyData, function(d) { return d.temperature } ) ])
											.range([ h-marginB, marginT ]);

			// Draw a line between the dots
			var tempLineValue = d3.svg.line()
								  .x( function(d){ return timeXScale( d.time ); })
								  .y( function(d){ return tempYScale( d.temperature ); });

			// - Create the path, if needed
			if( tempGraphSVG.select( ".tempgraphTempPath" ).empty() ) {
				tempGraphSVG.append( "path" )
							.attr( "class", "tempgraphTempPath" );
			}

			// - Update the elements in the path
			tempGraphSVG.select( ".tempgraphTempPath" )
						.attr( "d", tempLineValue( hourlyData ));

			// Draw the dots
			// - Add new dots
			tempGraphSVG.selectAll( ".tempgraphTempMark" )
						.data( hourlyData.filter( function(d, i) {
							return (i % 2) == 0;													// Every second element
						}) )
						.enter()
						.append( "circle" )
						.attr( "class", "tempgraphTempMark" )
						.attr( "r", 3 );

			// - Update all dots
			tempGraphSVG.selectAll( ".tempgraphTempMark" )
						.attr( "cx", function(d) {
							return timeXScale( d.time );
						})
						.attr( "cy", function(d) {
							return tempYScale( d.temperature );
						});


			// Draw text for the temperature
			// - Add new text
			tempGraphSVG.selectAll( ".tempgraphTempText" )
						.data( hourlyData.filter( function(d, i) {
							return (i % 4) == 0;													// Every 4th element
						}) )
						.enter()
						.append( "text" )
						.attr( "class", "tempgraphTempText" )
						.attr("text-anchor", "middle")

			// - Update all text
			tempGraphSVG.selectAll( ".tempgraphTempText" )
						.text( function(d) {
							return Math.round( d.temperature ).toString() + "\u00B0";				// Unicode for &deg;
						})
						.attr( "x", function(d) {
							return timeXScale( d.time ) + 2;
						})
						.attr( "y", function(d) {
							return tempYScale( d.temperature ) - 5;
						});

			// Add the freezing and hot lines
			updateWeatherForecast_DrawGraph_HotColdLine( 32, "freezeLine", "\uf076",  0 )			// f076 is wi-snowflake-cold
			updateWeatherForecast_DrawGraph_HotColdLine( 80, "hotLine",    "\uf072", -4 )			// f076 is wi-hot

			function updateWeatherForecast_DrawGraph_HotColdLine( temp, className, icon, offset ) {	// Subfunction of updateWeatherForecast_DrawGraph_Temp() for access to tempYScale
				// Draw a line across the graph and place an icon at a given temperature
				var tempPoint = tempYScale( temp );

				// Add/update the line
				if( tempGraphSVG.select( ".tempGraphHotColdLine ." + className ).empty() ) {
					tempGraphSVG.append( "line").attr("class", "tempGraphHotColdLine " + className );
				}

				tempGraphSVG.select( ".tempGraphHotColdLine." + className).attr("x1", marginL ).attr("y1", tempPoint )
																		  .attr("x2", w       ).attr("y2", tempPoint );

				// Add/update the icon
				if( tempGraphSVG.select( ".tempGraphHotColdLine.lineIcon." + className ).empty() ) {
					tempGraphSVG.append( "text").attr("class", "tempGraphHotColdLine lineIcon wi " + className )
												.text( icon );
				}

				tempGraphSVG.select( ".tempGraphHotColdLine.lineIcon." + className ).attr("x", w - 14 + offset).attr("y", tempPoint + 5);
			}
		}

		function updateWeatherForecast_DrawGraph_HourMarkers( hourlyData ) {
			// Draw markers at 6 AM, noon, 6 PM and midnight.  We draw n+1, since the first
			//  or last one may be off the end of the graph, and thus only n will be drawn.
			var ticks = (tempGraphRangeOfHours / 6 )+ 1;

			if( tempGraphSVG.selectAll( ".tempGraphHourMarker" ).empty() ) {
				for( i=0; i < ticks; i++ )
					tempGraphSVG.append("line").attr("class", "tempGraphHourMarker");
			}

			var startMoment = moment.unix( hourlyData[0].time );
			startMoment.add( 6 - (startMoment.hours() % 6), "hours" );

			var startUnix = startMoment.unix();
			var sixHours  = 6 * 60 * 60;
			tempGraphSVG.selectAll( ".tempGraphHourMarker")
						.attr("x1", function(d,i) { 
							return timeXScale( startUnix + i * sixHours );
						})
						.attr("x2", function(d,i) { 
							return timeXScale( startUnix + i * sixHours );
						})
						.attr("y1", 0 )
						.attr("y1", h );

			// Draw sideways text with the hour for each marker
			if( tempGraphSVG.selectAll( ".tempGraphHourMarkerText" ).empty() ) {
				for( i=0; i < ticks; i++ )
					tempGraphSVG.append("text").attr("class", "tempGraphHourMarkerText");
			}

			tempGraphSVG.selectAll( ".tempGraphHourMarkerText" )
						.text( function(d,i) {
							return moment.unix( startUnix  + i * sixHours).format( "h a" );
						})
						.attr( "transform", function(d,i) {
							return "translate(" + timeXScale( startUnix + i * sixHours ) + ",2)" +		// Tanslate...
								   "rotate(90)" +														// ...then rotate...
								   "translate(0,-2)";													// ...then translate again.
						});

		}
	}

	// MBTA Service Alerts.  We get 10000 calls a day, so we update every 5 minutes.
	//  As with the weather, we again use the proxy to get the page.  MBTA does support
	//  JSONP, but for whatever reason I just couldn't get that to work.

	// See https://groups.google.com/forum/#!topic/massdotdevelopers/mco5gtgPEP4 for where this
	//  list of effects came from.  The key is the effect_name, and the value is the class defined
	//  in mbta-icons.css
	var mbtaIconsKey = {
		'Accessibility'     :'mbtai-key_accessibility',
		'Amber Alert'       :'mbtai-key_other',
		'Cancellation'      :'mbtai-key_canceltrip',
		'Delay'             :'mbtai-key_delay',
		'Detour'            :'mbtai-key_detour',
		'Dock Closure'      :'mbtai-key_closure',
		'Dock Issue'        :'mbtai-key_other',
		'Extra Service'     :'mbtai-key_extraservice',
		'Policy Change'     :'mbtai-key_other',
		'Schedule Change'   :'mbtai-key_schedchange',
		'Service Change'    :'mbtai-key_other',
		'Shuttle'           :'mbtai-key_shuttlebus',
		'Snow Route'        :'mbtai-key_snowroute',
		'Station Closure'   :'mbtai-key_closure',
		'Station Issue'     :'mbtai-key_other',
		'Stop Closure'      :'mbtai-key_closure',
		'Stop Move'         :'mbtai-key_other',
		'Suspension'        :'mbtai-key_noservice',
		'Track Change'      :'mbtai-key_other',
	}

	var mbtaIconsRed = {
		'Accessibility'     :'mbtai-red_accessibility',
		'Amber Alert'       :'mbtai-red_other',
		'Cancellation'      :'mbtai-red_canceltrip',
		'Delay'             :'mbtai-red_delay',
		'Detour'            :'mbtai-red_detour',
		'Dock Closure'      :'mbtai-red_closure',
		'Dock Issue'        :'mbtai-red_other',
		'Extra Service'     :'mbtai-red_extraservice',
		'Policy Change'     :'mbtai-red_other',
		'Schedule Change'   :'mbtai-red_schedchange',
		'Service Change'    :'mbtai-red_other',
		'Shuttle'           :'mbtai-red_shuttlebus',
		'Snow Route'        :'mbtai-red_snowroute',
		'Station Closure'   :'mbtai-red_closure',
		'Station Issue'     :'mbtai-red_other',
		'Stop Closure'      :'mbtai-red_closure',
		'Stop Move'         :'mbtai-red_other',
		'Suspension'        :'mbtai-red_noservice',
		'Track Change'      :'mbtai-red_other',
	}

	// Once all the alerts have been updated, we refresh the div
	function updateMBTAServiceAlerts_UpadteDiv()
	{
		var nonOngoingCount = 0;
		var alerts          = '';					// Ensures that the div is cleared if there are no actual events

		// Count how many alerts we're actually showing
		for( var i in mbtaAlerts ) {
			if( mbtaAlerts[i] != "" )
				nonOngoingCount++;
		}

		if( nonOngoingCount > 0 ) {
			// We have at least one alert to show
			var	step = 0;

			var alertCountText = (nonOngoingCount == 1) ? 'alert' : 'alerts';
			alerts = '<p class="xxsmall" style="text-align:center">' + nonOngoingCount + ' MBTA service ' + alertCountText + '</p>';

			for( var i in mbtaAlerts ) {
				if( mbtaAlerts[i] == "" )			// These are Ongoing or Ongoing-Upcoming alerts that we're skipping
					continue;

				if( step > 0 )
					alerts += '<br>';

				alerts += mbtaAlerts[i];
				step++;
			}
		}

		// Update the div itself
		$('.mbta').updateWithText(alerts, 1000);
		$('.luMBTA').updateWithText('mbta (' + nonOngoingCount + '/'
		                                     + mbtaAlerts.length + ' ' + ((mbtaAlerts.length == 1) ? 'alert' : 'alerts') + '): '
		                                     + moment().format('h:mm a ddd MMM D YYYY'), 1000);

		// Rearm the timer for 5 minutes
		setTimeout( updateMBTAServiceAlerts, 300000);
	}

	// Get the information for a single alert.  We wrap this in a function so that we can fake
	//  passing variables (the array index, alert ID and default text) to our JSON callback.
	function updateMBTAServiceAlerts_UpadteOne( index, alertID, defaultText )
	{
		var alerticon, alertTime, alertSeverity, alertText, alertDir, isOngoing = false;

		var alertURL = 'proxy.php?url=http://realtime.mbta.com/developer/api/v2/ALERTBYID%3Fapi_key=' + mbtaAPIKey + '%26id=' + alertID + '%26format=json';
		$.getJSON(alertURL, function(jsonAlert, textStatus) {
			// Success; use the information provided, but skip ongoing alerts

			if( (jsonAlert.alert_lifecycle == "Ongoing") || (jsonAlert.alert_lifecycle == "Ongoing-Upcoming") ) {
				// Ongoing alert; just mark it so we know to skip it
				isOngoing = true;

			} else {
				// All other alerts; get information for display
				alertIcon     = jsonAlert.severity == "Minor" ? mbtaIconsKey[ jsonAlert.effect_name ] : mbtaIconsRed[ jsonAlert.effect_name ];
				alertTime     = moment.unix( jsonAlert.effect_periods[0].effect_start ).format( "MMM D" );
				alertSeverity = jsonAlert.severity;
				alertText     = jsonAlert.header_text;

				// Build a list of directions that the alert affects (should be "inbound" and "outbound" for the commuter rail, for example)
				var dirs = [];
				for (var i in jsonAlert.affected_services.services) {
					var service = jsonAlert.affected_services.services[i];
					if( typeof(service.direction_name) != 'undefined' ) {
						if( $.inArray(service.direction_name, dirs) == -1 )
							dirs.push( service.direction_name );
					}
				}

				// Compose the alertDir string
				alertDir = "";
				for (var i in dirs) {
					if( i == 0)
						alertDir += ' &mdash; ';
					else
						alertDir += '/';

					alertDir += dirs[i];
				}
			}

		}).fail (function( jqxhr, textStatus, error ) {
			// Give up and use the header text and default icon
			alertIcon     = 'mbtai-key_other';
			alertText     = defaultText;
			alertTime     = '';
			alertSeverity = '';
			alertDir      = "";

		}).always (function() {
			// Either way, we're done; build our HTML
			if( isOngoing ) {
				alert = "";
			} else {
				var alert = '<div class="mbtaEntry ' + alertIcon + '">'
				alert    += '<strong>' + alertTime + ' &mdash; ' + alertSeverity + alertDir + '</strong><br>';
				alert    += alertText;
				alert    += '</div>'

				// Make sure this exact string isn't already in the array, since that can happen sometimes for some reaosn
				if( $.inArray(alert, mbtaAlerts) == -1 ) {
					// Now we can add it to the array
					mbtaAlerts[ index ] = alert;
				}
			}

			// If no more alerts are pending, update the div
			if( --mbtaAlertsPending == 0 )
				updateMBTAServiceAlerts_UpadteDiv();
		});
	}

	// Outer function that updaets the alert list, calling the above functions to get information
	//  about individual alerts
	function updateMBTAServiceAlerts() {
		var url = 'proxy.php?url=http://realtime.mbta.com/developer/api/v2/ALERTHEADERSBYROUTE%3Fapi_key=' + mbtaAPIKey + '%26route=' + mbtaRoute + '%26format=json';
		$.getJSON(url, function(json, textStatus) {
			// Reset our global array of alerts
			mbtaAlerts.length = 0;
			mbtaAlerts.length = json.alert_headers.length;
			mbtaAlertsPending = mbtaAlerts.length;

			if( mbtaAlerts.length == 0 ) {
				// No alerts; just clear the block and restart the timer
				$('.mbta').updateWithText('', 1000);
				setTimeout( updateMBTAServiceAlerts, 300000);		// 5 minutes

			} else {
				// Loop through the alert list and request each alert's information as separate AJAX calls
				for (var i in json.alert_headers)
					updateMBTAServiceAlerts_UpadteOne( i, json.alert_headers[i].alert_id, json.alert_headers[i].header_text );

				// When we have alerts pending, we don't restart the timer here; that is done after the last alert
				//  is udpated from updateMBTAServiceAlerts_UpadteDiv() via updateMBTAServiceAlerts_UpadteOne()
			}

		}).fail (function( jqxhr, textStatus, error ) {
			// JSON call failed; re-arm the timer for 2 minutes
			setTimeout( updateMBTAServiceAlerts, 120000);
		});
	};
	
	// Call the function.  We can't call it at the end of the declaration itself like we do elsewhere
	//  because then it's not in the right scope for for the other updateMBTAServiceAlerts_UpadteDiv()
	//  to pass it to setTimeout().
	updateMBTAServiceAlerts();


	// RSS Feed Display.  Updates every 5 minutes.
	(function fetchNews() {
		// Yahoow Query Language implementation borrowed from jquery.feedToJSON.js by dboz@airshp.com
		var yqlURL      = 'http://query.yahooapis.com/v1/public/yql';                            // yql itself
		var yqlQS       = '?format=json&callback=?&q=select%20*%20from%20rss%20where%20url%3D';  // yql query string
		var cachebuster = new Date().getTime();   							                     // yql caches feeds, so we change the feed url each time

		var url = yqlURL + yqlQS + "'" + encodeURIComponent(feed) + "'" + "&_nocache=" + cachebuster;
		$.getJSON( url, function(jsonRSS, textStatus) {
			// Success; cache the feed titles
			if( jsonRSS.query.results == null ) {
				// Error; re-arm the timer for 2 minutes
				setTimeout( fetchNews, 120000 );

			} else {
				// Success; get the list of articles
				news.length = 0;

				for (var i in jsonRSS.query.results.item)
					news.push( jsonRSS.query.results.item[i].title );

				$('.luRSS').updateWithText('rss (' + news.length + ' articles): ' + moment().format('h:mm a ddd MMM D YYYY'), 1000);

				// Update in 5 minutes
				setTimeout( fetchNews, 300000 );
			}
			
		}).fail (function( jqxhr, textStatus, error ) {
			// Error; re-arm the timer for 2 minutes
			setTimeout( fetchNews, 120000 );
		});
	})();

	(function showNews() {
		var newsItem   = news[newsIndex];
		var newsLength = (newsItem === undefined) ? 0 : newsItem.length;

		$('.news').updateWithText(newsItem,2000);

		newsIndex--;
		if (newsIndex < 0)
			newsIndex = news.length - 1;

		setTimeout( showNews, 5500 + (newsLength * 20));			// Length of the headline modifies how long it stays on screen
	})();

});
