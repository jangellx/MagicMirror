# MagicMirror
My variant of Michael Teeuw's Magic Mirror website

If you're not familiar with the Magic Mirror project, Michael did a brilliant job building and documeting
it on [his site](http://michaelteeuw.nl/tagged/magicmirror).  Even better, he provided detailed instructions
and all of his code so that you can build your own.

I took that challenge and constructed my own bathroom Magic Mirror using a 32" LCD HDTV and a 31"x24" piece
of two way glass, glueing the glass to the fromt of the case so that there is no border.  I also installed
ShairPort so that Apple AirPlay can be used to play music through the TV's speakers.  A bonus is that the
warm LCD doesn't fog when used as a bathroom mirror.

I tweaked Micheal's code a bit to my peculiarities.  It's been a long time since I've done any Javascript,
so some of these changes might be a little crude in their implementation:
- Display time as a 12 hour clock instead of a 24 hour clock, displaying AM/PM under the seconds (ugly
HTML table hackery there).
- Moved the compliment text down a bit so that it doesn't block the viewer's reflection as much.
- Switched the weather from OpenWeatherMap to Dark Sky's forecast.io.  This requires getting your own
free API key (it's easy) from [developer.forecast.io](developer.forecast.io) and setting it and your lat/lon in js/config.js.
You get 1000 free requests a day, so I have my mirror update once every fifteen minutes instead of
every minute.  Due to cross site scripting protections, using forecast.io also requires the use of
a proxy.php that I modified from the [unofficial forecast.io Javascript library by Ian Tearle](https://github.com/iantearle/forecast.io-javascript-api).
- Removed the fractional temperatures.
- Added daily and weekly summary text from forecast.io.
- Added an extra delay to the RSS headlines based on the length of the headline (20ms per letter).
- Color the time render between 7:10 AM and 7:20 AM as a warning to get out of the house.
- Added degree symbols to all temperatures.
- A few other minor aesthetic changes realted to the above, like changing table spacings to look nicer
without the decimals, adjusting margins, etc.

For more information on the project, visit [Michael's site](http://michaelteeuw.nl/tagged/magicmirror).
I'll have my own build information up in the near future as well.