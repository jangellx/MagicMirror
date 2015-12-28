# MagicMirror
My variant of Michael Teeuw's Magic Mirror project website files.  The code here is based off of his source, which is [also on GitHub](https://github.com/MichMich/MagicMirror).

If you're not familiar with the Magic Mirror project, Michael did a brilliant job building and documenting
it on [his site](http://michaelteeuw.nl/tagged/magicmirror).  Even better, he provided detailed instructions
and all of his code so that you can build your own.

I took that challenge and constructed my Magic Mirror for our bathroom using a 32" LCD HDTV and a 31"x24" piece
of two way glass, glueing the glass to the fromt of the case so that there is no border.  I also installed
ShairPort so that Apple AirPlay can be used to play music through the TV's speakers.  A bonus is that the
warm LCD doesn't fog when in the bathroom.  [Details on my build can be found on my website](http://www.tmproductions.com/projects-blog/2015/8/29/magic-mirror).

I tweaked Micheal's code a bit to my peculiarities, adding whole new sections as time went on.  It's been a long time since I've done any Javascript, so some of these changes might be a little crude in their implementation, but they get the job done:
- Display time as a 12 hour clock instead of a 24 hour clock, displaying AM/PM under the seconds (ugly
HTML table hackery there).
- Tweaks to some positioning and margins to better reflect the size and use of my mirror.
- Switched the weather from OpenWeatherMap to Dark Sky's forecast.io.  This requires getting your own
free API key (it's easy) from [developer.forecast.io](developer.forecast.io) and setting it and your lat/lon in js/config.js.
You get 1000 free requests a day, so I have my mirror update once every fifteen minutes instead of
every minute.  Due to cross site scripting protections, using forecast.io also requires the use of
a proxy.php that I modified from the [unofficial forecast.io Javascript library by Ian Tearle](https://github.com/iantearle/forecast.io-javascript-api).
- Added a tempertuare and chance of rain graph with markers for freezing and hot (80 degree F) temperatures and ligter background areas representing daylight.  This was iinspired by the Wearther Underground iOS "Today" widget to provide an overview of the day's weather.
- Replaced the forecast table with a bar graph similar to the one used in the iOS Dark Sky app.  This makes it easy to compare days and find the highs and lows for the week at a glance.
- Added MBTA alerts from the [http://realtime.mbta.com/](MBTA Realtime API).  Thos agaom reqiores getting your own key (easy to do) from the [http://realtime.mbta.com/Portal/Account/Register](MBTA developer site) and setting it and the route you want alerts for in config.js.  Only current alerts are shown, with minor alerts shown with white icons instead of red.  You get 10000 requests a day, so I update every five minutes.  This uses the smae proxy.php as the forecast.io implementation above due to issues I had getting JSONP to work.
- Added holidays via [http://holidayapi.com/](HolidayAPI), augmenting it with filters and custom holidays
(which draw in gold), both of which are set through the config.
- Removed the fractional temperatures.
- Added daily and weekly summary text from forecast.io.
- Added an extra delay to the RSS headlines based on the length of the headline (20ms per letter).
- Color the current time orange -ish between 7:10 AM and 7:20 AM as a warning to get out of the house for the train.
- Added degree symbols to all temperatures.
- Handle AJAX failurse by rearming the timers so that everything continues to update.  The mirror is pretty solid now, even if the site we're pulling data from goes down for a while.

For more information, visit [my site at tmproductions.com](http://www.tmproductions.com/projects-blog/2015/8/29/magic-mirror). For more information on the original that inspired mine, visit [Michael's site](http://michaelteeuw.nl/tagged/magicmirror).


## IMPORTANT INSTALLATION NOTE:
To work around the fact that git wants to commit every single file in the dir, and doesn't have a decent
way to avoid tracking specific previously-comitted files, js/config.js was renamed to js/config-REMOVE-THIS-.js.  Remove the
-REMOVE_THIS- bit after you clone/sync and you should be all set.
