const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const WebSocket = require('ws');
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Store BLE signal strength data
const bleData = {};

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.post('/updateLocation', (req, res) => {
  const deviceAddress = req.body.deviceAddress;
  const rssi = req.body.rssi;
  bleData[deviceAddress] = rssi;
  wss.clients.forEach((client) => {
    client.send(JSON.stringify(bleData));
  });
  res.sendStatus(200);
});

wss.on('connection', (ws) => {
  ws.send(JSON.stringify(bleData));
});

server.listen(3000, () => {
  console.log('Node.js server is running on port 3000');
});
