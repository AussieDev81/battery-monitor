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
	{ stateOfCharge: 100, range: { high: Infinity, low: 12.5 }, colorClass: "full", icon: "../assets/images/battery-4.svg" },
	{ stateOfCharge: 90, range: { high: 12.49, low: 12.42 }, colorClass: "full", icon: "../assets/images/battery-4.svg" },
	{ stateOfCharge: 80, range: { high: 12.41, low: 12.32 }, colorClass: "ok", icon: "../assets/images/battery-3.svg" },
	{ stateOfCharge: 70, range: { high: 12.31, low: 12.2 }, colorClass: "ok", icon: "../assets/images/battery-3.svg" },
	{ stateOfCharge: 60, range: { high: 12.19, low: 12.06 }, colorClass: "ok", icon: "../assets/images/battery-3.svg" },
	{ stateOfCharge: 50, range: { high: 12.05, low: 11.9 }, colorClass: "ok", icon: "../assets/images/battery-3.svg" },
	{ stateOfCharge: 40, range: { high: 11.89, low: 11.75 }, colorClass: "low", icon: "../assets/images/battery-2.svg" },
	{ stateOfCharge: 30, range: { high: 11.74, low: 11.58 }, colorClass: "low", icon: "../assets/images/battery-2.svg" },
	{ stateOfCharge: 20, range: { high: 11.57, low: 11.31 }, colorClass: "discharged", icon: "../assets/images/battery-1.svg" },
	{ stateOfCharge: 10, range: { high: 11.3, low: 10.5 }, colorClass: "discharged", icon: "../assets/images/battery-1.svg" },
	{ stateOfCharge: 0, range: { high: 10.49, low: 0 }, colorClass: "discharged", icon: "../assets/images/battery-1.svg" },
];
const BATTERY_ICON = [
	{ full: "../assets/images/battery-4.svg" },
	{ ok: "../assets/images/battery-3.svg" },
	{ low: "../assets/images/battery-2.svg" },
	{ discharged: "../assets/images/battery-1.svg" },
];

/*
    TODO:
    - [x] Replace table with battery cards
    - [x] Show the battery state using the given values above (VOLTAGE_STATE)
    - [x] Add an 'Add Battery' icon button
    - [x] Put the 'add battery' form in a modal
    - [x] Display battery details in a modal when a card is clicked
    - [x] Allow the user to edit the battery details
    - [ ] Allow the user to add a battery voltage reading from the battery details card
    - [x] Allow the user to remove a battery
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
	
	let db = event.target.result;

	updateUI();

	// Load seed data
	// loadSeedData();

	function loadSeedData() {
		// Batteries
		addBattery({ brand: "Brand 1", deepCycle: true, ampHours: 110, cca: "", nickname: "Battery 1", color: "#3cc627" });
		addBattery({ brand: "Brand 2", deepCycle: true, ampHours: 110, cca: "", nickname: "Battery 2", color: "#c62a27" });
		addBattery({ brand: "Brand 3", deepCycle: false, ampHours: "", cca: "660", nickname: "Battery 3", color:"#2732c6" });

		//Readings
		addVoltageReading({ batteryId: 1, timestamp: new Date(2023, 0, 1), voltage: 11.2 });
		addVoltageReading({ batteryId: 2, timestamp: new Date(2023, 2, 25), voltage: 12.1 });
		addVoltageReading({ batteryId: 2, timestamp: new Date(2023, 1, 25), voltage: 12.2 });
		addVoltageReading({ batteryId: 2, timestamp: new Date(2023, 0, 25), voltage: 11.7 });
		addVoltageReading({ batteryId: 3, timestamp: new Date(2023, 4, 25), voltage: 13.2 });
	}

	// BATTERIES

	// Runs when a new battery is added via the modal form
	document.getElementById("add-battery-form").addEventListener("submit", (event) => {
		event.preventDefault();
		const form = event.target;
		const isDeepCycle = form["deepCycle"].checked;

		let battery = {
			brand: form["brand"].value,
			deepCycle: isDeepCycle,
			ampHours: isDeepCycle? form["ampHours"].value : 0,
			cca: isDeepCycle? 0 : form["cca"].value,
			nickname: form["nickname"].value,
			color: form["color"].value,
		};
		addBattery(battery);
		form.reset();
		updateUI();
	});

	function addBattery(battery) {
		let transaction = db.transaction(["batteries"], "readwrite");
		let store = transaction.objectStore("batteries");
		let request = store.add(battery);

		request.onsuccess = function (event) {
			console.log("Battery added successfully");
			updateUI();
		};

		request.onerror = function (event) {
			console.error("Error adding battery", event.target.error);
		};
	}

	// Runs when a battery card is clicked
	document.getElementById("edit-battery-form").addEventListener("submit", (event) => {
		event.preventDefault();
		const form = event.target;
		let isDeepCycle = form["edit-deepCycle"].checked;

		let battery = {
			id: Number(form["edit-id"].value),
			brand: form["edit-brand"].value,
			deepCycle: isDeepCycle,
			ampHours: isDeepCycle? parseFloat(form["edit-ampHours"].value) : 0,
			cca: isDeepCycle? 0 : parseFloat(form["edit-cca"].value),
			nickname: form["edit-nickname"].value,
			color: form["edit-color"].value,
		};

		updateBattery(battery);
		form.reset();
		updateUI();
	});

	function updateBattery(battery) {
		let transaction = db.transaction(["batteries"], "readwrite");
		let store = transaction.objectStore("batteries");
		let request = store.put(battery);

		request.onsuccess = function (event) {
			console.log("Battery updated successfully");
			updateUI();
		};

		request.onerror = function (event) {
			console.error("Error updating battery", event.target.error);
		};
	}

	async function showBatteryInfo(batteryId) {
		let battery = await getBatteryById(batteryId);
		let form = document.getElementById("edit-battery-form");
		let modal = document.getElementById("editBatteryModal");
		let ampHourDiv = document.getElementById("edit-ampHoursDiv");
		let ccaDiv = document.getElementById("edit-ccaDiv");

		form["edit-id"].value = battery.id;
		form["edit-brand"].value = battery.brand;
		form["edit-deepCycle"].checked = battery.deepCycle;
		form["edit-ampHours"].value = battery.ampHours;
		form["edit-cca"].value = battery.cca;
		form["edit-nickname"].value = battery.nickname;
		form["edit-color"].value = battery.color;

		if (form["edit-deepCycle"].checked) {
			ampHourDiv.hidden = false;
			ccaDiv.hidden = true;
		} else {
			ampHourDiv.hidden = true;
			ccaDiv.hidden = false;
		}

		// Set a custom modal title for the battery
		modal.innerText = `Edit ${battery.nickname}`;

	}

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

	function getBatteryById(batteryId) {
		return new Promise((resolve, reject) => {
			let transaction = db.transaction(["batteries"], "readonly");
			let store = transaction.objectStore("batteries");
			let request = store.get(batteryId);

			request.onsuccess = function (event) {
				resolve(event.target.result);
			};

			request.onerror = function (event) {
				reject(event.target.result);
			};
		});
	}

	function deleteBattery(batteryId) {
		let transaction = db.transaction(["batteries"], "readwrite");
		let store = transaction.objectStore("batteries");
		let request = store.delete(batteryId);

		request.onsuccess = function (event) {
			deleteReadingsForBatteryId(batteryId);
			console.log("Battery deleted successfully");
			updateUI();
		};

		request.onerror = function (event) {
			console.error("Error deleting battery", event.target.error);
		};
	}

	// VOLTAGE READINGS

	document.getElementById("add-reading-button").addEventListener("click", (event) => {
		const batteryId = Number(document.getElementById("edit-id").value);
		const form = document.getElementById("add-reading-form");
		form.addEventListener("submit", (e) => {
			e.preventDefault();
			const voltage = parseFloat(form["volts"].value);
			if (parseFloat(voltage)) {
				addVoltageReading({ batteryId: batteryId, timestamp: new Date(), voltage: voltage });
			}
		});
	});

	function addVoltageReading(reading) {
		let transaction = db.transaction(["readings"], "readwrite");
		let store = transaction.objectStore("readings");
		let request = store.add(reading);

		request.onsuccess = function (event) {
			console.log("Reading added successfully", reading);
			updateUI();
		};

		request.onerror = function (event) {
			console.error("Error adding reading", event.target.error);
		};
	}

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

	function deleteReadingsForBatteryId(batteryId) {
		console.error(batteryId);
		let transaction = db.transaction(["readings"], "readwrite");
		let store = transaction.objectStore("readings");
		let index = store.index("batteryId");

		const request = index.openCursor();

		request.onsuccess = (event) => {
			const cursor = event.target.result;

			if (cursor) {
				const voltageReading = cursor.value;

				if (voltageReading.batteryId === batteryId) {
					store.delete(cursor.primaryKey);
				}

				cursor.continue();
			}
		};

		transaction.oncomplete = () => {
			console.log("Deletion completed.");
		};

		transaction.onerror = (event) => {
			console.error("Deletion error:", event.target.error);
		};
	}

	// UI RENDERING

	function updateUI() {
		renderVoltageReadingChart();
		renderBatteryCards();
		// renderBatteryTable();
	}

	async function renderVoltageReadingChart() {
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
						.sort((a, b) => a.timestamp - b.timestamp)
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
	
	async function renderBatteryCards() {
		let batteries = await getAllBatteries();
		let allReadings = await getAllVoltageReadings();
		let cardBox = document.getElementById("card-box");
		cardBox.innerHTML = "";
		
		batteries.map((battery) => {
			// Get the readings for just this battery
			const readings = allReadings.filter((reading) => reading.batteryId === battery.id);

			// Create a battery card
			let card = document.createElement("div");
			card.className = "card shadow text-center col-sm-6 col-md-4 col-lg-3 p-0";
			card.style = `max-width: 18rem; border: 3px solid ${battery.color}`;
			card.id = `batteryCard_${battery.id}`;

			// Give the card a header
			let cardHeader = document.createElement("div");
			cardHeader.className = "card-header";

			// Create a close button and add it to the card header
			let deleteButton = document.createElement("button");
			deleteButton.className = "btn-close";
			cardHeader.appendChild(deleteButton);
			cardHeader.innerHTML += `<h4>${battery.nickname}</h4>`;

			// Assign the delete button a click event listener
			deleteButton.addEventListener("click", () => {
				deleteBattery(battery.id);
			});

			// Add the most recent reading value and charge percentage if there are readings
			if (readings) {
				readings.sort((a, b) => b.timestamp - a.timestamp);
				const mostRecentReading = readings[0];

				let span = document.createElement("span");
				span.innerHTML = `
				<div class="row"><small>(${mostRecentReading.voltage}v - ${getState(mostRecentReading.voltage).stateOfCharge}%)</small></div>`;
				cardHeader.appendChild(span);

				// Set the background color and text color
				cardHeader.style.backgroundColor = battery.color;
				cardHeader.style.color = calculateBrightness(cardHeader.style.backgroundColor) > 128 ? "black" : "white";

				let batteryIcon = document.createElement("img");
				batteryIcon.style.background = "white";
				batteryIcon.style.borderRadius = "10px";
				batteryIcon.src = getState(mostRecentReading.voltage).icon;
				batteryIcon.width = 44;
				batteryIcon.height = 30;

				span.appendChild(batteryIcon);
			}

			// Define a 'more info' button
			let moreInfoBtn = document.createElement("button");
			moreInfoBtn.className = "btn btn-outline-primary";
			moreInfoBtn.innerHTML = "Edit";
			moreInfoBtn.id = `btn-${battery.id}`;
			moreInfoBtn.setAttribute("data-bs-toggle", "modal");
			moreInfoBtn.setAttribute("data-bs-target", "#edit-battery-modal");
			moreInfoBtn.addEventListener("click", () => {
				showBatteryInfo(battery.id);
			});

			// Add the card body
			let cardBody = document.createElement("div");
			cardBody.className = "card-body";
			cardBody.innerHTML = `
				<h5 class="card-title">${battery.brand}</h5>
				<p class="card-text">
					CCA: ${battery.cca}<br>
					Amp Hours: ${battery.ampHours}
				</p>`;
			cardBody.appendChild(moreInfoBtn);

			// Add the header and body to the card
			card.appendChild(cardHeader);
			card.appendChild(cardBody);

			// Add the card to the card box
			cardBox.appendChild(card);
		});
	}

	async function renderBatteryTable() {
		let batteries = await getAllBatteries();
		let tableBody = document.getElementById("battery-table");
		let tableContents = "";
		batteries.map((battery) => {
			tableContents += `
			<tr>
				<td>${battery.id}</td>
				<td>${battery.nickname}</td>
				<td>${battery.brand}</td>
				<td>${battery.deepCycle}</td>
				<td>${battery.ampHours}</td>
				<td>${battery.cca}</td>
			</tr>`;
		});

		tableBody.innerHTML = tableContents;
	}
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

// Runs when the deepCycle edit-checkbox is toggled, and displays the edit-ampHour input if checked or the edit-cca input if false
document.getElementById("edit-deepCycle").addEventListener("click", (event) => {
	let ampHourDiv = document.getElementById("edit-ampHoursDiv");
	let ccaDiv = document.getElementById("edit-ccaDiv");

	if (event.target.checked) {
		ampHourDiv.hidden = false;
		ccaDiv.hidden = true;
	} else {
		ampHourDiv.hidden = true;
		ccaDiv.hidden = false;
	}
});

// When the modal is opened, focus on the nickname input field
document.getElementById("add-battery-modal").addEventListener("shown.bs.modal", () => {
	document.getElementById("nickname").focus();
});

// When the edit modal is opened, focus on the edit-nickname field
document.getElementById("edit-battery-modal").addEventListener("shown.bs.modal", () => {
	document.getElementById("edit-nickname").focus();
});

// Returns the battery state based on a given voltage reading
function getState(voltage) {
	return VOLTAGE_STATE.filter((state) => voltage <= state.range.high && voltage >= state.range.low)[0];
}

// Function to calculate the brightness value
function calculateBrightness(color) {
  const rgb = color.match(/\d+/g);
  const brightness = Math.sqrt(
    rgb[0] * rgb[0] * 0.299 +
    rgb[1] * rgb[1] * 0.587 +
    rgb[2] * rgb[2] * 0.114
  );
  return brightness;
}