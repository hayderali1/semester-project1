const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const cors = require('cors');
const io = require('socket.io');

const app = express();
const server = http.createServer(app);

// Store BLE signal strength data, positions, and device status
const bleData = {};

// Assign addresses to stationary ESP32 devices and their positions
const stationaryDevices = {
  '3C:E9:0E:84:E7:F8': { x: 50, y: 50 },         // Top-left corner
  'A4:CF:12:16:15:14': { x: 750, y: 50 },      // Top-right corner
  'A4:CF:12:16:1B:A8': { x: 750, y: 550 },    // Bottom-right corner
  '3C:61:05:28:C2:60': { x: 50, y: 550 },      // Bottom-left corner
};

app.use(cors()); // Allow cross-origin requests
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Serve the index.html page
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.get('/rssi', (req, res) => {
  res.json(bleData);
});

app.post('/update-location', (req, res) => {
  const deviceAddress = req.body.device;
  const esp32Address = req.body.esp32_address;
  const rssi = req.body.rssi;
  console.log('Received data for device:', deviceAddress, 'from ESP32:', esp32Address, 'RSSI:', rssi);

  if (!bleData[deviceAddress]) {
    bleData[deviceAddress] = { rssi: [], position: null, lastUpdateTime: Date.now() };
  }

  bleData[deviceAddress].rssi.push({ rssi, esp32Address });
  bleData[deviceAddress].lastUpdateTime = Date.now();

  if (bleData[deviceAddress].rssi.length > 10) {
    bleData[deviceAddress].rssi.shift();
  }

  // Calculate mobile ESP32 position
  calculateMobilePosition(deviceAddress);

  res.sendStatus(200);
});

// Check for inactive devices and remove them
setInterval(() => {
  const currentTime = Date.now();
  for (const deviceAddress in bleData) {
    if (bleData.hasOwnProperty(deviceAddress)) {
      const lastUpdateTime = bleData[deviceAddress].lastUpdateTime;
      if (currentTime - lastUpdateTime > 5000) {
        // Device is considered inactive for more than 5 seconds, remove it
        delete bleData[deviceAddress];
      }
    }
  }
  // Emit the updated data to connected clients (sockets) after removing inactive devices
  socketServer.emit('updateCanvas', { stationaryDevices, bleData });
}, 1000);

// Set an interval to update and emit mobile position continuously
setInterval(() => {
  // Iterate through mobile devices and update their positions
  for (const deviceAddress in bleData) {
    if (bleData.hasOwnProperty(deviceAddress)) {
      calculateMobilePosition(deviceAddress);
    }
  }

  // Emit updated positions to connected clients (sockets)
  socketServer.emit('updateMobilePositions', bleData);
  console.log('Updated positions:', bleData);
}, 1000); // Update every 1 second

const socketServer = io(server);

socketServer.on('connection', (socket) => {
  console.log('A user connected');

  // Emit the initial data to the connected client
  socket.emit('updateCanvas', { stationaryDevices, bleData });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// Trilateration function
function trilaterate(positions, distances) {
  function dot(v1, v2) {
    return v1.x * v2.x + v1.y * v2.y;
  }

  function subtract(a, b) {
    return { x: a.x - b.x, y: a.y - b.y };
  }

  function add(a, b) {
    return { x: a.x + b.x, y: a.y + b.y };
  }

  function multiply(v, scalar) {
    return { x: v.x * scalar, y: v.y * scalar };
  }

  function magnitude(v) {
    return Math.sqrt(v.x * v.x + v.y * v.y);
  }

  function normalize(v) {
    const mag = magnitude(v);
    return { x: v.x / mag, y: v.y / mag };
  }

  const p1 = positions[0];
  const p2 = positions[1];
  const p3 = positions[2];

  const ex = normalize(subtract(p2, p1)); // unit vector from p1 to p2
  const i = dot(ex, subtract(p3, p1));
  const ey = normalize(subtract(subtract(p3, p1), multiply(ex, i))); // unit vector perpendicular to ex
  const d = magnitude(subtract(p2, p1));
  const j = dot(ey, subtract(p3, p1));

  // Barycentric coordinates
  const x = (Math.pow(distances[0], 2) - Math.pow(distances[1], 2) + Math.pow(d, 2)) / (2 * d);
  const y = (Math.pow(distances[0], 2) - Math.pow(distances[2], 2) + Math.pow(i, 2) + Math.pow(j, 2)) / (2 * j) - (i / j) * x;

  // Result coordinates
  const result = add(p1, add(multiply(ex, x), multiply(ey, y)));

  return result;
}
// Calculate mobile position
// Constant for exponential smoothing


// Constant for exponential smoothing
const SMOOTHING_FACTOR = 0.2;
// Calculate mobile position with exponential smoothing
// Global set to keep track of unique signals
const uniqueSignalsSet = new Set();

function calculateMobilePosition(deviceAddress) {
  const signals = bleData[deviceAddress].rssi;

  // console.log(`Received signals for ${deviceAddress}:`, signals);

  // Check if there are valid signals
  if (signals.length < 4) {
    // Not enough signals, set position to null
    bleData[deviceAddress].position = null;
    return;
  }

  // Filter unique signals for each ESP32 address
  const uniqueSignals = [];
  const processedAddresses = new Set();

  for (const signal of signals) {
    const absRssi = Math.abs(parseInt(signal.rssi)); // Take the absolute value of RSSI
    signal.absRssi = absRssi; // Store the absolute RSSI in the signal object

    if (!processedAddresses.has(signal.esp32Address)) {
      uniqueSignals.push(signal);
      processedAddresses.add(signal.esp32Address);
    }

    if (uniqueSignals.length === 4) {
      break; // Break if we have signals from four different addresses
    }
  }

  console.log(`Unique signals for ${deviceAddress}:`, uniqueSignals);

  // Check if we have enough unique signals
  if (uniqueSignals.length < 4) {
    // Not enough unique signals, set position to null
    bleData[deviceAddress].position = null;
    return;
  }

  // Sort unique signals based on absolute RSSI in ascending order
  uniqueSignals.sort((a, b) => a.absRssi - b.absRssi);

  // Perform trilateration with sorted unique signals
  const positions = uniqueSignals.map(signal => stationaryDevices[signal.esp32Address]);
  const distances = uniqueSignals.map(signal => calculateDistance(signal.rssi));

  // Perform trilateration
  const result = trilaterate(positions, distances);

  // Check if the result is valid (not NaN)
  if (isNaN(result.x) || isNaN(result.y)) {
    // Invalid result, set position to null
    bleData[deviceAddress].position = null;
    return;
  }

  // Find the address with the lowest absolute RSSI
  const lowestAbsRssiAddress = uniqueSignals[0].esp32Address;

  // Apply exponential smoothing
  const canvasWidth = 900;
  const canvasHeight = 590;

  const currentPosition = bleData[deviceAddress].position || {
    x: Math.max(10, Math.min(canvasWidth - 10, result.x)),
    y: Math.max(10, Math.min(canvasHeight - 10, result.y)),
  };

  const targetPosition = stationaryDevices[lowestAbsRssiAddress];

  // Move the current position closer to the target position
  const smoothedPosition = {
    x: currentPosition.x + SMOOTHING_FACTOR * (targetPosition.x - currentPosition.x),
    y: currentPosition.y + SMOOTHING_FACTOR * (targetPosition.y - currentPosition.y),
  };

  // Update the mobile ESP32 position, ensuring it stays within the canvas dimensions
  bleData[deviceAddress].position = {
    x: Math.max(10, Math.min(canvasWidth - 10, smoothedPosition.x)),
    y: Math.max(10, Math.min(canvasHeight - 10, smoothedPosition.y)),
  };

  bleData[deviceAddress].lastUpdateTime = Date.now();

  console.log(`Updated position for ${deviceAddress}:`, bleData[deviceAddress].position);

  // Emit the updated mobile position to connected clients (sockets)
  socketServer.emit('updateMobilePositions', { deviceAddress, position: bleData[deviceAddress].position });
}


// Calculate distance from RSSI value
function calculateDistance(rssi) {
  const txPower = -35; // adjusted transmitted power in dBm at 0 meter
  const n = 2.0; // path loss exponent

  // Calculate distance using log-distance path loss model
  const distance = Math.pow(10, ((txPower - parseInt(rssi)) / (10 * n)));

  return distance;
}

server.listen(3000, '0.0.0.0', () => {
  console.log('Node.js server is running on port 3000');
});
