//
// mm-mta: NY MTA train alerts and informaion for the Magic Mirror
// This relies on some functions and variables from mm-mbta, and thus must be included after it.
//

// API key, obtained for free from datamine.mta.info
//var mtaAPIKey             = "Insert your MTA key here from datamine.mta.info";

// Start and end station identifiers.  Initially the alerts are received
//  from the start station to the end station, but after mtaSwapStationsAtHour
//  has passed (ie: 15 for "3 PM"), alerts are obtained feom the end station
//  to the start station (ie: going home instead of going to work).
//var mtaStartStation       = "CLP";
//var mtaEndStation         = "NYK";
//var mtaSwapStationsAtHour = 15;		// Hour in the day (ie: 15 for 3 PM)

// Get the current alerts.  This is called once every 5 minutes as long as the API key is set.
function updateMBTServiceAlerts() {
	// Do nothing if we have no API key
	if( typeof mtaAPIKey == 'undefined')
		return;

	// Initialize some variables
	var today    = new Date();
	var dd       = today.getDate();
	var mm       = today.getMonth() + 1;
	var yyyy     = today.getFullYear();
	var hour     = today.getHours() - 2;			// Now minus 2 hours
	var min      = today.getMinutes();

	// Change the service name to "MTA (start to end)"
	mbtaServiceName = "MTA (" + ((today.getHours() < mtaSwapStationsAtHour) ? (mtaStartStation + " to " + mtaEndStation) : (mtaEndStation + " to " + mtaStartStation)) + ")";

	// Figur out the start/end stations based on the time of day
	var sStation = (today.getHours() < mtaSwapStationsAtHour) ? mtaStartStation : mtaEndStation;
	var eStation = (today.getHours() < mtaSwapStationsAtHour) ? mtaEndStation   : mtaStartStation;

	// Get the information from the MTA via a JSON call.  7 and & have to be replaced with %3f and %26 so we can send thm through proxy.php
	$.getJSON('proxy.php?url=https://traintime.lirr.org/api/TrainTime%3Fapi_key=' + mtaAPIKey + '%26startsta=' + sStation + '%26endsta=' + eStation + '%26year=' + yyyy + '%26month='+ mm +'%26day='+ dd +'%26hour='+ hour +'%26minute='+ min +'%26datoggle=d', function(data) {
		//Clear out any existing alerts
		mbtaAlerts.length = 0;

		for (var i in data.TRIPS) {
			if (i > 0) 
				break;

			var trip = data.TRIPS[i];
			for (var x in trip.LEGS) {
				for (var z in trip.LEGS[x].STOPS) {
					// Add each alert to the alerts list
					for( var alertString in trip.ALERTS ) {
						var alertIcon = "mbtai-key_other";			// TOOD:  Use MTA-specific icons?  And specific to the kind of alert?
						var alert = '<div class="mbtaEntry ' + alertIcon + '">'
						alert    += alertText;
						alert    += '</div>'

						mbtaAlerts.push( alert );
					}

/*	Full dump, mostly for debugging
					var alert = "<ul><li>"
							   + "Start Station: " + data.START_STATION + " "
							   + "Destination: "   + data.END_STATION + " " 
							   + "Duration: "      + trip.DURATION + " minutes " 
							   + "Train Number: "  + trip.LEGS[x].TRAIN_ID + " " 
							   + "Status: "        + trip.LEGS[x].STATUS + " " 
							   + "Stops: "         + trip.LEGS[x].STOPS[z].STATION + " " 
							   + "Time: "          + trip.LEGS[x].STOPS[z].TIME + " " 
							   + "Alerts: "        + trip.ALERTS
							   + "</li></ul>";

					mbtaAlerts.push( alert );
*/
				}
			}
		}

		// Reuse the MBTA array and update function
		mbtaAlertsPending = 0;
		updateMBTAServiceAlerts_UpadteDiv();

	}).always (function() {
		// Always restart the timer every 5 minutes
		setTimeout( updateMBTAServiceAlerts, 300000);
	});

};

updateMBTServiceAlerts();
