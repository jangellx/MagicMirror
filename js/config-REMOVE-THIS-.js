// for navigator language
var lang = window.navigator.language;
// you can change the language
// var lang = 'en';

// Set up your Dark Sky/forecast.io infromation and lat/lon here
var darkSkyAPIKey  = "Insert your APi key from http://developer.forecast.io here";
var darkSkyLat     = "41.000";
var darkSkyLon     = "-71.000"

// Set up your MBTA API key, available here: http://realtime.mbta.com/Portal/
var mbtaAPIKey     = "Insert your API key from http://realtime.mbta.com/Portal/ here"
var mbtaRoute      = "Insert your MBTA route string here"

// Number of hours to display in the temperature/rain graph
var tempGraphRangeOfHours = 30;

// Country code for holidays, as per holidayapi.com
var holidayCountry = "US";

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

// RSS Feed here
var feed = 'http://www.wbur.org/feed'

// compliments:
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
