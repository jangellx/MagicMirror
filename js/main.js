jQuery.fn.updateWithTextForce = function(text, speed, force)
{
	var dummy = $('<div/>').html(text);

	if (force || ($(this).html() != dummy.html()))
	{
		$(this).fadeOut(speed/2, function() {
			$(this).html(text);
			$(this).fadeIn(speed/2, function() {
				//done
			});
		});
	}
}

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

// from http://stackoverflow.com/questions/5560248/programmatically-lighten-or-darken-a-hex-color-or-rgb-and-blend-colors
function shadeColor2(color, percent) {   
    var f=parseInt(color.slice(1),16),t=percent<0?0:255,p=percent<0?percent*-1:percent,R=f>>16,G=f>>8&0x00FF,B=f&0x0000FF;
    return "#"+(0x1000000+(Math.round((t-R)*p)+R)*0x10000+(Math.round((t-G)*p)+G)*0x100+(Math.round((t-B)*p)+B)).toString(16).slice(1);
}

// Globals accessed from other modules
var curWeatherIcon = "(none)";					// The code for the current weather icon as a string.  Used by compliments and background images
var dailyAverageTemp = 0;						// The average temperature over the next 12 hours.  Used by compliments.

// Test for missing feedURLs, but a valid feeds
if( typeof feedURLs == 'undefined') {
	if( typeof feed == 'undefined' )
		var feedURLs;
	else
		var feedURLs = {"News" : feed};
}

// Test for other missing variables
if( typeof clock12Hour == 'undefined')
	var clock12Hour = true;

if( typeof dayBeforeMonth == 'undefined')
	var dayBeforeMonth = false;

// Test for missing mixCompliments variable, setting it to true if missing
if( typeof mixCompliments == 'undefined') {
	var mixCompliments = true;
}

jQuery(document).ready(function($) {

	var news = [];								// Dictionary of arrays of news stories.  Outer arry indices match the feedURLs[] dictionary indices
	var newsFeedIndex  = 0;						// Index of the feed we're showing stories from in the news[] arary
	var newsStoryIndex = 0;						// Index of the story we're showing in news[ newsFeedIndex ][]

	// Add empty arrays for each news feed, which we will later populate from JSON data
	for( var key in feedURLs ) {
		news.push( new Array(0) );
	}

	var eventList = [];

	var lastCompliment;
	var compliment;

	var holidayThisDay      = -1				// Used to decide if this is the same day as the last time we checked.  -1 means we havne't checked yet.

	var tempGraphSVG;							// SVG used to draw the temp/rain graph into
	var weekGraphSVG;							// SVG used to draw the weekly forecast graph into

	// Set the background image tint amount
	$('.backgroundTint').css('opacity', function () {
		return weatherBGTint;
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


	function checkVersion()
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
	}
//	checkVersion();

	var timeMsg   = "";										// Declared outside of the function so that it persists
	var timeColor = $('.time .warning').css('color');		// Same here

	(function updateTime()
	{
		moment.locale(lang, {						// Language localization
			calendar : null
		});

		var now        = moment();
        var date       = now.format( dayBeforeMonth ? 'dddd, D MMMM, YYYY' : 'dddd, MMMM Do, YYYY');
		var foundMatch = false;

		// See if the current time matches a warning time
		if( now.seconds() < 2 ) {																	// We only do this for the first 2 seconds of the minute, since it's a waste of time otherwise
			if( typeof warningTimes != 'undefined' ) {
				for( var i=0; i < warningTimes.length; i++ ) {
					// Check if the alert is valid for this day
					if( typeof warningTimes[i].days != 'undefined' ) {
						if( warningTimes[i].days[ now.day() ] == false )
							continue;
					}

					// Make sure the current time lies between the start and end times
					var startTime = moment( warningTimes[i].startTime, "H:mm" );
					if( !startTime.isValid() )
						continue;

					var endTime   = moment( warningTimes[i].endTime,   "H:mm" );
					if( !endTime.isValid() )
						continue;

					if( endTime < startTime )
						endTime.add( 1, "days" );

					if( (now.valueOf() > startTime.valueOf()) && (now.valueOf() < endTime.valueOf()) ) {
						timeColor  = warningTimes[i].color;
						timeMsg    = warningTimes[i].message;
						foundMatch = true;
					}
				}
			}

			if( !foundMatch ) {
				timeMsg   = "";
				timeColor = $('.time .warning').css('color');
			}
		}

		// Figure out 12 vs 24 hour time
		var hoursMins = now.format( clock12Hour ? 'h:mm' : 'H:mm' );
		var ampm      = clock12Hour ? now.format('a') : '&nbsp;';									// &nbsp; keeps the cell from becoming 0 height

		// Draw the current time table
		$('.date').html(date);
		$('.time').html(																			// Ugly table here, but it gets the job done
		    '<table>' +
			    '<tr>' +
				    '<td class="time" style="color:' + timeColor + '" ' +								// Apply the color
					    'rowspan=4 cellpadding=0>' + hoursMins +'</td>' +							// Time cell is four rows tall
					'<td> </td>' + 																	// Empty cell next to it
				'</tr><tr>' +
					'<td class="sec">'   + now.format('ss') + '</td>' +								// Seconds cell is pushed down a bit to line up with the top of the time
				'<tr>' +
					'<td class="am_pm">' + ampm  + '</td>' +										// AM/PM cell is pushed up a bit to line up with the bottom of the time
				'</tr><tr><td></td>' +
				'</tr>' +
			'</table>');

		if( timeMsg == "" )
			var timeWarning = "";
		else
			var timeWarning = '<div style="color:' + timeColor + '">&bull; ' + timeMsg + '</div>';
		$('.timeWarning').updateWithText( timeWarning, 1000 );

		setTimeout(function() {
			updateTime();
		}, 1000);
	})();

	(function updateCalendarData()
	{
		new ical_parser("calendar.php", function(cal){
        	events = cal.getEvents();
        	eventList = [];

			// Clear any previous calendar formatting customizations
			moment.locale(lang, {						// Language localization
				calendar : null
			});

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

	// Holiday data comes from holidayapi.com.  We report the next holiday(s) coming up after today,
	//  and if today is a holiday.
	(function updateHolidays()
	{
		// The timer updates once an hour, but we only need to refresh once a day.  We check to
		//  see if the last time we updated on a different day; if not, we just rearm the timer.
//		var today      = moment( "2015-12-31 12:20", "YYYY-MM-DD HH:MM" )	/// debugging stuff
//		holidayThisDay = today.add( 1, "days" )
//		if( holidayThisDay == today.day() ) {

		if( holidayThisDay == moment().day() ) {
			setTimeout(function() {
				updateHolidays();
			}, 3500000);

			return;
		}

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
					$('.luHolidays').updateWithText('holidays: ' + moment().format('h:mm a ddd MMM D YYYY'), 1000);

					// Restart the timer in a bit under an hour.  We must do this here as well as below, as this
					//  is an async sub-block
					holidayThisDay = moment().day();
					setTimeout(function() {
						updateHolidays();
					}, 3500000);

				}).fail (function( jqxhr, textStatus, error ) {
					// Failed; restart the timer for two minutes
					setTimeout(function() {
						updateHolidays();
					}, 120000);
				});
				
			} else{
				// We're done
				$('.holidays').updateWithText( holidayText, 1000 );
				$('.luHolidays').updateWithText('holidays: ' + moment().format('h:mm a ddd MMM D YYYY'), 1000);

				// Restart the timer in a bit under an hour
				holidayThisDay = moment().day();
				setTimeout(function() {
					updateHolidays();
				}, 3500000);
			}

			// Nested function to add holidays from the list
			function addHolidaysFromList( holidays, doDateTest ) {
				var	prevDate = moment();
				prevDate.add( -1, "days" ); 			// To make sure that we get today as well as future dates

				// Customize the locale for holidays
				moment.locale(lang, {						// Language localization
					calendar : {							// Calendar localization used for upcoming holidays.  Should really be localized too...
						lastDay : '[Yesterday was] ' ,
						sameDay : '[Today is] ',
						nextDay : '[Tomorrow is] ',
						thisWeek : 'dddd [is] ',
						lastWeek : '[Last] dddd [was] ',
						nextWeek : 'dddd [is] ',
						sameElse : (dayBeforeMonth ? 'DD/MM'  : 'MM/DD') + ' [is] '
					}
				});

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
						if( date.diff( now, 'days' ) == 0  )
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
		while (compliment == lastCompliment) {
			// Check for current time  
			var compliments;
			var wtCompliments = [];
			var date = new Date();
			var hour = date.getHours();

			// Set compliments to use based on the current time
			if (hour >=  3 && hour < 12) compliments = morning;
			if (hour >= 12 && hour < 17) compliments = afternoon;
			if (hour >= 17 || hour <  3) compliments = evening;

			// Look for compliments matching the current weather
			if( curWeatherIcon in weatherCompliments )
				wtCompliments = wtCompliments.concat( weatherCompliments[ curWeatherIcon ] );

			// Look for compliments associated with the average temperature for the day
			for( var i=0; i < temperatureCompliments.length; i++ ) {
				if( temperatureCompliments[i].low < dailyAverageTemp ) {
					wtCompliments = wtCompliments.concat( temperatureCompliments[i].messages );
					break;
				}
			}

			if( mixCompliments ) {
				// Mixed; add the arrays
				compliments = compliments.concat( wtCompliments );
			} else {
				// Not mixed; choose a weather compliments
				wtCompliment = wtCompliments[ Math.floor(Math.random()*wtCompliments.length) ];
			}

			// Choose a normal (or mixed) compliment
			compliment = compliments[ Math.floor(Math.random()*compliments.length) ];
		}

		$('.compliment').updateWithText(compliment, 4000);
		if( !mixCompliments )
			$('.weatherCompliment').updateWithText(wtCompliment, 4000);

		lastCompliment = compliment;

		setTimeout(function() {
			updateCompliment(true);
		}, 30000);

	})();

	// RSS Feed Display.  Updates every 5 minutes.
	function fetchNews() {
		// Yahoow Query Language implementation borrowed from jquery.feedToJSON.js by dboz@airshp.com
		var yqlURL      = 'http://query.yahooapis.com/v1/public/yql';                            // yql itself
		var yqlQS       = '?format=json&callback=?&q=select%20*%20from%20rss%20where%20url%3D';  // yql query string
		var cachebuster = new Date().getTime();   							                     // yql caches feeds, so we change the feed url each time
		var index       = 0;

		// Loop through the feed URLs
		for( var key in feedURLs ) {
			var url = yqlURL + yqlQS + "'" + encodeURIComponent( feedURLs[key] ) + "'" + "&_nocache=" + cachebuster;

			fetchNewsForURL( index++, url );
		}

		// Update again in 5 minutes
		setTimeout( fetchNews, 300000 );
	};

	fetchNews();

	// Actually get a feed.  The function exists just so we can fake passing
	//  extra arguments to getJSON().
	function fetchNewsForURL( index, url )
	{
		$.getJSON( url, function(jsonRSS, textStatus) {
			if( jsonRSS.query.results != null ) {
				// Success; get the list of articles
				var stories = [];
				for (var i in jsonRSS.query.results.item)
					stories.push( jsonRSS.query.results.item[i].title );

				news[ index ] = stories;

				// Update the "last updated" information with a count of all stories from all feeds
				var newsCountTotal = 0;
				for( var i=0; i < news.length; i++ ) {
					newsCountTotal += news[i].length;
				}

				$('.luRSS').updateWithText('rss (' + newsCountTotal + ' articles/' + news.length + ' feeds): ' + moment().format('h:mm a ddd MMM D YYYY'), 1000);
			}
		});
	}

	(function showNews() {
		var initialFeed = newsFeedIndex;

		if( news.length == 0 ) {
			// No news; nothing to do
			return;
		}

		// Find the next story
		for( var i=0; i < news.length+1; i++ ) {
			var newsFeed = news[ newsFeedIndex ];

			// Fix undefined entries
			if( newsFeed === undefined )
				continue;

			// Skip empty feeds
			if( newsFeed.length == 0 ) {
				if( ++newsFeedIndex == news.length )
					newsFeedIndex = 0;

				newsStoryIndex = 0;
				continue;
			}

			// Check for the last story in the feed
			if( newsFeed.length == newsStoryIndex ) {
				newsStoryIndex = 0;

				if( ++newsFeedIndex == news.length ) {
					newsFeedIndex = 0;
					continue;
				}
			}
		}

		if( news[ newsFeedIndex ].length == 0 ) {
			// No stories 
			setTimeout( showNews, 1000 );
			return;
		}

		// Get the title text
		var i = 0;
		for( var key in feedURLs ) {
			if( i == newsFeedIndex )
				break;

			i++;
		}

		$('.newsTitle').updateWithTextForce(key + '<hr width="20%" style="opacity:0.3">', 2000, true);

		// Draw feed/story dots
		var newsDots = ""
		for( i=0; i < news.length; i++ ) {
			if( i == newsFeedIndex )
				newsDots += '<span class="dimmed">&bull;</span>'
			else
				newsDots += '<span class="xxdimmed">&bull;</span>'
		}
		newsDots += "  ";

		for( i=0; i < news[ newsFeedIndex ].length; i++ ) {
			if( i == newsStoryIndex )
				newsDots += '<span class="dimmed">&bull;</span>'
			else
				newsDots += '<span class="xxdimmed">&bull;</span>'
		}

		$('.newsDots').updateWithTextForce(newsDots, 2000, true);

		// Get the story text
		var newsFeed = news[ newsFeedIndex ];
		newsStory = newsFeed[ newsStoryIndex ];

		$('.news').updateWithText(newsStory,2000);

		// Set up for the next story
		newsStoryIndex++;
		setTimeout( showNews, 5500 + (newsStory.length * 20) );			// Length of the headline modifies how long it stays on screen
	})();

});
