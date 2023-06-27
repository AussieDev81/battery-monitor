const DB_NAME = "BatteryDB";
const DB_VERSION = 1;
const CHART_TITLE = "Battery Voltage Readings";
const CHART_X_AXIS_VALUE_FORMAT = "dd MMM, YY";
const SUFFIX_SHORT = " V";
const SUFFIX_LONG = " Volts";
const CHART_Y_AXIS_VALUE_FORMAT = `#.## ${SUFFIX_SHORT}`;
const CHART_X_AXIS_TITLE = "Timestamp";
const CHART_Y_AXIS_TITLE = "Voltage";
const CHART_CROSSHAIR_COLOR = "#ff00d4";
const CHART_POINT_SIZE = 8;
const CHART_POINT_SHAPE = "circle";
const VOLTAGE_STATE = [
	{
		stateOfCharge: 100,
		range: { high: Infinity, low: 12.5 },
		colorClass: "full",
		icon: "assets/images/battery-4.svg",
	},
	{ stateOfCharge: 90, range: { high: 12.49, low: 12.42 }, colorClass: "full", icon: "assets/images/battery-4.svg" },
	{ stateOfCharge: 80, range: { high: 12.41, low: 12.32 }, colorClass: "ok", icon: "assets/images/battery-3.svg" },
	{ stateOfCharge: 70, range: { high: 12.31, low: 12.2 }, colorClass: "ok", icon: "assets/images/battery-3.svg" },
	{ stateOfCharge: 60, range: { high: 12.19, low: 12.06 }, colorClass: "ok", icon: "assets/images/battery-3.svg" },
	{ stateOfCharge: 50, range: { high: 12.05, low: 11.9 }, colorClass: "ok", icon: "assets/images/battery-3.svg" },
	{ stateOfCharge: 40, range: { high: 11.89, low: 11.75 }, colorClass: "low", icon: "assets/images/battery-2.svg" },
	{ stateOfCharge: 30, range: { high: 11.74, low: 11.58 }, colorClass: "low", icon: "assets/images/battery-2.svg" },
	{
		stateOfCharge: 20,
		range: { high: 11.57, low: 11.31 },
		colorClass: "discharged",
		icon: "assets/images/battery-1.svg",
	},
	{
		stateOfCharge: 10,
		range: { high: 11.3, low: 10.5 },
		colorClass: "discharged",
		icon: "assets/images/battery-1.svg",
	},
	{
		stateOfCharge: 0,
		range: { high: 10.49, low: 0 },
		colorClass: "discharged",
		icon: "assets/images/battery-1.svg",
	},
];
const BATTERY_ICON = [
	{ full: "assets/images/battery-4.svg" },
	{ ok: "assets/images/battery-3.svg" },
	{ low: "assets/images/battery-2.svg" },
	{ discharged: "assets/images/battery-1.svg" },
];

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
	readingStore.createIndex("id", "id", { unique: false });
	readingStore.createIndex("timestamp", "timestamp", { unique: false });
};

//Database functions
request.onsuccess = function (event) {
	let db = event.target.result;
	updateUI();

	//================ BATTERIES ================ //
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

	document.getElementById("add-battery-form").addEventListener("submit", (event) => {
		event.preventDefault();
		const form = event.target;
		const isDeepCycle = form["deepCycle"].checked;

		let battery = {
			brand: form["brand"].value,
			deepCycle: isDeepCycle,
			ampHours: Number(isDeepCycle ? form["ampHours"].value : 0),
			cca: Number(isDeepCycle ? 0 : form["cca"].value),
			nickname: form["nickname"].value,
			color: form["color"].value,
		};
		addBattery(battery);
		form.reset();
		updateUI();
	});

	document.getElementById("edit-battery-form").addEventListener("submit", (event) => {
		event.preventDefault();
		const form = event.target;
		let isDeepCycle = form["edit-deepCycle"].checked;

		let battery = {
			id: Number(form["edit-id"].value),
			brand: form["edit-brand"].value,
			deepCycle: isDeepCycle,
			ampHours: Number(isDeepCycle ? form["edit-ampHours"].value : 0),
			cca: Number(isDeepCycle ? 0 : form["edit-cca"].value),
			nickname: form["edit-nickname"].value,
			color: form["edit-color"].value,
		};

		updateBattery(battery);
		form.reset();
		updateUI();
	});

	//================ VOLTAGE READINGS ================ //

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

	function updateVoltageReading(voltageReading) {
		let transaction = db.transaction(["readings"], "readwrite");
		let store = transaction.objectStore("readings");
		let request = store.put(voltageReading);

		request.onsuccess = function () {
			console.log("Voltage reading updated successfully");
			updateUI();
		};

		request.onerror = function (event) {
			console.error("Error updating voltage reading", event.target.error);
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

	function deleteReadingById(readingId) {
		let transaction = db.transaction(["readings"], "readwrite");
		let store = transaction.objectStore("readings");
		let request = store.delete(readingId);

		request.onsuccess = function (event) {
			console.log("Reading deleted successfully");
			updateUI();
		};

		request.onerror = function (event) {
			console.error("Error deleting reading", event.target.error);
		};
	}

	document.getElementById("add-reading-form").addEventListener("submit", async (e) => {
		e.preventDefault();
		let batteryIdValue = document.getElementById("edit-id").value;
		const batteryId =
			batteryIdValue === ""
				? await getAllBatteries().then((batteries) => {
						return batteries[0].id;
				  })
				: Number(batteryIdValue);

		const voltage = parseFloat(e.target["volts"].value).toFixed(2);

		if (!isNaN(voltage)) {
			addVoltageReading({ batteryId: batteryId, timestamp: new Date(), voltage: voltage });
		}
		e.target.reset();
	});

	//================ UI RENDERING ================ //

	function updateUI() {
		getStarted();
		renderVoltageReadingChart();
		renderBatteryCards();
		renderBatteryReadingsTable();
	}

	/**
	 * Displays an alert prompting the user to add a battery if there are no batteries, and
	 * displays an alert prompting the user to add a reading if there is one or more batteries
	 * on record but zero (in total) voltage readings
	 */
	async function getStarted() {
		const batteries = await getAllBatteries();
		const readings = await getAllVoltageReadings();
		const addBatteryAlert = document.getElementById("add-battery-alert");
		const addReadingAlert = document.getElementById("add-reading-alert");
		addBatteryAlert.style.display = "none";
		addReadingAlert.style.display = "none";

		if (batteries.length === 0) {
			//Prompt the user to add a battery
			addBatteryAlert.style.display = "block";
			addBatteryAlert.classList.add("show");
		}
		if (batteries.length > 0 && readings.length === 0) {
			//Prompt the user to add a reading
			addReadingAlert.style.display = "block";
			addReadingAlert.classList.add("show");
		}
	}

	/**
	 * Constructs and renders the battery voltage reading chart on the page
	 */
	async function renderVoltageReadingChart() {
		const themeToggle = document.documentElement.getAttribute("data-bs-theme") === "dark" ? "#FFFFFF" : "#212529";

		// Get the batteries and readings from the database
		let batteries = await getAllBatteries();
		let voltageReadings = await getAllVoltageReadings();

		// Load the Google Charts library
		google.charts.load("current", { packages: ["corechart"] });

		// Set a callback function to execute when the library is loaded
		google.charts.setOnLoadCallback(drawChart);

		// Define the callback function to create and render the chart
		function drawChart() {
			// Create the data table
			let data = new google.visualization.DataTable();
			data.addColumn("datetime", "Time");
			batteries.forEach((battery) => {
				data.addColumn("number", battery.nickname);
			});

			// Populate the data table with voltage readings
			let rows = [];
			voltageReadings.sort((a, b) => a.batteryId - b.batteryId);
			voltageReadings.forEach((reading) => {
				let row = [new Date(reading.timestamp)];
				batteries.forEach((battery) => {
					if (reading.batteryId == battery.id) {
						row.push(parseFloat(reading.voltage));
					} else {
						row.push(null);
					}
				});
				rows.push(row);
			});
			data.addRows(rows);

			// Set chart options
			let options = {
				theme: "material",
				backgroundColor: { fill: "transparent" },
				pointSize: CHART_POINT_SIZE,
				pointShape: CHART_POINT_SHAPE,
				curveType: "function",
				crosshair: { trigger: "both", color: CHART_CROSSHAIR_COLOR },
				legend: {
					position: "bottom",
					textStyle: {
						color: themeToggle,
					},
				},
				hAxis: {
					title: CHART_X_AXIS_TITLE,
					format: CHART_X_AXIS_VALUE_FORMAT,
					titleTextStyle: {
						color: themeToggle,
					},
					textStyle: {
						color: themeToggle,
					},
				},
				vAxis: {
					title: CHART_Y_AXIS_TITLE,
					format: CHART_Y_AXIS_VALUE_FORMAT,
					titleTextStyle: {
						color: themeToggle,
					},
					textStyle: {
						color: themeToggle,
					},
				},
				titleTextStyle: {
					bold: true,
					fontSize: 25,
					italic: true,
					color: themeToggle,
				},
				colors: batteries.map((battery) => battery.color),
				lineWidth: 3,
				explorer: { axis: "horizontal", keepInBounds: true },
			};

			// Create the chart
			let chart = new google.visualization.LineChart(document.getElementById("chartContainer"));

			// Render the chart
			chart.draw(data, options);
		}
	}

	/**
	 * Constructs and builds bootstrap cards for each battery, showing it's name, most recent voltage state, and rated
	 * amp hours or CCA rating
	 */
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

			// Create a close button and add it to the card header
			let deleteButton = document.createElement("button");
			deleteButton.title = "Delete";
			deleteButton.className = "btn-close";

			// Assign the delete button a click event listener
			deleteButton.addEventListener("click", () => {
				const deleteConfirmed = confirm(
					`Are you sure you want to delete ${battery.nickname}?\nThis action can't be undone`
				);
				if (deleteConfirmed) {
					deleteBattery(battery.id);
				}
			});

			card.appendChild(deleteButton);

			// Give the card a header
			let cardHeader = document.createElement("div");
			cardHeader.className = "card-header";
			// Set the background color and text color
			cardHeader.style.backgroundColor = battery.color;
			cardHeader.style.color = calculateBrightness(cardHeader.style.backgroundColor) > 128 ? "black" : "white";
			cardHeader.style.minHeight = "110px";

			cardHeader.innerHTML += `<h4>${battery.nickname}</h4>`;

			// Invert delete button contrast
			if (calculateBrightness(cardHeader.style.backgroundColor) > 128) {
				deleteButton.style.filter = "none";
				deleteButton.style.color = "black";
			}

			// if (readings.length > 0) {}
			// Add the most recent reading value and charge percentage if there are readings
			// Add the most recent reading value and charge percentage if there are readings
			// if (readings.length > 0) {
			// Add the most recent reading value and charge percentage if there are readings
			if (readings.length > 0) {
				readings.sort((a, b) => b.timestamp - a.timestamp);
				const mostRecentReading = readings[0];

				let span = document.createElement("span");
				span.innerHTML = `
				<div class="row"><small>(${mostRecentReading.voltage}v - ${
					getState(mostRecentReading.voltage).stateOfCharge
				}%)</small></div>`;
				cardHeader.appendChild(span);

				let batteryIcon = document.createElement("img");
				batteryIcon.style.borderRadius = "10px";
				batteryIcon.style.backgroundColor = "#212529";
				batteryIcon.src = getState(mostRecentReading.voltage).icon;
				batteryIcon.title = getState(mostRecentReading.voltage).colorClass;
				batteryIcon.style.cursor = "pointer";
				batteryIcon.width = 44;
				batteryIcon.height = 30;

				span.appendChild(batteryIcon);
			}

			// Define a 'more info' button
			let moreInfoBtn = document.createElement("button");
			moreInfoBtn.className = "btn btn-outline-primary";
			moreInfoBtn.innerHTML = "Edit / Add Reading";
			moreInfoBtn.id = `btn-${battery.id}`;
			moreInfoBtn.setAttribute("data-bs-toggle", "modal");
			moreInfoBtn.setAttribute("data-bs-target", "#edit-battery-modal");
			moreInfoBtn.addEventListener("click", () => {
				showBatteryInfo(battery.id);
			});

			// Add the card body
			let cardBody = document.createElement("div");
			cardBody.className = "card-body";
			let cca = `CCA: ${battery.cca}`;
			let ampHours = `Amp Hours: ${battery.ampHours}`;
			cardBody.innerHTML = `
				<h5 class="card-title">${battery.brand}</h5>
				<p class="card-text">
				${battery.deepCycle ? ampHours : cca} 
				</p>`;
			cardBody.appendChild(moreInfoBtn);

			// Add the header and body to the card
			card.appendChild(cardHeader);
			card.appendChild(cardBody);

			// Add the card to the card box
			cardBox.appendChild(card);
		});
	}

	/**
	 * Constructs and renders a table of all the battery voltage readings to the page.
	 * The table supports searching, sorting, column resizing, and pagination (currently capped at 10 readings per page)
	 */
	async function renderBatteryReadingsTable() {
		const theme = document.documentElement.getAttribute("data-bs-theme");
		//Info: https://gridjs.io/docs

		let batteries = await getAllBatteries();
		let allReadings = await getAllVoltageReadings();
		let tableContainer = document.getElementById("voltage-reading-table-container");
		tableContainer.innerHTML = "";

		let data = [];
		await batteries.map((battery) => {
			let readings = allReadings.filter((r) => r.batteryId == battery.id);
			readings.map((reading) => {
				let readingDate = new Date(reading.timestamp);
				let formattedDate = `${readingDate.toLocaleTimeString()}, ${readingDate.toDateString()}`;
				data.push([
					reading.id,
					battery.nickname,
					formattedDate,
					parseFloat(reading.voltage).toFixed(2),
					battery.deepCycle ? "true" : "false",
				]);
			});
		});

		let readingGrid = new gridjs.Grid({
			columns: [
				{ name: "Id", hidden: true },
				{ name: "Battery" },
				{ name: "Time & Date" },
				{ name: "Reading (Volts)" },
				{ name: "Deep Cycle?" },
				{
					name: "Actions",
					formatter: (_, row) => {
						// Edit button click event
						const editBtn = gridjs.h(
							"button",
							{
								className: "btn action-btn btn-outline-info",
								onClick: () => {
									let readingToUpdate = allReadings.filter((reading) => reading.id === row.cells[0].data).pop();
									const updatedVoltage = prompt(
										`Enter a new voltage (this will replace ${readingToUpdate.voltage} volts)`
									);
									if (updatedVoltage) {
										readingToUpdate.voltage = parseFloat(updatedVoltage).toFixed(2);
										updateVoltageReading(readingToUpdate);
									}
								},
							},
							"Edit"
						);
						// Delete button click event
						const deleteBtn = gridjs.h(
							"button",
							{
								className: "btn action-btn btn-outline-danger",
								onClick: () => {
									const deleteConfirmed = confirm(
										"Are you sure you wish to delete this voltage reading?\nThis action cannot be undone"
									);
									if (deleteConfirmed) {
										deleteReadingById(row.cells[0].data);
									}
								},
							},
							"Delete"
						);
						return gridjs.h("div", { className: "button-container" }, editBtn, deleteBtn);
					},
				},
			],
			data: data,
			className: {
				table: `table table-hover`,
				container: `background-${theme} font-${theme === "dark" ? "light" : "dark"}`,
				th: `background-${theme === "dark" ? "mid" : "light"} font-${theme === "dark" ? "light" : "dark"}`,
				td: `background-${theme === "dark" ? "mid" : "light"} font-${theme === "dark" ? "light" : "dark"}`,
			},
		}).render(tableContainer);

		// Update table config and data
		readingGrid
			.updateConfig({
				sort: true,
				pagination: {
					limit: 10,
				},
				resizable: true,
				search: true,
				data: data,
			})
			.forceRender();
	}

	// Ensure the table theme is updated
	document.getElementById("theme-selection").addEventListener("click", () => {
		updateUI();
	});
};

//================ EVENT LISTENERS ================ //

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

//================ UTILITY METHODS ================ //

// Returns the battery state based on a given voltage reading
function getState(voltage) {
	return VOLTAGE_STATE.filter((state) => voltage <= state.range.high && voltage >= state.range.low)[0];
}

// Function to calculate the brightness value
function calculateBrightness(color) {
	const rgb = color.match(/\d+/g);
	const brightness = Math.sqrt(rgb[0] * rgb[0] * 0.299 + rgb[1] * rgb[1] * 0.587 + rgb[2] * rgb[2] * 0.114);
	return brightness;
}
