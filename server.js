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

function calculateMobilePosition(deviceAddress) {
  const signals = bleData[deviceAddress].rssi;

  console.log(`Received signals for ${deviceAddress}:`, signals);

  // Check if there are valid signals
  if (signals.length === 0) {
    // No signals, set position to null
    bleData[deviceAddress].position = null;
    return;
  }

  // Calculate total RSSI
  const totalRssi = signals.reduce((acc, signal) => acc + Math.abs(parseInt(signal.rssi, 10)), 0);

  // Check if totalRssi is zero
  if (totalRssi === 0) {
    bleData[deviceAddress].position = null;
    console.log(`Total RSSI is zero for ${deviceAddress}. Position set to null.`);
    return;
  }

  let weightedX = 0;
  let weightedY = 0;

  signals.forEach((signal) => {
    const stationaryPosition = stationaryDevices[signal.esp32Address];
    if (!stationaryPosition) {
      console.log(`Stationary position not found for ESP32 address: ${signal.esp32Address}`);
      return;
    }

    console.log(`Processing signal:`, signal);
    console.log(`Stationary position:`, stationaryPosition);

    if (stationaryPosition.x === undefined || stationaryPosition.y === undefined) {
      console.log(`Invalid coordinates for ESP32 address: ${signal.esp32Address}`);
      return;
    }

    const weight = Math.abs(parseInt(signal.rssi, 10)) / totalRssi;
    console.log(`Weight for signal ${signal.rssi} from ${signal.esp32Address}:`, weight);
    weightedX += weight * stationaryPosition.x;
    weightedY += weight * stationaryPosition.y;
  });

  // Update the mobile ESP32 position
  bleData[deviceAddress].position = { x: weightedX, y: weightedY };
  bleData[deviceAddress].lastUpdateTime = Date.now();

  console.log(`Updated position for ${deviceAddress}:`, bleData[deviceAddress].position);

  // Emit the updated mobile position to connected clients (sockets)
  io.emit('updateMobilePositions', { deviceAddress, position: bleData[deviceAddress].position });
}



server.listen(3000, '0.0.0.0', () => {
  console.log('Node.js server is running on port 3000');
});
