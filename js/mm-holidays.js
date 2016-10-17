//
// mm-holidays.js:  Holiday database.  Basically I don't want to pay an API for holidays, so I've
//  set up my own system.
//

//
// Holidays are stored by country in a dictionary, which in turn contains an array of holidays
//  in roughly chronological order.  Each holiday has a name, and then one of four formats:
// - date:    A specific date that the holiday is on every year.  Christmas is always 12/25.
//            Date format is assumed to be MM/DD.
// - pattern: A simply pattern to compute the holiday.  Thanksgiving is always the fourth
//            Thursday in Novemmber.
// - func:    Function to compute the date.  Easter is the Sunday following the full moon that
//            follows the norther spring equinox.  Yeah.  The fucntion takes a year in the form
//            of YY (ie: 16) and returns the "MM/DD" string
// - table:   A dictionary of years (YY, like 16) containing "MM/DD" pairs.  Useful for hard to
//            compute dates/laziness.
//
//  If the date is unset, then the pattern is used, and if that's unset the func is used,
//   finally falling back to the table.
//
// The pattern is as follows:
// - day:   Day of the week, as the string "Monday", "Tuesday", etc.
// - which: Which instance of that day in the month.  "first", "second", "third", "fourth", "fifth" or "last".
// - Month: Which month the holiday is in, as a number from 1 to 12.
// Table is simply an array of dates in the format of DD/MM/YY in chronological order.
//
//  If anyone is using this at the turn of the millenium, we can update it to support more robust dates.
 
var holidays = {};

var passoverBeginDates = [], passoverEndDates = [];
var yomKippurDates = [];
var roshHashanaDates = [];
var hanukkahBeginsDates = [];

// Reference for US holidays: https://www.law.cornell.edu/uscode/text/5/6103
holidays["US"] = [
	{ name:"New Years Day",                       date: "1/1"  },
	{ name:"Martin Luther King Jr's Birthday",    pattern:{ day:"Monday",   which:"third",   month: "1" } },
	{ name:"Valentine's Day",                     date: "2/14"  },
	{ name:"President's Day",                     pattern:{ day:"Monday",   which:"third",   month: "2" } },
	{ name:"Passover Begins",                     table:passoverBeginDates},
	{ name:"Passover Ends",                       table:passoverEndDates},
	{ name:"Good Friday",                         func:ComputeGoodFriday},
	{ name:"Easter Sunday",                       func:ComputeEaster},
	{ name:"Mother's Day",                        pattern:{ day:"Sunday",   which:"second",  month: "5" } },
	{ name:"Memorial Day",                        pattern:{ day:"Monday",   which:"last",    month: "5" } },
	{ name:"Father's Day",                        pattern:{ day:"Sunday",   which:"third",   month: "6" } },
	{ name:"Independence Day",                    date: "7/4"  },
	{ name:"Labor Day",                           pattern:{ day:"Monday",   which:"first",   month: "9" } },
	{ name:"Columbus Day",                        pattern:{ day:"Monday",   which:"second",  month:"10" } },
	{ name:"Yom Kipur",                           table:yomKippurDates},
	{ name:"Rosh Hashana",                        table:roshHashanaDates},
	{ name:"Halloween",                           date:"10/31" },
	{ name:"Election Day",                        pattern:{ day:"Tuesday",  which:"second",  month:"11" } },
	{ name:"Veterans Day",                        date:"11/11" },
	{ name:"Thanksgiving",                        pattern:{ day:"Thursday", which:"fourth",  month:"11" } },
	{ name:"Hanukkah Begins",                     table:hanukkahBeginsDates},
	{ name:"Christmas Eve",                       date:"12/23" },
	{ name:"Christmas Day",                       date:"12/25" },
	{ name:"New Years Eve",                       date:"12/31" },
];

// Easter function from http://stackoverflow.com/questions/1284314/easter-date-in-javascript
//  We also compute Good Friday, which is 2 days before easter.
function ComputeEaster_Prime(Y) {
	Y += 2000;
    var C = Math.floor(Y/100);
    var N = Y - 19*Math.floor(Y/19);
    var K = Math.floor((C - 17)/25);
    var I = C - Math.floor(C/4) - Math.floor((C - K)/3) + 19*N + 15;
    I = I - 30*Math.floor((I/30));
    I = I - Math.floor(I/28)*(1 - Math.floor(I/28)*Math.floor(29/(I + 1))*Math.floor((21 - N)/11));
    var J = Y + Math.floor(Y/4) + I + 2 - C + Math.floor(C/4);
    J = J - 7*Math.floor(J/7);
    var L = I - J;
    var M = 3 + Math.floor((L + 40)/44);
    var D = L + 28 - 31*Math.floor(M/4);

    return [M, D];
}

function ComputeGoodFriday(Y) {
	var easter = ComputeEaster_Prime(Y);

	return easter[0] + '/' + (easter[1] - 2);
}

function ComputeEaster(Y) {
	var easter = ComputeEaster_Prime(Y);

	return easter[0] + '/' + easter[1];
}

// Passover.  We just use a table for this.  Dates culled from https://www.timeanddate.com/holidays/us/first-day-of-passover
passoverBeginDates[16] = "4/23";		passoverEndDates[16] = "4/30";
passoverBeginDates[17] = "4/11";		passoverEndDates[17] = "4/18";
passoverBeginDates[18] = "3/31";		passoverEndDates[18] =  "4/7";
passoverBeginDates[19] = "4/20";		passoverEndDates[19] = "4/27";
passoverBeginDates[20] =  "4/9";		passoverEndDates[20] = "4/16";
passoverBeginDates[21] = "3/21";		passoverEndDates[21] =  "4/4";
passoverBeginDates[22] = "4/16";		passoverEndDates[22] = "4/23";
passoverBeginDates[23] =  "4/6";		passoverEndDates[23] = "4/13";
passoverBeginDates[24] = "4/12";		passoverEndDates[24] = "4/30";
passoverBeginDates[25] = "4/13";		passoverEndDates[25] = "4/20";

// Yom Kipur.  We just use a table for this.  https://www.timeanddate.com/holidays/us/yom-kippur
yomKippurDates[16] = "10/12";
yomKippurDates[17] = "9/30";
yomKippurDates[18] = "9/19";
yomKippurDates[19] = "10/9";
yomKippurDates[20] = "9/28";
yomKippurDates[21] = "9/16";
yomKippurDates[22] = "10/5";
yomKippurDates[23] = "9/25";
yomKippurDates[24] = "10/12";
yomKippurDates[25] = "10/2";

// Rosh Hashana.  We just use a table for this.  Dates culled from https://www.timeanddate.com/holidays/us/rosh-hashana
roshHashanaDates[16] = "10/3";
roshHashanaDates[17] = "9/21";
roshHashanaDates[18] = "9/10";
roshHashanaDates[19] = "9/30";
roshHashanaDates[20] = "9/19";
roshHashanaDates[21] =  "9/7";
roshHashanaDates[22] = "9/26";
roshHashanaDates[23] = "9/16";
roshHashanaDates[24] = "10/3";
roshHashanaDates[25] = "9/23";

// Hanukkah.  We just use a table for this.  Dates culled from https://www.timeanddate.com/holidays/us/chanukah
hanukkahBeginsDates[16] = "12/25";
hanukkahBeginsDates[17] = "12/13";
hanukkahBeginsDates[18] =  "12/3";
hanukkahBeginsDates[19] = "12/23";
hanukkahBeginsDates[20] = "12/11";
hanukkahBeginsDates[21] = "11/29";
hanukkahBeginsDates[22] = "12/19";
hanukkahBeginsDates[23] =  "12/8";
hanukkahBeginsDates[24] = "12/26";
hanukkahBeginsDates[25] = "12/15";


// Build a table containing all dates for a given year in the same format as HolidayAPI
//  Year is two digits (ie: 16), and country is a country code (ie: "us").
function GetHolidays( year, country ) {
	var dates = {};

	dates.status = 500;

	// Get the holidays for the country code
	var h;
	if( country in holidays ) 
		h = holidays[ country ];
	else
		h = holidays ["US"];

	if( typeof h == 'undefined' ) {
		// No match found; fail
		return;
	}

	// Walk the list of dates, adding the dates for this year to the list
	var thisDate;
	var hList = [], subHList;
	var parsed;
	var now = moment();

	for( var i=0; i < h.length; i++ ) {
		// Inititalize and set the name
		d = h[i];

		thisDate = {};
		thisDate.name   = d.name;
		thisDate.public = true;

		if( typeof d.date != 'undefined' ) {
			// Actual date
			parsed = moment( d.date, "MM/DD" );
			thisDate.date = "20" + year + "-" + parsed.format( "MM-DD" );

		} else if( typeof d.pattern != 'undefined' ) {
			// Pattern
			parsed = ParseHolidayPattern( d.pattern, year );
			thisDate.date = parsed.format( "YYYY-MM-DD" );

		} else if( typeof d.func != 'undefined' ) {
			// Function
			parsed = moment( d.func( year ), "MM/DD" );
			thisDate.date = "20" + year + "-" + parsed.format( "MM-DD" );

		} else if( typeof d.table != 'undefined' ) {
			// Table
			if( !(year in d.table) )
				continue;

			parsed = moment( d.table[year], "MM/DD" );
			thisDate.date = "20" + year + "-" + parsed.format( "MM-DD" );
		}

		// Push it onto the list
		thisDate.observed = thisDate.date;

		subHList = [];
		subHList.push( thisDate );

		hList.push( subHList );
	}

	// Sort by date
	hList.sort( function( a, b ) {
		if( a[0].date == b[0].date )
			return 0;

		if( moment( a[0].date, "YYYY-MM-DD" ) < moment( b[0].date, "YYYY-MM-DD" ) )
			return -1;

		return 1;
	});

	// Return
	dates.status   = 200;
	dates.holidays = hList;

	return dates;
}

// Prase the pattern string.
function ParseHolidayPattern( pattern, year ) {
	var m          = moment( pattern.month + "/" + year, 'MM/YY' );
	var whichNames = {"first":0, "second":1, "third":2, "fourth":3, "fifth":4};
	var whichDays  = {"Monday":1, "Tuesday":2, "Wednesday":3, "Thursday":4, "Friday":5, "Saturday":6, "Sunday":7};
	var day        = whichDays[ pattern.day ];

	if( pattern.which == "last" ) {
		// Last day of the month
		m.endOf( 'month' );

		if( day > m.isoWeekday() )
			m.add( -7 + (7 - (day - m.isoWeekday())), "days" );
		else
			m.add( -(m.isoWeekday() - day), "days" );

	} else {
		// Nth day of the month
		var week = whichNames[ pattern.which ];
		var offset;

		if( day >= m.isoWeekday() )
			offset = day - m.isoWeekday();
		else
			offset = 7 - (m.isoWeekday() - day);

		offset += 7 * week;
		m.add( offset, "days" );
	}

	return m;
}


// Holiday data comes from holidayapi.com or an internal set of holidays.  We report the
//  next holiday(s) coming up after today, and if today is a holiday.
var holidayThisDay      = -1;				// Used to decide if this is the same day as the last time we checked.  -1 means we havne't checked yet.

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

	// Initialize our state
	var holidayText = "";
	var numFound    = 0;
	var opacity     = 1.0;
	var now         = moment();

	// Make sure holidayapi.com is properly set up, using the internal mechanism if not
	if( holidayAPIKey == "Insert your API key from from http://holidayapi.com here" )
		updateHolidays_Internal( now );
	else
		updateHolidays_HolidayAPI( now );

	// Holidays via internal mechanism
	function updateHolidays_Internal( now )
	{
		// Get the holidays and add them to the list
		var jsonDate = GetHolidays( now.year() - 2000, holidayCountry );
		if( !updateHolidays_TestStatus( jsonDate ) )
			return;

		addHolidaysFromList( jsonDate.holidays, true );

		if( numFound < holidaysShown) {
			// Didn't find enough holidays this year; try next year, and give up after that
			var jsonDate2 = GetHolidays( now.year() - 1999, holidayCountry );
			if( !updateHolidays_TestStatus( jsonDate2 ) )
				return;

			addHolidaysFromList( jsonDate2.holidays, false );
		}

		// Update the UI and re-arm the timer
		updateHolidays_FinalUpdates();
	}

	// Holidays via holiday API
	function updateHolidays_HolidayAPI( now ) {
		var holidayURL = 'https://holidayapi.com/v1/holidays?key=' + holidayAPIKey+ '&country=' + holidayCountry + '&year=' + now.format('YYYY');

		$.getJSON( 'proxy.php?url =' + encodeURI( holidayURL ), function(jsonDate, textStatus) {
			// Success; update the holiday string, even if it's just empty
			if( !updateHolidays_TestStatus( jsonDate ) )
				return;

			addHolidaysFromList( jsonDate.holidays, true );

			if( numFound < holidaysShown) {
				// Didn't find enough holidays this year; try next year, and give up after that
				$.getJSON( holidayURL + now.add( 1, "years" ).format('YYYY'), function(jsonDate2, textStatus) {
					if( !updateHolidays_TestStatus( jsonDate ) )
						return;

					addHolidaysFromList( jsonDate.holidays, false );

					updateHolidays_FinalUpdates();

				}).fail (function( jqxhr, textStatus, error ) {
					// Failed; restart the timer for two minutes
					setTimeout(function() {
						updateHolidays();
					}, 120000);
				});
			}

		}).fail (function( jqxhr, textStatus, error ) {
			// Failed; restart the timer for two minutes
			setTimeout(function() {
				updateHolidays();
			}, 120000);
		});
	}

	// Nested function to add holidays from the list
	function addHolidaysFromList( holidays, doDateTest ) {
		var	prevDate = moment();
		prevDate.add( -1, "days" ); 				// To make sure that we get today as well as future dates

		// Customize the locale for holidays
		moment.updateLocale(lang, {					// Language localization
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

		// Loop through the holidays themselves
		for( var key in holidays ) {
			var thisHoliday = holidays[key];

			//  Skip public/federal holidays, as set in the config
			if( (holidayShowPublic && !thisHoliday[0].public) && (holidayShowFederal && thisHoliday[0].public) )
				continue;

			// Make sure the date is in the future, using observed or actual dates for the test based on the config flag
			var futureDate = moment( holidayShowObservedTimes ? thisHoliday[0].observed : thisHoliday[0].date, 'YYYY-MM-DD' );
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

	// Test the result of the build/JSON fetch
	function updateHolidays_TestStatus (jsonDate) { 
		if( !jsonDate.status == 200 ) {
			setTimeout(function() {
				updateHolidays();
			}, 120000);
			
			return false;
		}
		
		return true;
	}

	// Final updates to holidays
	function updateHolidays_FinalUpdates() {
		$('.holidays').updateWithText( holidayText, 1000 );
		$('.luHolidays').updateWithText('holidays: ' + moment().format('h:mm a ddd MMM D YYYY'), 1000);

		// Restart the timer in a bit under an hour
		holidayThisDay = moment().day();
		setTimeout(function() {
			updateHolidays();
		}, 3500000);
	}

})();