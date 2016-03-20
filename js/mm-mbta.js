//
// mm-mbta: MBTA train alerts and informaion for the Magic Mirror
//

// MBTA Service Alerts.  We get 10000 calls a day, so we update every 5 minutes.
//  As with the weather, we again use the proxy to get the page.  MBTA does support
//  JSONP, but for whatever reason I just couldn't get that to work.

var mbtaAlerts          = [];				// List of MBTA alerts as HTML, one for each alert we have a JSON request for
var mbtaAlertsPending   = 0;				// Number of JSON requests for MBTA alerts that we're waiting on.  Once this gets to 0, we update the div with the contents of the mbtaAlerts
var mbtaServiceName     = "MBTA service";	// The name of the service, displayed in the title as "n MBTA service alerts".  Provided as a variable so that it can be replaced for other transit services.

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

		// This creates the string, "n MBTA service alerts", where n is the number of alerts, "MBTA" is a variable and "alerts" may be "alert" when there's only one alert
		var alertCountText = (nonOngoingCount == 1) ? 'alert' : 'alerts';
		alerts = '<p class="xxsmall" style="text-align:center">' + nonOngoingCount + ' ' + mbtaServiceName + ' ' + alertCountText + '</p>';

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
	// Fail out if none of the config state is set up
	if( typeof mbtaAPIKey == 'undefined')
		return;

	if( typeof mbtaRoute == 'undefined')
		return;

	// Request the alert headers on this route
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
