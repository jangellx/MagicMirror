//
//--- CLOCK ---------------------------------------------------------------------------------------
//

// 12 or 24 hours clock.  Set to false for a 24 hours clock
var clock12Hour = true;

// Determine if the dey is displayed before the month (13 March) or after (March 13)
var dayBeforeMonth = false;

// Language for the times.  Enforcing 'en' makes sure that dates are displayed as
//  "March 13th" instead of "March 13" in moment.js.
//var lang = window.navigator.language;
var lang = 'en';

// Warning Times
//  Adding times, colors and messages to this array will cause the
//  current time to change color and display the message underneath.
//  It can be useful as a warning to let you know that it's time for you
//  to leave before you miss the train, for example.  The time format is
//  "HH:MM" with HH between 0-23 and MM between 0 and 59.
// Warnings can be triggered on certain days of the week.  The 'days'
//  array consists of true/false values, with the indices of the array
//  representing the days of the week starting with Sunday.  The warning
//  will show up for each day marked as true.  If the array is or not
//  provided, all days are assumed to be true.
//                                                                                                              Sun    Mon    Tues   Wed   Thurs   Fri     Sat   
var warningTimes = [ { startTime: "7:10", endTime: "7:20", color:"FFA500", message:"Train to Boston",   days:[ false,  true,  true,  true,  true,  true,  false ] },
                     { startTime:"17:50", endTime:"18:05", color:"FFA500", message:"Train from Boston", days:[ false,  true,  true,  true,  true,  true,  false ] },
];


//
//--- WEATHER -------------------------------------------------------------------------------------
//

// Set up your Dark Sky/forecast.io infromation and lat/lon here
var darkSkyAPIKey  = "Insert your APi key from http://developer.forecast.io here";
var darkSkyLat     = "41.000";
var darkSkyLon     = "-71.000"

// Units for values related to the weather, including temperatures and
//  speeds.  Should be one of: us, si, ca, uk, uk2 and auto.  For details,
//  see https://developer.forecast.io/docs/v2#Options
var darkSkyUnits = "auto";

// Number of decimal places to round temperatures to.  Usually 0 for
//  regions that use fahrenheit (ie: 32) and 1 for celcius (ie: 10.3).
var tempDecimalPlaces = 0;

// Language for the weather information.  This only applies to information
//  returned directly by Dark Sky/forecast.io.  For more available languages
//  see https://developer.forecast.io/docs/v2#Options
var darkSkyLanguage = "en"

// Number of hours to display in the temperature/rain graph
var tempGraphRangeOfHours = 30;

//
//--- MBTA ----------------------------------------------------------------------------------------
// Boston area train alerts

// Set up your MBTA API key, available here: http://realtime.mbta.com/Portal/
//var mbtaAPIKey     = "Insert your API key from http://realtime.mbta.com/Portal/ here"
//var mbtaRoute      = "Insert your MBTA route string here"

//
//--- MTA -----------------------------------------------------------------------------------------
// NYC area train alerts.  EXPERIMENTAL
//var mtaAPIKey             = "Insert your API key from http://realtime.mbta.com/Portal/ here";
//var mtaStartStation       = "CLP";
//var mtaEndStation         = "NYK";
//var mtaSwapStationsAtHour = 15;		// Hour in the day (ie: 15 for 3 PM) after which to swap the stations


//
//--- HOLIDAYS -------------------------------------------------------------------------------------
//

// Country code for holidays, as per holidayapi.com
var holidayCountry = "US";

// Total number of holidays to display
var holidaysShown  = 3;

// Holiday filter
//  Add dates you don't want to see in the fomat of "MM-DD".  This can
//  also be a string matching one of the holiday names.
var holidayFilter = [
			'01-06',		// Epiphany
			'01-07',		// Orthodox Christmas
			'12-08',		// Immaculate Conception of the Virgin Mary
			'Kwanza'		// All the days of Kwanza
];

// Custom holidays to add to the holiday list.  These are assumed
//  to be in chronological order, and can be on the same day as
//  an existing holiday, but should be unique within the array.
//  These are drawn in gold in the holiday list.  Note that the
//  array must exist, but can be empty.
var holidaysCustom = [
//			{ date: '01-02', name: 'Day After New Years' },
];


//
//--- RSS FEEDS -------------------------------------------------------------------------------------
//

//  Old style supporting a single feed.
// var feed = 'http://www.wbur.org/feed'
//
// New Style supporting multiple feeds via a dictionary.  The key is displayed above the headline.
var feedURLs = {'World'      : 'http://feeds.reuters.com/Reuters/worldNews',		// Reuters World
				'US'         : 'http://feeds.reuters.com/Reuters/domesticNews',		// Reuters US
				'Politics'   : 'http://feeds.reuters.com/Reuters/PoliticsNews',		// Reuters Politics
				'Technology' : 'http://feeds.reuters.com/Reuters/technologyNews',	// Reuters Technology
				'Science'    : 'http://feeds.reuters.com/reuters/scienceNews' };	// Reuters Science


//
//--- COMPLIMENTS -------------------------------------------------------------------------------------
//

// Time of Day Compliments
var morning = [
            'Good morning!',
            'Enjoy your day!',
            'How was your sleep?'
        ];
        
var afternoon = [
            'Hello, beauty!',
            'You look sexy!',
            'Looking good today!'
        ];
       
var evening = [
            'Wow, you look hot!',
            'You look nice!',
            'Hi, sexy!'
        ];

// -- Experimental --
// Mixed vs. Stacked Compliments
//  if this is true, the weather complements are mixed with the standard complements.  If false,
//  the weather compliments are shown in smaller text under the standard compliments.
var mixCompliments = true;

// Weather "Compliments"
//  These are phrases that are mixed with the time-of-day compliments based on
//  the current weather conditions (rain, snow, etc).
var weatherCompliments = { "clear-day"           : ["Bright and sunny today!", "Clear skies ahead!"],
						   "clear-night"         : ["You can see the stars tonight!"],
						   "rain"                : ["Might want an umbrella!", "Better bring your raincoat!", "Stay dry today!"],
						   "snow"                : ["Build a snowman!", "Snowball fight!", "Catch some snowflakes!"],
						   "sleet"               : ["It's a bit messy out there!"],
						   "wind"                : ["Don't get blown away!"],
						   "partly-cloudy-day"   : ["A little gray out today!"],
						   "fog"                 : ["Don't get lost in the fog!"],
						   "cloudy"              : ["It's looking grey out today!"],
						   "partly-cloudy-night" : ["No stargazing tonight!"],
						   "hail"                : ["Watch out for ice from the sky!"],
						   "thunderstorm"        : ["Lightning and thunder!"],
						   "tornado"             : ["And your little dog, too!"] };

// Temperature "Compliments"
//  These are mixed with the weather and time-of-day compliments based on
//  a temperature range.  The array is walked from the highest temperatures
//  to the lowest until a match is found for average temperature over the
//  next 12 hours.
var temperatureCompliments = [ {low:  83, messages:["Hot one today!", "Try to keep cool!"] },
                               {low:  60, messages:["It's warm out today!"] },
						       {low:  33, messages:["Don't forget a jacket!"] },
						       {low: -50, messages:["Bundle up today!", "Stay warm!"] } ];

// -- Experimental --
// Weather background images.  You'll usually want to leave this
//  commented out for a mirror, but it can be useful if you want
//  to use it as a weather station.
// Background images are a dictionary of arrays.  The dictionary
//  is the weather icon code, while the array is a list of images
//  that will be randomly chosen or cycled through based.
// To use:  Uncommoent the weatherBGImages, and set the image URLs
//  to something useful.  You can have as many or as few images
//  as you like, but you must have at least one image per entry.

var weatherBGImages = { "clear-day"           : [],
						"clear-night"         : [],
						"rain"                : [],
						"snow"                : [],
						"sleet"               : [],
						"wind"                : [],
						"partly-cloudy-day"   : [],
						"fog"                 : [],
						"cloudy"              : [],
						"partly-cloudy-night" : [],
						"hail"                : [],
						"thunderstorm"        : [],
						"tornado"             : [] };

/* This commented-out block is an example of how this might look
var weatherBGImages = { "clear-day"           : ["http://www.someURL.com/image1.jpg", "http://www.someURL.com/image2.jpg"],
						"clear-night"         : ["http://www.someURL.com/image1.jpg", "http://www.someURL.com/image2.jpg"],
						"rain"                : ["http://www.someURL.com/image1.jpg", "http://www.someURL.com/image2.jpg"],
						"snow"                : ["http://www.someURL.com/image1.jpg", "http://www.someURL.com/image2.jpg"],
						"sleet"               : ["http://www.someURL.com/image1.jpg", "http://www.someURL.com/image2.jpg"],
						"wind"                : ["http://www.someURL.com/image1.jpg", "http://www.someURL.com/image2.jpg"],
						"partly-cloudy-day"   : ["http://www.someURL.com/image1.jpg", "http://www.someURL.com/image2.jpg"],
						"fog"                 : ["http://www.someURL.com/image1.jpg", "http://www.someURL.com/image2.jpg"],
						"cloudy"              : ["http://www.someURL.com/image1.jpg", "http://www.someURL.com/image2.jpg"],
						"partly-cloudy-night" : ["http://www.someURL.com/image1.jpg", "http://www.someURL.com/image2.jpg"],
						"hail"                : ["http://www.someURL.com/image1.jpg", "http://www.someURL.com/image2.jpg"],
						"thunderstorm"        : ["http://www.someURL.com/image1.jpg", "http://www.someURL.com/image2.jpg"],
						"tornado"             : ["http://www.someURL.com/image1.jpg", "http://www.someURL.com/image2.jpg"] };
*/

// Background image tint color.  The higher the value, the dark the image, but the more readable the text is.
var weatherBGTint = 0.75;

// Number of seconds to cycle through the iamges for a given weather entry.
var weatherVGCycleInterval = 60;