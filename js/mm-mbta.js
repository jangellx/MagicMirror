//
// mm-mbta: MBTA train alerts and informaion for the Magic Mirror
//

"use strict"

var mbtaRefreshRate        = 300000;		// 300000 == 5 minutes
var mbtaRefreshRateOnError = 120000;		// 120000 == 2 minutes

// MBTA Service Alerts.  We get 10000 calls a day, so we update every 5 minutes.
//  As with the weather, we again use the proxy to get the page.  MBTA does support
//  JSONP, but for whatever reason I just couldn't get that to work.

// MBTA Service Alerts, V3.  V2 is discontinued, and V3 has a much higher call limit.
//  As with the weather, we again use the proxy to get the page.

var mbtaAlerts          = [];				// List of MBTA alerts as HTML, one for each alert we have a JSON request for
var mbtaServiceName     = "MBTA service";	// The name of the service, displayed in the title as "n MBTA service alerts".  Provided as a variable so that it can be replaced for other transit services.

// See https://groups.google.com/forum/#!topic/massdotdevelopers/mco5gtgPEP4 for where this
//  list of effects came from.  The key is the effect_name, and the value is the class defined
//  in mbta-icons.css
var mbtaIconsKey = {
	'ACCESSIBILITY'     :'mbtai-key_accessibility',
	'AMBER_ALERT'       :'mbtai-key_other',
	'CANCELLATION'      :'mbtai-key_canceltrip',
	'DELAY'             :'mbtai-key_delay',
	'DETOUR'            :'mbtai-key_detour',
	'DOCK_CLOSURE'      :'mbtai-key_closure',
	'DOCK_ISSUE'        :'mbtai-key_other',
	'EXTRA_SERVICE'     :'mbtai-key_extraservice',
	'POLICY_CHANGE'     :'mbtai-key_other',
	'SCHEDULE_CHANGE'   :'mbtai-key_schedchange',
	'SERVICE_CHANGE'    :'mbtai-key_other',
	'SHUTTLE'           :'mbtai-key_shuttlebus',
	'SHOW_ROUTE'        :'mbtai-key_snowroute',
	'STATION_CLOSURE'   :'mbtai-key_closure',
	'STATION_ISSUE'     :'mbtai-key_other',
	'STOP_CLOSURE'      :'mbtai-key_closure',
	'STOP_MOVE'         :'mbtai-key_other',
	'SUSPENSION'        :'mbtai-key_noservice',
	'TRACK_CHANGE'      :'mbtai-key_other',
	'UNKNOWN_CAUSE'     :'mbtai-key_other',
}

var mbtaIconsRed = {
	'ACCESSIBILITY'     :'mbtai-red_accessibility',
	'AMBER_ALERT'       :'mbtai-red_other',
	'CANCELLATION'      :'mbtai-red_canceltrip',
	'DELAY'             :'mbtai-red_delay',
	'DETOUR'            :'mbtai-red_detour',
	'DOCK_CLOSURE'      :'mbtai-red_closure',
	'DOCK_ISSUE'        :'mbtai-red_other',
	'EXTRA_SERVICE'     :'mbtai-red_extraservice',
	'POLICY_CHANGE'     :'mbtai-red_other',
	'SCHEDULE_CHANGE'   :'mbtai-red_schedchange',
	'SERVICE_CHANGE'    :'mbtai-red_other',
	'SHUTTLE'           :'mbtai-red_shuttlebus',
	'SHOW_ROUTE'        :'mbtai-red_snowroute',
	'STATION_CLOSURE'   :'mbtai-red_closure',
	'STATION_ISSUE'     :'mbtai-red_other',
	'STOP_CLOSURE'      :'mbtai-red_closure',
	'STOP_MOVE'         :'mbtai-red_other',
	'SUSPENSION'        :'mbtai-red_noservice',
	'TRACK_CHANGE'      :'mbtai-red_other',
	'UNKNOWN_CAUSE'     :'mbtai-red_other',
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

	// Rearm the timer
	setTimeout( updateMBTAServiceAlerts, mbtaRefreshRate);
}

// Get the information for a single alert.  We wrap this in a function so that we can fake
//  passing variables (the array index, alert ID and default text) to our JSON callback.
function updateMBTAServiceAlerts_UpadteOne( index, jsonAlert )
{
	var alerticon, alertTime, alertSeverity, alertText, alertDir, isOngoing = false;

	if( (jsonAlert.lifecycle == "ONGOING") || (jsonAlert.lifecycle == "ONGOING-UPCOMING") || (jsonAlert.timeframe == "ongoing") ) {
		// Ongoing alert; effectively skip it
		var alert = "";

	} else {
		// All other alerts; get information for display
		var alertIcon          = jsonAlert.severity < 4 ? mbtaIconsKey[ jsonAlert.effect ] : mbtaIconsRed[ jsonAlert.effect ];
		var alertTimeframe     = (jsonAlert.timeframe == null) ? "" : " (" + jsonAlert.timeframe + ")";  /**/
		var alertUpdated       = moment( jsonAlert.updated_at, "YYYY-MM-DD" ).format( "MMM D" );
		var alertServiceEffect = jsonAlert.service_effect;
		var alertText          = jsonAlert.header;

		// Find the direction from the direction_id.  We just use 0 as Outbound and 1 as Inbound, because I'm lazy and don't feel
		//  like grabbing it from a routes call's data/(index)/attributes/direction_names, which is the right way to do it.
		var alertDir = "";
		if( (typeof(jsonAlert.informed_entity) != 'undefined') && (jsonAlert.informed_entity.length > 0) && (typeof(jsonAlert.informed_entity[0].direction_id) != 'undefined') ) {
			alertDir = ' &mdash; '
			if( jsonAlert.informed_entity[0].direction_id == 0 )
				alertDir += "Outbound";
			else if( jsonAlert.informed_entity[0].direction_id == 1 )
				alertDir += "Inbound";
			else
				alertDir += "(unknown)";
		}

		// Div with icon
		var alert = '<div class="mbtaEntry ' + alertIcon + '">'
		alert += '<strong>' + alertUpdated + alertTimeframe + alertDir + '</strong><br>';
		alert += alertText;
		alert += '</div>'

		// Make sure this exact string isn't already in the array, since that can happen sometimes for some reaosn
		if( $.inArray(alert, mbtaAlerts) == -1 ) {
			// Now we can add it to the array
			mbtaAlerts[ index ] = alert;
		}
	}
}

// Outer function that updates the alert list, calling the above functions to get information
//  about individual alerts
function updateMBTAServiceAlerts() {
	// Fail out if none of the config state is set up
	if( typeof mbtaRoute == 'undefined')
		return;

	var apiKeyArg = "";
	if( typeof mbtaAPIKey != 'undefined')
		apiKeyArg="&api_key=" + mbtaAPIKey;

	// Request the alert headers on this route
	var url = 'https://api-v3.mbta.com/alerts?filter[route]=' + mbtaRoute + apiKeyArg;
	if( usePHPWrapper )
		url = 'proxy.php?url=' + encodeURI( url );

	$.getJSON(url, function(json, textStatus) {
		// Reset our global array of alerts
		mbtaAlerts.length = 0;
		mbtaAlerts.length = json.data.length;
		if( mbtaAlerts.length == 0 ) {
			// No alerts; just clear the block
			$('.mbta').updateWithText('', 1000);
			$('.luMBTA').updateWithText('mbta (no alerts):' + moment().format('h:mm a ddd MMM D YYYY'), 1000);

		} else {
			// Loop through the alert list and request each alert's information as separate AJAX calls
			for (var i in json.data)
				updateMBTAServiceAlerts_UpadteOne( i, json.data[i].attributes );
		}

		// Update the div.  Also re-arms the update timer
		updateMBTAServiceAlerts_UpadteDiv();

	}).fail (function( jqxhr, textStatus, error ) {
		// JSON call failed; re-arm the timer
		setTimeout( updateMBTAServiceAlerts, mbtaRefreshRateOnError);
	});
};

// Call the function.  We can't call it at the end of the declaration itself like we do elsewhere
//  because then it's not in the right scope for for the other updateMBTAServiceAlerts_UpadteDiv()
//  to pass it to setTimeout().
updateMBTAServiceAlerts();
