import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { SerialPort } from 'serialport'
import { ReadlineParser } from '@serialport/parser-readline'

const app = express();
app.use(cors());
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.get('/status', (req, res) => {
  res.json({ status: 'Backend is running and listening to Serial Port' });
});

io.on('connection', (socket) => {
  console.log('⚡ Client connected to Socket.IO');
  socket.on('disconnect', () => {
    console.log('❌ Client disconnected');
  });
});

// 🔁 Change this to your Arduino COM port
const port = new SerialPort({
  path: 'COM10',     // Windows example
  baudRate: 9600,
})

const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }))

console.log('🚀 Listening to Arduino...')

parser.on('data', (data) => {
  const cleanData = data.trim();
  console.log('Received:', cleanData)

  // Broadcast terminal output to frontend
  io.emit('serialData', cleanData);

  if (cleanData === 'BUTTON_PRESSED') {
    console.log('🔥 Button was pressed!')
  }
})

port.on('error', (err) => {
  console.error('Serial Port Error:', err.message)
})

const PORT = 5000;
server.listen(PORT, () => {
  console.log(`🚀 Express server listening on port ${PORT}`);
});