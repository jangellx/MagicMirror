// mm-mta: NY MTA train alerts and informaion for the Magic Mirror 
// This relies on some functions and variables from mm-mbta, and thus must be included after it. 
// API key, obtained for free from datamine.mta.info 

//var mtaAPIKey = "Insert your MTA key here from datamine.mta.info"; 
// Start and end station identifiers.  Initially the alerts are received 
// from the start station to the end station, but after mtaSwapStationsAtHour 
// has passed (ie: 15 for "3 PM"), alerts are obtained from the end station 
// to the start station (ie: going home instead of going to work). 

//var mtaStartStation = "CLP"; 
//var mtaEndStation = "NYK"; 
//var mtaSwapStationsAtHour = 15; // Hour in the day (ie: 15 for 3 PM) 

mbtaServiceName = "LIRR service";

// Function to convert datetime to 12 hour format 
function hours12(date) {
  return (date.getHours() + 24) % 12 || 12;};

function updateMTAServiceAlerts() {
	// Do nothing if we have no API key
	if( typeof mtaAPIKey == 'undefined')
		return;

	//Set home station
	var sStation = "CLP";
	
	// Get the information from the MTA via a JSON call.  7and & have to be replaced with %3f and %26 so we can send thm through proxy.php
	$.getJSON('proxy.php?url=https://traintime.lirr.org/api/Departure%3Fapi_key=' + mtaAPIKey + '%26loc=' + sStation + '', function(data) {

		//Clear out any existing alerts
		mbtaAlerts.length = 0;
		
		for (var i in data.TRAINS) {
			if (i > 0)
				break;

			// Get scheduled and estimated arrival times of upcoming trains
			var scheduledCalc = new Date(data.TRAINS[i].SCHED);
			var actualCalc = new Date(data.TRAINS[i].ETA);
			
			// Calculate train delay in minutes
			var delayMinutes = Math.floor(((actualCalc.getTime() - scheduledCalc.getTime()) / (1000)) / 60);
			 
			// Determine if scheduled train's arrival is after noon
			var scheduledAMPM = 'AM';
			if (scheduledCalc.getHours() > 12)
				var scheduledAMPM = 'PM';
		
			// Use hours12 function to convert from military time
			var scheduledTime = hours12(scheduledCalc) + ":" + scheduledCalc.getMinutes() + " " + scheduledAMPM;
			
			// Determine if actual train's arrival is after noon
			var actualAMPM = 'AM';
			if (actualCalc.getHours() > 12)
				var actualAMPM = 'PM';
		
			// User hours12 function to convert from military time
			var actualTime = hours12(actualCalc) + ":" + actualCalc.getMinutes() + " " + actualAMPM;
		
			// The MTA API contains the direction of a train
			// For trains in the morning show only westbound trains and in the afternoon show only eastbound trains
			var direction, sStation, eStation;
			if (actualAMPM === "AM") {
				direction = "W";
				sStation = "Country Life Press";
				eStation = "Penn Station";
			} else {
				direction = "E";
				sStation = "Penn Station";
				eStation = "Country Life Press";
			}
		 
//Testing
//delayMinutes = 5;
		 
			// The MTA considers a train on time if it arrives within 5 min 59 seconds of the scheduled time
			// ignore that concept and consider a train delayed	if it's over 3 minutes late
			var delayStatus = "";
			if (delayMinutes > 3) {
				delayStatus = "DELAYS - Train number " + data.TRAINS[i].TRAIN_ID
				            + " from " + sStation
							+ " to " + eStation
							+ " is running "
							+ delayMinutes
							+ " minutes late ";
			}

			var alret = "";
			if (delayMinutes > 3) {
				// Show only trains heading in our determined direction
				if (data.TRAINS[i].DIR === direction) {
					  alert = "<ul><li>"
							+ delayStatus + "<br>"
							+ "Scheduled Arrival Time: " + scheduledTime + "<br>"
							+ "Actual Arrival Time: " + actualTime + " "
							+ "</li></ul>";
				}

				mbtaAlerts.push(alert);
			}
		}
				
		// Reuse the MBTA array and update function
		mbtaAlertsPending = 0;
		updateMBTAServiceAlerts_UpadteDiv();
	}).always (function() {
		// Always restart the timer every 5 minutes
		setTimeout( updateMTAServiceAlerts, 300000);
	});
};
updateMTAServiceAlerts();
