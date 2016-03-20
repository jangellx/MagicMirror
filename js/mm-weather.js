//
// mm-weather.js:  Weather graph andd forecast for the Magic Mirror.
//  This also updates the background image, since that relies on the
//  current weather.
//

// Convert from KPH to the Beufort scale
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

// Round the temperature based on tempDecimalPlaces
function roundTemp(temp)
{
	var scalar = 1 << tempDecimalPlaces;

	temp *= scalar;
	temp  = Math.round( temp );
	temp /= scalar;

	return temp;
}

// Add support for legacy configs that don't define certain variables
if( typeof darkSkyUnits == 'undefined')
	var darkSkyUnits = "auto";

if( typeof darkSkyLanguage == 'undefined')
	var darkSkyLanguage = "en";

if( typeof tempDecimalPlaces == 'undefined')
	var tempDecimalPlaces = 0;

// Get the weather via Dark Sky's API.  We get 1000 free updates a day,
//  so we only check once every 15 minutes.  That should be more than
//  frequent enough.  This updates the current conditions, forecast,
//  summary, alerts and grapsh in the same place so that we can use just
//  one JSON call.
(function updateWeatherForecast()
{
	var dsUnits = '%3Funits='    + darkSkyUnits;		// First argument starts with ?
	var dsLang  = '%26amp;lang=' + darkSkyLanguage;		// Subsequent arguments start with &, encoded so the PHP script doesn't think they're its arguments
	var url     = 'https://api.forecast.io/forecast/' + darkSkyAPIKey + '/' + darkSkyLat + ',' + darkSkyLon + dsUnits + dsLang;

	// Make sure Dark Sky is properly set up
	if( darkSkyAPIKey == "Insert your APi key from http://developer.forecast.io here" )
		return;

	$.getJSON('proxy.php?url=' + encodeURI( url ), function(json, textStatus) {
		// Update the current weather
		var current       = json.currently;
		var temp          = roundTemp(current.temperature);
		var feelsLikeTemp = roundTemp(current.apparentTemperature);
		var wind          = roundVal(current.windSpeed);

		curWeatherIcon = current.icon;							// Stored for use by weather-related background images
		var iconClass  = "wi-forecast-io-" + current.icon;
		var icon       = $('<span/>').addClass('icon').addClass('dimmed').addClass('wi').addClass(iconClass);
		$('.temp').updateWithText( icon.outerHTML() + temp + '&deg;<br>', 1000 );

		var tempFeelsLikeText = "";
		if( temp != feelsLikeTemp )
			tempFeelsLikeText = 'feels like ' + feelsLikeTemp + '&deg;'
		$('.tempfeelslike').updateWithText( tempFeelsLikeText, 1000 );

		var today      = json.daily.data[0];
		var now        = new Date();

		var sunString;
		if (today.sunriseTime*1000 < now && today.sunsetTime*1000 > now) {
			var sunset = new moment.unix(today.sunsetTime).format( clock12Hour ? "h:mm a" : "H:mm" );
			sunString = '<span class="wi wi-sunset xdimmed"></span> '  + sunset;
		} else {
			var sunrise = new moment.unix(today.sunriseTime).format( clock12Hour ? "h:mm a" : "H:mm" );
			sunString = '<span class="wi wi-sunrise xdimmed"></span> ' + sunrise;
		}

		var windString = '<span class="wi wi-strong-wind xdimmed"></span> ' + wind;
		$('.windsun').updateWithText(windString+' '+sunString, 1000);

		// Update the weekly forecast
//			updateWeatherForcast_UpdateWeeklyTable( json );
		updateWeatherForcast_UpdateWeeklyGraph( json.daily.data );

		// Update the summary text
		$('.summary').updateWithText(json.hourly.summary + ' ' + json.daily.summary /*+ '<br><br>' +
									 '<span class="xxxsmall xxdimmed">last updated: ' + moment().format('h:mm a ddd MMM D YYYY') + '</span>'*/, 1000);

		$('.luWeather').updateWithText('weather: ' + moment().format('h:mm a ddd MMM D YYYY'), 1000);

		// Compute the average temperature for the next 12 hours
		dailyAverageTemp = 0;
		for( var i=0; i < 12; i++ ) {
			dailyAverageTemp += json.hourly.data[i].temperature;
		}
		dailyAverageTemp /= 12;

		// Update the alerts text
// - Not really usable in a mirror context
//			updateWeather_Alerts( json );

		// Generate the graph
		updateWeatherForecast_DrawGraph( json.daily.data, json.hourly.data );

		// Update in 15 minutes
		setTimeout(updateWeatherForecast, 900000);

		// Update the background iamge
		updateBackground();

	}).fail( function() {
		// JSON call failed; re-arm the timer for 5 minutes
		setTimeout(updateWeatherForecast, 300000);
	});
})();

// Update the wearther alerts.
// - Really, this isn't worth it; the alerats are huge walls of text, sand don't fit well in the mirror.
function updateWeather_Alerts( json ) {
	var weatherAlerts = "";
	if( json.alerts.length > 0 ) {
		var alertCountText = (json.alerts.length == 1) ? 'alert' : 'alerts';
		weatherAlerts = '<p class="xxsmall" style="text-align:center">' + json.alerts.length + ' Weather Alerts ' + alertCountText + '</p>';
	}

	for( var i in json.alerts ) {
		weatherAlerts += "<p><strong>" + json.alerts[i].title + "</strong><br>";
		weatherAlerts += json.alerts[i].description;
	}
	$('.weatheralerts').updateWithText( weatherAlerts );
}

// Update the weekly forecast as a table of temperatures with a weather icon on each day
function updateWeatherForcast_UpdateWeeklyTable( json ) {
	var forecastTable = $('<table />').addClass('forecast-table');
	var opacity = 1;

	for (var i in json.daily.data) {
		var day       = json.daily.data[i];
		var iconClass = "wi wi-forecast-io-" + day.icon;
		var dt        = new Date( day.time * 1000 );

		var row = $('<tr />').css('opacity', opacity);
		row.append($('<td/>').addClass('day').html(moment.weekdaysShort(dt.getDay())));
		row.append($('<td/>').addClass('icon-small forecast-icon').addClass(iconClass));
		row.append($('<td/>').addClass('temp-max').html(roundTemp(day.temperatureMax) + '&deg;'));
		row.append($('<td/>').addClass('temp-min').html(roundTemp(day.temperatureMin) + '&deg;'));

		forecastTable.append(row);
		opacity -= 0.155;

		if( i > 5 )
			break;
	}

	$('.forecast').updateWithText(forecastTable, 1000);
}

// Draw the weekly forecast as a graph, similar to how Dark Sky does.  Each day is drawn as a bar
// prepresenting the low and high temperature.
function updateWeatherForcast_UpdateWeeklyGraph( dailyData ) {
	var marginL       = 85 + (tempDecimalPlaces * 10);				// Add 10 pixels per extra decimal place so that the temperature labels fit
	var marginR       = 17 + (tempDecimalPlaces * 10);				// Same here
	var marginT       =  2;
	var marginB       = 10;
	var lineMargin    =  8;
	var dayRightEdge  = 37;
	var barShift      =  8;
	var barTextMargin =  2;
	var barTextShift  = -2;
	var iconRightEdge = dayRightEdge + 27;
	var w = parseInt( $('.weekgraph').css('width') );
	var h = parseInt( $('.weekgraph').css('height') );
	var numDays       =  7;
	var lineHeight    = (h - marginT - marginB) / numDays;
	var opacityShift  =  0.12

	// We just want 7 days of data
	var filteredDays = dailyData.filter( function(d, i) { return (i < numDays); });

	weekGraphSVG = d3.select( "#weekGraphSVG" );
	if( weekGraphSVG.empty() ) {
		// Set up the SVG
		weekGraphSVG = d3.select(".weekgraph").append("svg")
						 .attr('width',  w)
						 .attr('height', h)
						 .attr('id',     "weekGraphSVG" );
	}

	// Set up the scale for the temps
	var tempXScale = d3.scale.linear().domain([ d3.min( filteredDays, function(d) { return d.temperatureMin } ),
												d3.max( filteredDays, function(d) { return d.temperatureMax } ) ])
									  .range([ marginL, w - marginR ]);

	// Add the freezing and hot lines
	updateWeatherForcast_UpdateWeeklyGraph_HotColdLine( 32, "freezeLine", "\uf076",  0 )			// f076 is wi-snowflake-cold
	updateWeatherForcast_UpdateWeeklyGraph_HotColdLine( 80, "hotLine",    "\uf072", -4 )			// f076 is wi-hot

	// Draw labels down the left side
	// - Create the labels
	weekGraphSVG.selectAll( ".weekgraphDayText" )
				.data( filteredDays )
				.enter()
				.append( "text" )
				.attr(   "class", "weekgraphDayText" )
				.attr(   "x", dayRightEdge )
				.attr(   "text-anchor", "end")
				.style(  "fill",    function(d,i) { return shadeColor2( "#DDDDDD", -i * opacityShift ) } );

	// - Update all labels
	weekGraphSVG.selectAll( ".weekgraphDayText" )
				.text( function(d) {
					var dt = new Date( d.time * 1000 );
					return moment.weekdaysShort( dt.getDay() );
				})
				.attr( "y", function(d,i) {
					return i * lineHeight + lineHeight + marginT;
				});

	// Draw the weather icon to the right of each day
	// - Create the icon label
	weekGraphSVG.selectAll( ".weekgraphDayIcon" )
				.data( filteredDays )
				.enter()
				.append( "text" )
				.attr(   "class", "weekgraphDayIcon wi" )
				.attr(   "x", iconRightEdge )
				.attr(   "text-anchor", "end")
				.style(  "fill",    function(d,i) { return shadeColor2( "#DDDDDD", -i * opacityShift ) } );

	// - Update all icon labels
	//   We can't use the convenient CSS from weather-icons.css because Javascript can't read that, and :before isn't available
	//    without evaluating the element, so we just build our own table and look into that.
	var svgWeatherIcons = { "clear-day"           : "\uf00d",
							"clear-night"         : "\uf02e",
							"rain"                : "\uf019",
							"snow"                : "\uf01b",
							"sleet"               : "\uf0b5",
							"wind"                : "\uf050",
							"partly-cloudy-day"   : "\uf002",
							"fog"                 : "\uf014",
							"cloudy"              : "\uf013",
							"partly-cloudy-night" : "\uf031",
							"hail"                : "\uf015",
							"thunderstorm"        : "\uf01e",
							"tornado"             : "\uf056" }

	weekGraphSVG.selectAll( ".weekgraphDayIcon" )
				.text( function(d) {
					return svgWeatherIcons[ d.icon ];
				})
				.attr( "y", function(d,i) {
					return i * lineHeight + lineHeight + marginT;
				});

	// Draw rounded rectangles for each day
	// - Add one rect per day
	weekGraphSVG.selectAll( ".weekgraphDayTempBar" )
				.data( filteredDays )
				.enter()
				.append( "rect" )
				.attr(   "class", "weekgraphDayTempBar" )
				.attr(   "y",  function(d,i) { 
					return i * lineHeight + marginT + lineMargin + barShift;
				})
				.attr(   "height",   lineHeight - lineMargin*2  )
				.attr(   "ry",      (lineHeight - lineMargin)/4 )
				.attr(   "rx",      (lineHeight - lineMargin)/4 )
				.style(  "fill",    function(d,i) { return shadeColor2( "#DDDDDD", -i * opacityShift ) } );

	// - Update the left and right edges of the rect
	weekGraphSVG.selectAll( ".weekgraphDayTempBar" )
				.attr(   "x",     function(d,i) { 
					return tempXScale( d.temperatureMin );
				})
				.attr(   "width", function(d,i) { 
					return tempXScale( d.temperatureMax ) - tempXScale( d.temperatureMin );
				});


	// Draw temperature labels on the left and right side of each bar
	// - Create min labels
	weekGraphSVG.selectAll( ".weekgraphTempTextMin" )
				.data( filteredDays )
				.enter()
				.append( "text" )
				.attr(   "class", "weekgraphTempTextMin weekgraphTempText" )
				.attr(   "text-anchor", "end")
				.style(  "fill",    function(d,i) { return shadeColor2( "#DDDDDD", -i * opacityShift ) } );

	// - Update all min labels
	weekGraphSVG.selectAll( ".weekgraphTempTextMin" )
				.text( function(d) {
					return roundTemp( d.temperatureMin ).toString() + "\u00B0";				// Unicode for &deg;
				})
				.attr( "x", function(d,i) {
					return tempXScale( d.temperatureMin ) - barTextMargin;
				})
				.attr( "y", function(d,i) {
					return i * lineHeight + lineHeight + marginT + barTextShift;
				});

	// - Create max labels
	weekGraphSVG.selectAll( ".weekgraphTempTextMax" )
				.data( filteredDays )
				.enter()
				.append( "text" )
				.attr(   "class", "weekgraphTempTextMax weekgraphTempText" )
				.attr(   "text-anchor", "begin")
				.style(  "fill",    function(d,i) { return shadeColor2( "#DDDDDD", -i * opacityShift ) } );

	// - Update all max labels
	weekGraphSVG.selectAll( ".weekgraphTempTextMax" )
				.text( function(d) {
					return roundTemp( d.temperatureMax ).toString() + "\u00B0";				// Unicode for &deg;
				})
				.attr( "x", function(d,i) {
					return tempXScale( d.temperatureMax ) + barTextMargin;
				})
				.attr( "y", function(d,i) {
					return i * lineHeight + lineHeight + marginT + barTextShift;
				});

	function updateWeatherForcast_UpdateWeeklyGraph_HotColdLine( temp, className, icon, offset ) {	// Subfunction of updateWeatherForcast_UpdateWeeklyGraph() for access to tempXScale
		// Draw a line across the graph and place an icon at a given temperature
		var tempPoint = tempXScale( temp );

		// Add/update the line
		if( weekGraphSVG.select( ".tempGraphHotColdLine ." + className ).empty() ) {
			weekGraphSVG.append( "line").attr("class", "tempGraphHotColdLine " + className );
		}

		weekGraphSVG.select( ".tempGraphHotColdLine." + className).attr("x1", tempPoint ).attr("y1", marginT + lineMargin + barShift )
																  .attr("x2", tempPoint ).attr("y2", h - marginB );

/*			// Add/update the icon -- these don't really work well here
		if( weekGraphSVG.select( ".tempGraphHotColdLine.lineIcon." + className ).empty() ) {
			weekGraphSVG.append( "text").attr("class", "tempGraphHotColdLine lineIcon wi " + className )
										.text( icon )
										.attr( "text-anchor", "middle" );
		}

		weekGraphSVG.select( ".tempGraphHotColdLine.lineIcon." + className ).attr("y", h - 14 + offset).attr("x", tempPoint);
*/
	}
}

// Draw the weather graph.  This is similar to the graph drawn in the Weather Underground iOS app,
//  with the next 24 hours temperature curve overlaid over the chance of rain.  We take advantage
//  of Dark Sky's confidence to draw a wider or thinner rain line.
function updateWeatherForecast_DrawGraph( dailyData, hourlyData ) {
	// Create the SVG, if needed.  We just reuse the SVG instead of creating a new one each time,
	//  and animate the values within it
	var marginL  =  5;
	var marginR  =  5;
	var marginT  = 15;
	var marginB  =  5;
	var w = parseInt( $('.tempgraph').css('width') );
	var h = parseInt( $('.tempgraph').css('height') );

	tempGraphSVG = d3.select( "#tempGraphSVG" );
	if( tempGraphSVG.empty() ) {
		// Set up the SVG
		tempGraphSVG = d3.select(".tempgraph").append("svg")
						 .attr('width',  w)
						 .attr('height', h)
						 .attr('id',     "tempGraphSVG" );

		// Draw a line at the top of the graph so that we know where 100% chance of rain is
		tempGraphSVG.append( "line").attr("x1", marginL ).attr("y1", 0 )
									.attr("x2", w       ).attr("y2", 0 )
									.attr("class", "tempGraphTopEdgeLine");
	}

	// Filter the data down to just the requested number of hours
	var filteredHourlyData = hourlyData.filter( function(d, i) { return (i < tempGraphRangeOfHours-1); });

	// Set up the time scale
	var timeXScale = d3.time.scale().domain([ d3.min( filteredHourlyData, function(d) { return d.time } ),
											  d3.max( filteredHourlyData, function(d) { return d.time } ) ])
									.range([ marginL, w - marginR ]);


	// Draw each graph into the SVG
	updateWeatherForecast_DrawGraph_Sunlight(     dailyData );
	updateWeatherForecast_DrawGraph_Rain(         filteredHourlyData );
	updateWeatherForecast_DrawGraph_Accumulation( filteredHourlyData );
	updateWeatherForecast_DrawGraph_Temp(         filteredHourlyData );
	updateWeatherForecast_DrawGraph_HourMarkers(  filteredHourlyData );

	// - Graph Drawing Functions - 
	function updateWeatherForecast_DrawGraph_Sunlight( hourlyData ) {
		// Draw two boxes representing daylight over the next 48 hours.
		// The boxes span the time from sunrise to sunset
		// - Create the boxes, if needed
		if( tempGraphSVG.select( ".tempgraphDaylight" ).empty() ) {
			for( var i=0; i < 3; i++ ) {
				tempGraphSVG.append( "rect" )
							.attr( "class", "tempgraphDaylight" )
							.attr( "y",      1   )
							.attr( "height", h-1 );
			}
		}
		
		// - Update the x and width of the boxes
		tempGraphSVG.selectAll( ".tempgraphDaylight" )
					.attr( "x", function(d,i) {
						return Math.max( marginL, timeXScale( dailyData[i].sunriseTime ) );
					})
					.attr( "width", function(d,i) {
						var sunrise = timeXScale( dailyData[i].sunriseTime );

						if( marginL > sunrise )
							sunrise = (sunrise > 0) ? marginL - sunrise : marginL;

						var sunset = Math.max( marginL, timeXScale( dailyData[i].sunsetTime ) );
						return sunset - sunrise;
					})
					.attr( "opacity", function(d,i) {
						if( (timeXScale( dailyData[i].sunsetTime  ) <     marginL) ||
							(timeXScale( dailyData[i].sunriseTime ) > w - marginR) )
							return 0.0;
						else
							return 0.15;
					});
	}

	function updateWeatherForecast_DrawGraph_Rain( hourlyData ) {
		// Draw a filled line graph for the rain as a propability from 0 to 100% over time.
		var rainYScale = d3.scale.linear().domain([ 0.0, 1.0 ])
										  .range([ h, 0 ]);

		// Draw a filled area under the line
		var rainAreaValue = d3.svg.area()
							  .x(  function(d){ return timeXScale( d.time ); })
							  .y0( h )
							  .y1( function(d){ return rainYScale( d.precipProbability ); });

		// - Create the path, if needed
		if( tempGraphSVG.select( ".tempgraphRainArea" ).empty() ) {
			tempGraphSVG.append( "path" )
						.attr( "class", "tempgraphRainArea" );
		}
		
		// - Update the elements in the path
		var s = tempGraphSVG.select( ".tempgraphRainArea" )
		s.datum( hourlyData )
		s.attr( "d", rainAreaValue );

		// Draw a line between the data points
		var rainLineValue = d3.svg.line()
							  .x( function(d){ return timeXScale( d.time ); })
							  .y( function(d){ return rainYScale( d.precipProbability ); });

		// - Create the path, if needed
		if( tempGraphSVG.select( ".tempgraphRainPath" ).empty() ) {
			tempGraphSVG.append( "path" )
						.attr( "class", "tempgraphRainPath" );
		}

		// - Update the elements in the path
		tempGraphSVG.select( ".tempgraphRainPath" )
					.attr( "d", rainLineValue( hourlyData ));
	}

	function updateWeatherForecast_DrawGraph_Accumulation( hourlyData ) {
		// Draw a filled line graph for the accumulated percipitation in inches, with 3'
		// at the top of the graph.
		var accumYScale = d3.scale.linear().domain([ 0.0, 0.2, 12.0 ])
										   .range([ h, h-10, 0 ]);

		// Draw a filled area under the line
		var accumAreaValue = d3.svg.area()
							   .x(  function(d){ return timeXScale( d.time ); })
							   .y0( h )
							   .y1( function(d){ return accumYScale( d.hasOwnProperty( "precipAccumulation" ) ? d.precipAccumulation : 0.0 ); });
//								   .y1( function(d){ return accumYScale( d.hasOwnProperty( "precipProbability" ) ? d.precipProbability * 12 : 0.0 ); });

		// - Create the path, if needed
		if( tempGraphSVG.select( ".tempgraphAccumArea" ).empty() ) {
			tempGraphSVG.append( "path" )
						.attr(  "class", "tempgraphAccumArea" );
		}
		
		// - Update the elements in the path
		var s = tempGraphSVG.select( ".tempgraphAccumArea" )
		s.datum( hourlyData )
		s.attr( "d", accumAreaValue );

		// Draw a line between the data points
		var accumLineValue = d3.svg.line()
							   .x( function(d){ return timeXScale( d.time ); })
							   .y( function(d){ return accumYScale( d.hasOwnProperty( "precipAccumulation" ) ? d.precipAccumulation : 0.0 ); });
//								   .y( function(d){ return accumYScale( d.hasOwnProperty( "precipProbability" ) ? d.precipProbability * 12 : 0.0 ); });

		// - Create the path, if needed
		if( tempGraphSVG.select( ".tempgraphAccumPath" ).empty() ) {
			tempGraphSVG.append( "path" )
						.attr(  "class", "tempgraphAccumPath" );
		}

		// - Update the elements in the path
		tempGraphSVG.select( ".tempgraphAccumPath" )
					.attr( "d", accumLineValue( hourlyData ));

		// Draw a label for the high point in inches
		var maxAccum = 0.0;
		var maxTime   = 0.0;
		for( var i in hourlyData ) {
			if( hourlyData[i].precipAccumulation >maxAccum ) {
//				if( hourlyData[i].precipProbability >maxAccum ) {
				maxTime  = hourlyData[i].time;
				maxAccum = hourlyData[i].precipAccumulation;
//					maxAccum = hourlyData[i].precipProbability * 12.0;
			}
		}
		
		// - Create the text label, if needed
		if( tempGraphSVG.select( ".tempgraphAccumText" ).empty() ) {
			tempGraphSVG.append( "text" )
						.attr(   "class",              "tempgraphAccumText" )
						.attr(   "text-anchor",        "middle")
						.attr(   "alignment-baseline", "hanging")
		}

		// - Update the label
		tempGraphSVG.selectAll( ".tempgraphAccumText" )
					.text(  Math.round( maxAccum ).toString() + '"' )
					.attr(  "x", Math.max( 10, Math.min( w-10, timeXScale( maxTime ) ) ) )		// Constrained so the centered text fits the bounds of the graph
					.attr(  "y", Math.max( 15, accumYScale( maxAccum ) ) )						// Adjusted so the top-aligned text doesn't fall off the bototm of the graph
					.style( "fill-opacity", (Math.floor(maxAccum) == 0.0) ? 0.0 : 1.0 );					// Hidden if there is no accumulation
	}

	function updateWeatherForecast_DrawGraph_Temp( hourlyData ) {
		// Create dots for the temp, scaling to limit the min/max temps to the bounds of the view
		//  Note that hourly data includes 48 hous worth, not 24.  We only draw 12 dots to keep
		//  things from getting too cluttered, but graph 24.
		var tempYScale = d3.scale.linear().domain([ d3.min( hourlyData, function(d) { return Math.min( d.temperature, d.apparentTemperature ) } ),
													d3.max( hourlyData, function(d) { return Math.max( d.temperature, d.apparentTemperature ) } ) ])
										  .range([ h-marginB, marginT ]);

		// Draw lines from the apparent "feels like" temperature to the actual temperature
		// - Add rectanges for each line
		tempGraphSVG.selectAll( ".tempgraphFeelsLikeBar" )
					.data( hourlyData.filter( function(d, i) {
						return (i % 2) == 0;													// Every second element
					}) )
					.enter()
					.append( "rect" )
					.attr(   "class", "tempgraphFeelsLikeBar" )
					.attr(   "ry",      2 )
					.attr(   "rx",      2 )
					.attr(   "width",   3 );

		// - Update the top and bottom edges of the rect
		tempGraphSVG.selectAll( ".tempgraphFeelsLikeBar" )
					.attr( "x",     function(d,i) { 
						return timeXScale( d.time ) - 2;
					})
					.attr( "y",  function(d,i) { 
						if( d.temperature < d.apparentTemperature )
							return tempYScale( d.apparentTemperature );
						else
							return tempYScale( d.temperature );
					})
					.attr( "height",  function(d,i) {
						if( d.temperature < d.apparentTemperature )
							return tempYScale( d.temperature ) - tempYScale( d.apparentTemperature );
						else
							return tempYScale( d.apparentTemperature ) - tempYScale( d.temperature );
					});

		// Draw a line between the dots
		var tempLineValue = d3.svg.line()
							  .x( function(d){ return timeXScale( d.time ); })
							  .y( function(d){ return tempYScale( d.temperature ); });

		// - Create the path, if needed
		if( tempGraphSVG.select( ".tempgraphTempPath" ).empty() ) {
			tempGraphSVG.append( "path" )
						.attr( "class", "tempgraphTempPath" );
		}

		// - Update the elements in the path
		tempGraphSVG.select( ".tempgraphTempPath" )
					.attr( "d", tempLineValue( hourlyData ));

		// Draw the dots
		// - Add new dots
		tempGraphSVG.selectAll( ".tempgraphTempMark" )
					.data( hourlyData.filter( function(d, i) {
						return (i % 2) == 0;													// Every second element
					}) )
					.enter()
					.append( "circle" )
					.attr( "class", "tempgraphTempMark" )
					.attr( "r", 3 );

		// - Update all dots
		tempGraphSVG.selectAll( ".tempgraphTempMark" )
					.attr( "cx", function(d) {
						return timeXScale( d.time );
					})
					.attr( "cy", function(d) {
						return tempYScale( d.temperature );
					});


		// Draw text for the temperature
		// - Add new text
		tempGraphSVG.selectAll( ".tempgraphTempText" )
					.data( hourlyData.filter( function(d, i) {
						return (i % 4) == 0;													// Every 4th element
					}) )
					.enter()
					.append( "text" )
					.attr( "class", "tempgraphTempText" )
					.attr("text-anchor", "middle")

		// - Update all text
		tempGraphSVG.selectAll( ".tempgraphTempText" )
					.text( function(d) {
						return roundTemp( d.temperature ).toString() + "\u00B0";				// Unicode for &deg;
					})
					.attr( "x", function(d) {
						return timeXScale( d.time ) + 2;
					})
					.attr( "y", function(d) {
						return tempYScale( d.temperature ) - 5;
					});

		// Add the freezing and hot lines
		updateWeatherForecast_DrawGraph_HotColdLine( 32, "freezeLine", "\uf076",  0 )			// f076 is wi-snowflake-cold
		updateWeatherForecast_DrawGraph_HotColdLine( 80, "hotLine",    "\uf072", -4 )			// f076 is wi-hot

		function updateWeatherForecast_DrawGraph_HotColdLine( temp, className, icon, offset ) {	// Subfunction of updateWeatherForecast_DrawGraph_Temp() for access to tempYScale
			// Draw a line across the graph and place an icon at a given temperature
			var tempPoint = tempYScale( temp );

			// Add/update the line
			if( tempGraphSVG.select( ".tempGraphHotColdLine ." + className ).empty() ) {
				tempGraphSVG.append( "line").attr("class", "tempGraphHotColdLine " + className );
			}

			tempGraphSVG.select( ".tempGraphHotColdLine." + className).attr("x1", marginL ).attr("y1", tempPoint )
																	  .attr("x2", w       ).attr("y2", tempPoint );

			// Add/update the icon
			if( tempGraphSVG.select( ".tempGraphHotColdLine.lineIcon." + className ).empty() ) {
				tempGraphSVG.append( "text").attr("class", "tempGraphHotColdLine lineIcon wi " + className )
											.text( icon );
			}

			tempGraphSVG.select( ".tempGraphHotColdLine.lineIcon." + className ).attr("x", w - 14 + offset).attr("y", tempPoint + 5);
		}
	}

	function updateWeatherForecast_DrawGraph_HourMarkers( hourlyData ) {
		// Draw markers at 6 AM, noon, 6 PM and midnight.  We draw n+1, since the first
		//  or last one may be off the end of the graph, and thus only n will be drawn.
		var ticks = (tempGraphRangeOfHours / 6 )+ 1;

		if( tempGraphSVG.selectAll( ".tempGraphHourMarker" ).empty() ) {
			for( i=0; i < ticks; i++ )
				tempGraphSVG.append("line").attr("class", "tempGraphHourMarker");
		}

		var startMoment = moment.unix( hourlyData[0].time );
		startMoment.add( 6 - (startMoment.hours() % 6), "hours" );

		var startUnix = startMoment.unix();
		var sixHours  = 6 * 60 * 60;
		tempGraphSVG.selectAll( ".tempGraphHourMarker")
					.attr("x1", function(d,i) { 
						return timeXScale( startUnix + i * sixHours );
					})
					.attr("x2", function(d,i) { 
						return timeXScale( startUnix + i * sixHours );
					})
					.attr("y1", 0 )
					.attr("y1", h );

		// Draw sideways text with the hour for each marker
		if( tempGraphSVG.selectAll( ".tempGraphHourMarkerText" ).empty() ) {
			for( i=0; i < ticks; i++ )
				tempGraphSVG.append("text").attr("class", "tempGraphHourMarkerText");
		}

		tempGraphSVG.selectAll( ".tempGraphHourMarkerText" )
					.text( function(d,i) {
						return moment.unix( startUnix  + i * sixHours).format( clock12Hour ? "h a" : "H" );
					})
					.attr( "transform", function(d,i) {
						return "translate(" + timeXScale( startUnix + i * sixHours ) + ",2)" +		// Tanslate...
							   "rotate(90)" +														// ...then rotate...
							   "translate(0,-2)";													// ...then translate again.
					});

	}
}


// Update the background image based on curWeatherIcon
//  Implementation inspired by http://stackoverflow.com/questions/20255903/change-the-body-background-image-with-fade-effect-in-jquery
function updateBackground()
{
	if( curWeatherIcon in weatherBGImages ) {
		var bgImages = weatherBGImages[curWeatherIcon];
		if( bgImages.length > 0 ) {
			var index = Math.floor(Math.random() * 10) % bgImages.length;

			$('body').css('backgroundImage', function () {
				return 'url(' + bgImages[index] + ')';
			});

		}
	}

	setTimeout( updateBackground, weatherVGCycleInterval * 1000 );
}

updateBackground();

