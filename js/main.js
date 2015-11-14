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

jQuery(document).ready(function($) {

	var news = [];
	var newsIndex = 0;

	var eventList = [];

	var lastCompliment;
	var compliment;

	var mbtaAlerts          = [];				// List of alerts as HTML, one for each alert we have a JSON request for
	var mbtaAlertsPending   = 0;				// Number of JSON requests for alerts that we're waiting on.  Once this gets to 0, we update the div with the contents of the mbtaAlerts

	var holidayThisDay      = [-1, -1]		// Used to decide if this is the same day as the last time we checked.  -1 means we havne't checked yet.

    moment.lang(lang);

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
	function updateHolidays( whichHoliday )
	{
		var asUpcoming = (whichHoliday == 'holidaytoday') ? 0 : 1;

		// The timer updates a once an hour, but we only need to refresh once a day.  We check to
		//  see if the last time we updated on a different day; if not, we just rearm the timer.
		if( holidayThisDay[ asUpcoming ] == moment().day() ) {
			setTimeout(function() {
				updateHolidays();
			}, 3500000);

			return;
		}

		holidayThisDay[ asUpcoming ] = moment().day();

		var now = moment();
		var holidayURL = 'http://holidayapi.com/v1/holidays?country=' + holidayCountry + '&year=' + now.format('YYYY') + '&month=' + now.format('M') + '&day=' + now.format('D');
		if( asUpcoming )
			holidayURL += "&upcoming";

		$.getJSON(holidayURL, function(jsonDate, textStatus) {
			// Success; update the holiday string, even if it's just empty
			var holidayText = "";
			if( (jsonDate.status == 200) && (jsonDate.holidays.length > 0) ) {
				if( asUpcoming ) {
					var futureDate = moment( jsonDate.holidays[0].date, 'YYYY-MM-DD' );
					holidayText = '&bull; ' + futureDate.format( "dddd, MMMM Do" ) + ' is ' + jsonDate.holidays[0].name;
				} else {
					holidayText = '&bull; Today is ' + jsonDate.holidays[0].name + '!';
				}
			}

			$('.' + whichHoliday ).updateWithText( holidayText, 1000 );

			// Restart the timer in an hour
			setTimeout(function() {
				updateHolidays( whichHoliday );
			}, 3500000);

		}).fail (function( jqxhr, textStatus, error ) {
			// Failed; restart the timer for two minutes
			setTimeout(function() {
				updateHolidays( whichHoliday );
			}, 120000);

		});
	};

	updateHolidays( 'holidaytoday' );
	updateHolidays( 'holidaynext'  );

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
	//  frequent enough.  This updates the current conditions, forecast and
	//  summary in the same places so that we can use just one JSON call.
	(function updateWeatherForecast()
	{
		var iconTable = {
			'clear-day'            :'wi-day-sunny',
			'cloudy'               :'wi-day-cloudy',
			'partly-cloudy-day'    :'wi-day-cloudy',
			'wind'                 :'wi-windy',
			'rain'                 :'wi-rain',
			'thunderstorm'         :'wi-thunderstorm',
			'snow'                 :'wi-snow',
			'sleet'                :'wi-snow',
			'fog'                  :'wi-fog',
			'clear-night'          :'wi-night-clear',
			'partly-cloudy-night'  :'wi-night-cloudy',
			'hail'                 :'wi-hail',
		}

		$.getJSON('proxy.php?url=https://api.forecast.io/forecast/' + darkSkyAPIKey + '/' + darkSkyLat + ',' + darkSkyLon, function(json, textStatus) {
			// Update the current weather
			var current    = json.currently;
			var temp       = roundVal(current.temperature);
			var wind       = roundVal(current.wind);

			var iconClass  = iconTable[current.icon];
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

			// Update the forecast
			var forecastTable = $('<table />').addClass('forecast-table');
			var opacity = 1;

			for (var i in json.daily.data) {
				var day       = json.daily.data[i];
			    var iconClass = iconTable[day.icon];
				var dt        = new Date( day.time * 1000 );

				var row = $('<tr />').css('opacity', opacity);
				row.append($('<td/>').addClass('day').html(moment.weekdaysShort(dt.getDay())));
				row.append($('<td/>').addClass('icon-small').addClass(iconClass));
				row.append($('<td/>').addClass('temp-max').html(roundVal(day.temperatureMax) + '&deg;'));
				row.append($('<td/>').addClass('temp-min').html(roundVal(day.temperatureMin) + '&deg;'));

				forecastTable.append(row);
				opacity -= 0.155;

				if( i > 5 )
					break;
			}

			$('.forecast').updateWithText(forecastTable, 1000);

			// Update the summary text
			$('.summary').updateWithText(json.hourly.summary + ' ' + json.daily.summary /*+ '<br><br>' +
			                             '<span class="xxxsmall xxdimmed">last updated: ' + moment().format('h:mm a ddd MMM D YYYY') + '</span>'*/, 1000);

			$('.luWeather').updateWithText('weather: ' + moment().format('h:mm a ddd MMM D YYYY'), 1000);

			// Update in 15 minutes
			setTimeout(updateWeatherForecast, 900000);

		}).fail( function() {
			// JSON call failed; re-arm the timer for 5 minutes
			setTimeout(updateWeatherForecast, 300000);
		});
	})();


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

			alerts = '<p class="xxsmall" style="text-align:center">' + nonOngoingCount + ' MBTA service alerts</p>';

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
		$('.luMBTA').updateWithText('mbta (' + nonOngoingCount + '/' + mbtaAlerts.length + ' alerts): ' + moment().format('h:mm a ddd MMM D YYYY'), 1000);

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

				// Add it to the array
				mbtaAlerts[ index ] = alert;
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
