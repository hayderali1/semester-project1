const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Store BLE signal strength data and historical RSSI signals
const bleData = {};

app.use(cors());  // Allow cross-origin requests
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// New route to serve RSSI signals for tracking
app.get('/rssi', (req, res) => {
  res.json(bleData);
});

// New route to handle data from stationary ESP32
app.post('/update-location', (req, res) => {
  const esp32Address = req.body.esp32_address;
  const deviceAddress = req.body.device;
  const rssi = req.body.rssi;
  console.log('Received data from stationary ESP32:', esp32Address, 'Device:', deviceAddress, 'RSSI:', rssi);

  // Update the historical RSSI signals
  if (!bleData[deviceAddress]) {
    bleData[deviceAddress] = { rssi: [] };
  }

  bleData[deviceAddress].rssi.push({ rssi, esp32Address });

  // Limit the number of stored RSSI signals to avoid excessive data
  if (bleData[deviceAddress].rssi.length > 10) {
    bleData[deviceAddress].rssi.shift(); // Remove the oldest RSSI signal
  }

  // Emit the updated data to connected clients (sockets)
  io.emit('updateCanvas', bleData);

  res.sendStatus(200);
});

// Socket.io setup
const io = require('socket.io')(server);

io.on('connection', (socket) => {
  console.log('A user connected');
  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

server.listen(3000, '0.0.0.0', () => {
  console.log('Node.js server is running on port 3000');
});
