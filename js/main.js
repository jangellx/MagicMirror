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
		moment.updateLocale(lang, {						// Language localization
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
				    '<td class="time" style="color:' + timeColor + '" ' +							// Apply the color
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
			moment.updateLocale(lang, {						// Language localization
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
                    
					// Get events up to one year in the future
                    var dates = rule.between(new Date(), moment().add(1, "years").toDate(), true, function (date, i){return i < 10});
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
		
		// Figure out the maximum nmumber of entries that we're going to display
		max = eventList.length;
		if( typeof calenderMaxEvents != 'undefined') {
			max = Math.min( max, calenderMaxEvents );
		} else {
			max = Math.min( max, 10 );
		}
		
		// Display the events
		for (var i=0; i < max; i++) {
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
			if( typeof temperatureCompliments != 'undefined') {
				for( var i=0; i < temperatureCompliments.length; i++ ) {
					if( temperatureCompliments[i].low < dailyAverageTemp ) {
						wtCompliments = wtCompliments.concat( temperatureCompliments[i].messages );
						break;
					}
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
	//  Uses JQuery's() built-in XML support, as described here:
	//   https://stackoverflow.com/questions/10943544/how-to-parse-an-rss-feed-using-javascript
	function fetchNews() {
		// Yahoo Query Language implementation borrowed from jquery.feedToJSON.js by dboz@airshp.com
		var cachebuster = new Date().getTime();   							                     // yql caches feeds, so we change the feed url each time
		var index       = 0;

		// Loop through the feed URLs
		for( var key in feedURLs ) {
			var url = feedURLs[key] + "&_nocache=" + cachebuster;
			fetchNewsForURL( index++, "proxy.php?url=" + encodeURI( url ) );
		}

		// Update again in 5 minutes
		setTimeout( fetchNews, 300000 );
	};

	fetchNews();

	// Actually get a feed.  The function exists just so we can fake passing
	//  extra arguments to get().
	// We currently support "item" and "entry" lines, although only "item"
	//  has been tested at this time
	function fetchNewsForURL( index, url )
	{
		$.get( url, function(rssData, textStatus) {
			// Success; find the articles in the feed
			var oldestDate = moment().subtract( feedMaxAge.days, "days" ).subtract( feedMaxAge.hours, "hours" );
			var stories = [];

			// Look for "item" entries
			$(rssData).find("item").each( function() {
				addStoryForFeed( stories, oldestDate, $(this) );
			});

			// Look for "entry" entries
			$(rssData).find("entry").each( function() {
				addStoryForFeed( stories, oldestDate, $(this) );
			});

			// Swap to the new story list in the global variable
			news[ index ] = stories;

			// Update the "last updated" information with a count of all stories from all feeds
			var newsCountTotal = 0;
			for( var i=0; i < news.length; i++ ) {
				newsCountTotal += news[i].length;
			}

			$('.luRSS').updateWithText('rss (' + newsCountTotal + ' articles/' + news.length + ' feeds): ' + moment().format('h:mm a ddd MMM D YYYY'), 1000);
		});
	}

	// Add a single story to the list for the feed.
	function addStoryForFeed( stories, oldestDate, story ) {
		// Skip articles older than a certain time
		var pubDate = moment( story.find("pubDate").text(), "ddd, DD MMM YYYY HH:mm:ss Z" );
		if( oldestDate.diff( pubDate ) < 0 ) {
			stories.push( story.find("title").text() );
		}

//		console.log( "title:" + story.find("title").text() );
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
			if( newsStoryIndex >= newsFeed.length  ) {		// newsStoryIndex can become greater than the array if the story count updated behind the scenes
				newsStoryIndex = 0;

				if( ++newsFeedIndex >= news.length ) {
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

		var nextTimeout = 1000;							// Used in error cases where newsStory is undefined for some reason
		if( typeof newsStory != 'undefined') {
			$('.news').updateWithText( newsStory, 2000 );

			nextTimeout = 5500 + (newsStory.length * 20);
		}

		// Set up for the next story
		newsStoryIndex++;
		setTimeout( showNews, nextTimeout  );			// Length of the headline modifies how long it stays on screen
	})();

});
