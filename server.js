const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Store BLE signal strength data, positions, and device status
const bleData = {};

// Assign addresses to stationary ESP32 devices and their positions
const stationaryDevices = {
  '3C:E9:0E:84:E7:F8': { x: 50, y: 50 },         // Top-left corner
  'A4:CF:12:16:15:14': { x: 500, y: 50 },      // Top-right corner
  'A4:CF:12:16:1B:A8': { x: 500, y: 450 },    // Bottom-right corner
  '3C:61:05:28:C2:60': { x: 50, y: 450 },      // Bottom-left corner
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
  io.emit('updateCanvas', { stationaryDevices, bleData });
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
  io.emit('updateMobilePositions', bleData);
  console.log('Updated positions:', bleData);
}, 1000); // Update every 1 second

const io = require('socket.io')(server);

io.on('connection', (socket) => {
  console.log('A user connected');

  // Emit the initial data to the connected client
  socket.emit('updateCanvas', { stationaryDevices, bleData });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});
// Trilateration function and helper functions
function trilaterate(positions, distances) {
  // ... (unchanged trilateration function)
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

// Calculate distance from RSSI value
function calculateDistance(rssi) {
  const txPower = -35; // adjusted transmitted power in dBm at 0 meter
  const n = 2.0; // path loss exponent

  // Calculate distance using log-distance path loss model
  const distance = Math.pow(10, ((txPower - parseInt(rssi)) / (10 * n)));

  return distance;
}

// Calculate mobile position
function calculateMobilePosition(deviceAddress) {
  // Trilateration function and helper functions
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

  // Calculate distance from RSSI value
  function calculateDistance(rssi) {
    const txPower = -35; // adjusted transmitted power in dBm at 0 meter
    const n = 2.0; // path loss exponent

    // Calculate distance using log-distance path loss model
    const distance = Math.pow(10, ((txPower - parseInt(rssi)) / (10 * n)));

    return distance;
  }

  const signals = bleData[deviceAddress].rssi;

  console.log(`Received signals for ${deviceAddress}:`, signals);

  // Check if there are valid signals
  if (signals.length === 0) {
    // No signals, set position to null
    bleData[deviceAddress].position = null;
    return;
  }

  // Filter signals from different stationary devices
  const filteredSignals = signals.filter(signal => stationaryDevices[signal.esp32Address]);

  // Check if there are at least 3 valid signals
  if (filteredSignals.length < 3) {
    // Insufficient signals, set position to null
    bleData[deviceAddress].position = null;
    return;
  }

  // Perform trilateration for each set of three signals
  const trilaterationResults = [];

  let minAbsRssi = Infinity; // Initialize to a large value

  for (let i = 0; i < filteredSignals.length - 2; i++) {
    for (let j = i + 1; j < filteredSignals.length - 1; j++) {
      for (let k = j + 1; k < filteredSignals.length; k++) {
        const positions = [
          stationaryDevices[filteredSignals[i].esp32Address],
          stationaryDevices[filteredSignals[j].esp32Address],
          stationaryDevices[filteredSignals[k].esp32Address],
        ];
        const distances = [
          calculateDistance(filteredSignals[i].rssi),
          calculateDistance(filteredSignals[j].rssi),
          calculateDistance(filteredSignals[k].rssi),
        ];

        // Perform trilateration
        const result = trilaterate(positions, distances);

        // Check if the result is valid (not NaN)
        if (!isNaN(result.x) && !isNaN(result.y)) {
          trilaterationResults.push(result);

          // Update minAbsRssi and corresponding result
          const absRssiSum = Math.abs(filteredSignals[i].rssi) +
            Math.abs(filteredSignals[j].rssi) +
            Math.abs(filteredSignals[k].rssi);

          if (absRssiSum < minAbsRssi) {
            minAbsRssi = absRssiSum;
            trilaterationResults.minRssiResult = result;
          }
        }
      }
    }
  }

  // Use the result with the minimum absolute RSSI value
  const finalResult = trilaterationResults.minRssiResult;

  // Check if there are valid trilateration results
  if (!finalResult || isNaN(finalResult.x) || isNaN(finalResult.y)) {
    // No valid results, set position to null
    bleData[deviceAddress].position = null;
    return;
  }

  // Update the mobile ESP32 position
  const canvasWidth = 600;
  const canvasHeight = 500;
  bleData[deviceAddress].position = {
    x: Math.max(10, Math.min(canvasWidth - 10, finalResult.x)),
    y: Math.max(10, Math.min(canvasHeight - 10, finalResult.y)),
  };

  bleData[deviceAddress].lastUpdateTime = Date.now();

  console.log(`Updated position for ${deviceAddress}:`, bleData[deviceAddress].position);

  // Emit the updated mobile position to connected clients (sockets)
  io.emit('updateMobilePositions', { deviceAddress, position: bleData[deviceAddress].position });
}

// ... (Rest of your code)



server.listen(3000, '0.0.0.0', () => {
  console.log('Node.js server is running on port 3000');
});
