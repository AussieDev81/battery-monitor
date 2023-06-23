# Battery Voltage Monitor

The purpose of this simple static page is to provide a place for recording battery voltages so that their state can be easily visualized.

Inspiration came from numerous mechanics as well as people throughout the off-roading, camping, and traveling communities, that are trying to monitor 12 volt DC battery systems and how these batteries are losing or gaining charge.   
The need is simply to define a battery with basic descriptive info, and then be able to add and remove voltage readings which can then be viewed and compared clearly on a chart.

This initial version makes use of an indexed browser database to allow data persistence, and although this persistence is limited by device, it can easily be upgraded to include user accounts and a standalone database if required.

<a href="https://www.buymeacoffee.com/aussiedev81" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 40px;width: auto;" ></a>

## Chart
The chart shows all battery voltage readings by timestamp (X axis) and voltage (Y axis) which are colour coded according to the battery colour for easy identification.

## Batteries
The **Batteries** section displays each battery represented by its own card, which displays the following: 
- Name (nickname)
- Most recent voltage reading
- The current charge state by both percentage and visual battery icon
- Descriptive info including brand, amp hours (deep cycle only), and CCA rating (non deep cycle batteries)
- Action buttons for the user to (1) delete the battery, and (2) edit the battery info, and add a new voltage reading 

## Voltage Readings
The **Voltage Readings** table shows all readings for all batteries which can be sorted by any column, and searched for by any keywords.
To minimize clutter the table also includes pagination which is currently set to 10 readings per page.
Voltage readings can be edited (only the voltage, not the timestamp) or deleted right from the table by the included action buttons.

Full credit to this awesome little table goes to [Grid.js ](https://gridjs.io)

___

<!--
<script type="text/javascript" src="https://cdnjs.buymeacoffee.com/1.0.0/button.prod.min.js" data-name="bmc-button" data-slug="aussiedev81" data-color="#FFDD00" data-emoji=""  data-font="Cookie" data-text="Buy me a coffee" data-outline-color="#000000" data-font-color="#000000" data-coffee-color="#ffffff" ></script>
-->