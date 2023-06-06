

const DB_NAME = "BatteryDB";
const DB_VERSION = 1;
const CHART_TITLE = "Battery Voltage Readings";
const CHART_X_AXIS_VALUE_FORMAT = "DD MMM, YY";
const CHART_Y_AXIS_TITLE = "Voltage";
const CHART_Y_AXIS_SUFFIX = " V";
const CHART_LEGEND_CURSOR = "pointer";
const CHART_LEGEND_FONT_SIZE = 16;
const DATA_POINT_X_VALUE_FORMAT = "DDD MMM YYYY h:mm:ss tt";
const DATA_POINT_Y_VALUE_FORMAT = "#0.#0 Volts";
const DATA_POINT_TYPE = "spline";
const VOLTAGE_STATE = [
	{ stateOfCharge: 100, range: { high: 12.6, low: 12.5 } },
	{ stateOfCharge: 90, range: { high: 12.49, low: 12.42 } },
	{ stateOfCharge: 80, range: { high: 12.41, low: 12.32 } },
	{ stateOfCharge: 70, range: { high: 12.31, low: 12.2 } },
	{ stateOfCharge: 60, range: { high: 12.19, low: 12.06 } },
	{ stateOfCharge: 50, range: { high: 12.05, low: 11.9 } },
	{ stateOfCharge: 40, range: { high: 11.89, low: 11.75 } },
	{ stateOfCharge: 30, range: { high: 11.74, low: 11.58 } },
	{ stateOfCharge: 20, range: { high: 11.57, low: 11.31 } },
	{ stateOfCharge: 10, range: { high: 11.3, low: 10.5 } },
	{ stateOfCharge: 0, range: { high: 10.49, low: 0 } },
];



/*
    TODO:
    - [x] Replace table with battery cards
    - [ ] Show the battery state using the given values above (VOLTAGE_STATE)
    - [x] Add an 'Add Battery' icon button
    - [x] Put the 'add battery' form in a modal
    - [ ] Display battery details in a modal when a card is clicked
    - [ ] Allow the user to edit the battery details
    - [ ] Allow the user to add a battery voltage reading from the battery details card
    - [ ] Allow the user to remove a battery
    - [ ] Create a share button and functionality to share battery stats
*/

let chart;

// Open a connection to the IndexedDB database
let request = indexedDB.open(DB_NAME, DB_VERSION);

// Define the object store and its properties
request.onupgradeneeded = function (event) {
	var db = event.target.result;
	var batteryStore = db.createObjectStore("batteries", { keyPath: "id", autoIncrement: true });
	var readingStore = db.createObjectStore("readings", { keyPath: "id", autoIncrement: true });

	// Create indexes for querying
	batteryStore.createIndex("brand", "brand", { unique: false });
	batteryStore.createIndex("deepCycle", "deepCycle", { unique: false });
	batteryStore.createIndex("ampHours", "ampHours", { unique: false });
	batteryStore.createIndex("cca", "cca", { unique: false });
	batteryStore.createIndex("nickname", "nickname", { unique: true });
	batteryStore.createIndex("color", "color", { unique: false });

	readingStore.createIndex("batteryId", "batteryId", { unique: false });
	readingStore.createIndex("timestamp", "timestamp", { unique: false });
};

//Database functions
request.onsuccess = function (event) {
    // Define the database
	let db = event.target.result;
    
    // Initial display of the chart
	createChart();

    // Load the battery cards
    loadBatteryCards();

    // Load the battery table
    // loadBatteryTable();

	// Add a new battery to the database
	function addBattery(battery) {
		let transaction = db.transaction(["batteries"], "readwrite");
		let store = transaction.objectStore("batteries");
		let request = store.add(battery);

		request.onsuccess = function (event) {
			console.log("Battery added successfully");
			createChart();
		};

		request.onerror = function (event) {
			console.error("Error adding battery", event.target.error);
		};

	}

	// Add a new battery voltage reading to the database
	function addVoltageReading(reading) {
		let transaction = db.transaction(["readings"], "readwrite");
		let store = transaction.objectStore("readings");
		let request = store.add(reading);

		request.onsuccess = function (event) {
			console.log("Reading added successfully");
			createChart();
		};

		request.onerror = function (event) {
			console.error("Error adding reading", event.target.error);
		};

	}

	// Get a list of all batteries
	function getAllBatteries() {
		return new Promise((resolve, reject) => {
			let transaction = db.transaction(["batteries"], "readonly");
			let store = transaction.objectStore("batteries");
			let request = store.getAll();

			request.onsuccess = function (event) {
				resolve(event.target.result);
			};

			request.onerror = function (event) {
				reject(event.target.result);
			};
		});
	}

    // Get a list of all voltage readings
	function getAllVoltageReadings() {
		return new Promise((resolve, reject) => {
			let transaction = db.transaction(["readings"], "readonly");
			let store = transaction.objectStore("readings");
			let request = store.getAll();

			request.onsuccess = function (event) {
				resolve(event.target.result);
			};

			request.onerror = function (event) {
				reject(event.target.result);
			};
		});
	}

	// Query all readings for a specific battery
	function getReadingsByBatteryId(batteryId) {
		return new Promise((resolve, reject) => {
			let transaction = db.transaction(["readings"], "readonly");
			let store = transaction.objectStore("readings");
			let index = store.index("batteryId");
			let request = index.getAll(batteryId);

			request.onsuccess = function (event) {
				resolve(event.target.result);
			};

			request.onerror = function (event) {
				console.error("Error retrieving readings", event.target.error);
				reject(event.target.result);
			};
		});
	}

    //Create and render the chart
	async function createChart() {
		// Info: https://canvasjs.com/docs/charts/basics-of-creating-html5-chart/

		// Get the batteries and readings from the database
		let batteries = await getAllBatteries();
		let voltageReadings = await getAllVoltageReadings();

		// Define and create the chart
		chart = new CanvasJS.Chart("chartContainer", {
			animationEnabled: true,
			title: {
				text: CHART_TITLE,
			},
			axisX: {
				valueFormatString: CHART_X_AXIS_VALUE_FORMAT,
			},
			axisY: {
				title: CHART_Y_AXIS_TITLE,
				suffix: CHART_Y_AXIS_SUFFIX,
			},
			legend: {
				cursor: CHART_LEGEND_CURSOR,
				fontSize: CHART_LEGEND_FONT_SIZE,
				itemclick: toggleDataSeries,
			},
			toolTip: {
				shared: true,
			},
			data: batteries.map((battery) => {
				return {
					name: battery.nickname,
                    color: battery.color,
					type: DATA_POINT_TYPE,
					xValueFormatString: DATA_POINT_X_VALUE_FORMAT,
					yValueFormatString: DATA_POINT_Y_VALUE_FORMAT,
					showInLegend: true,
					dataPoints: voltageReadings
						.filter((reading) => reading.batteryId == battery.id)
						.map((reading) => {
							return {
								x: reading.timestamp,
								y: reading.voltage,
							};
						}),
				};
			}),
		});
		chart.render();

		//Toggle battery visibility
		function toggleDataSeries(e) {
			if (typeof e.dataSeries.visible === "undefined" || e.dataSeries.visible) {
				e.dataSeries.visible = false;
			} else {
				e.dataSeries.visible = true;
			}
			chart.render();
		}
	}

    // Loads battery info into the battery table
    async function loadBatteryTable() {
        let batteries = await getAllBatteries();
        let tableBody = document.getElementById("battery-table");
        let tableContents = "";
        batteries.map(battery => {
            tableContents += `
            <tr>
                <td>${battery.id}</td>
                <td>${battery.nickname}</td>
                <td>${battery.brand}</td>
                <td>${battery.deepCycle}</td>
                <td>${battery.ampHours}</td>
                <td>${battery.cca}</td>
            </tr>`
        });
        
        tableBody.innerHTML = tableContents;
    }

    function deleteBattery(batteryId) {
        console.log(`Deleting battery with id "${batteryId}"`);
    }

    // Load battery cards
    async function loadBatteryCards() {
        let batteries = await getAllBatteries();
        let cardBox = document.getElementById("card-box");
        let cardBoxContents = "";
        batteries.map(battery => {
            cardBoxContents += `
            <div class="card shadow text-center col-sm-6 col-md-4 col-lg-3 p-0" style="max-width: 18rem; border: 3px solid ${battery.color}">
                <div class="card-header">${battery.nickname}</div>
                <div class="card-body">
                    <h5 class="card-title">${battery.brand}</h5>
                    <p class="card-text">
                        CCA: ${battery.cca}<br>
                        Amp Hours: ${battery.ampHours}
                    </p>
                    <a href="/battery?id=${battery.id}" class="btn btn-outline-dark">Info</a>
                </div>
            </div>`;

            cardBox.innerHTML = cardBoxContents;
        })
    }

    // Runs when a new battery is added via the page form
    document.getElementById("add-battery-form").addEventListener("submit", (event) => {
        event.preventDefault();

        const form = event.target;
        let battery = {
            brand: form["brand"].value,
            deepCycle: form["deepCycle"].checked,
            ampHours: form["ampHours"].value,
            cca: form["cca"].value,
            nickname: form["nickname"].value,
            color: form["color"].value
        };
        addBattery(battery);
        console.log(battery);
        form.reset();
        loadBatteryCards();
    });

};



// Runs when the deepCycle checkbox is toggled, and displays the ampHour input if checked or the cca input if false 
document.getElementById("deepCycle").addEventListener("click", (event) => {
	let ampHourDiv = document.getElementById("ampHoursDiv");
	let ccaDiv = document.getElementById("ccaDiv");

	if (event.target.checked) {
		ampHourDiv.hidden = false;
		ccaDiv.hidden = true;
	} else {
		ampHourDiv.hidden = true;
		ccaDiv.hidden = false;
	}
});


// When the modal is opened, focus on the nickname input field
const batteryModal = document.getElementById("battery-modal");
const nicknameInput = document.getElementById("nickname");
batteryModal.addEventListener("shown.bs.modal", () => {
    nicknameInput.focus();
});


                