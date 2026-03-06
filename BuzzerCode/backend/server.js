import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';
import { io as Client } from 'socket.io-client';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Try to load env from parent if local is missing
dotenv.config({ path: path.join(__dirname, '../.env') });

const ARDUINO_COM_PORT = process.env.ARDUINO_COM_PORT || 'COM10';
const VPS_SOCKET_URL = process.env.VPS_SOCKET_URL || process.env.VPS_URL || 'http://localhost:3001';
const LOCAL_PORT = process.env.PORT || 5000;

const app = express();
app.use(cors());
const server = createServer(app);

// Local Socket.IO Server (for any local frontends connecting directly to the local buzzer PC)
const localIo = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.get('/status', (req, res) => {
  res.json({ status: 'Buzzer backend is running', port: ARDUINO_COM_PORT, vps: VPS_SOCKET_URL });
});

localIo.on('connection', (socket) => {
  console.log('⚡ [Local Socket] Client connected to local buzzer server');
  socket.on('disconnect', () => {
    console.log('❌ [Local Socket] Client disconnected');
  });
});

console.log(`\n================================`);
console.log(`🚨 MATHX BUZZER EXPRESS SERVICE 🚨`);
console.log(`================================`);
console.log(`[1] Targeting VPS URL: ${VPS_SOCKET_URL}`);
console.log(`[2] Targeting Arduino: ${ARDUINO_COM_PORT}`);
console.log(`[3] Local Express Port: ${LOCAL_PORT}\n`);

// 1. Establish secure outbound WebSocket connection to the Main Backend
const vpsSocket = Client(VPS_SOCKET_URL, {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: Infinity
});

vpsSocket.on('connect', () => {
  console.log('✅ [VPS Socket] Connected successfully to the Main VPS Server!');
});

vpsSocket.on('disconnect', () => {
  console.log('❌ [VPS Socket] Connection lost. Retrying...');
});

// 2. Open Arduino Serial Connection
let port, parser;
try {
  port = new SerialPort({
    path: ARDUINO_COM_PORT,
    baudRate: 9600,
    autoOpen: true
  });

  parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

  port.on('open', () => {
    console.log(`🚀 [Hardware] Actively listening to Arduino on ${ARDUINO_COM_PORT}...`);
  });

  port.on('error', (err) => {
    console.error('\n❌ [Hardware Error] Serial Port failed to open!');
    console.error(`Please ensure Arduino is plugged into ${ARDUINO_COM_PORT} and no other program (like Arduino IDE) is using it.`);
    console.error('Error Details:', err.message, '\n');
  });

  // 3. React instantly to physical buzzer presses
  parser.on('data', (data) => {
    const cleanData = data.trim();
    if (!cleanData) return;

    // Assuming Arduino outputs a direct team number ("1", "2", ... "6") 
    const teamId = parseInt(cleanData, 10);

    // Broadcast raw input to local dev monitor optionally
    localIo.emit('serialData', cleanData);

    if (vpsSocket.connected) {
      if (!isNaN(teamId) && teamId >= 1 && teamId <= 6) {
        console.log(`🔥 [BUZZ] Team ${teamId} pressed buzzer! Forwarding to VPS...`);

        // Emit the exact physical hit to the Backend's Round 3 Controller
        vpsSocket.emit('client:round3:buzzer_pressed', {
          teamId: teamId,
          timestamp: Date.now(), // High-precision local timestamp
          rawSignal: cleanData
        });

        // (Optional) Emit to Round 2 as well if they share the codebase
        vpsSocket.emit('fastfingers:buzzer:hit', teamId);

      } else {
        console.log(`[Hardware Debug] Unrecognized signal: ${cleanData}`);
      }
    } else {
      console.warn(`⚠️ [Offline Drop] Team ${teamId} buzzed, but we are NOT connected to the VPS!`);
    }
  });

} catch (e) {
  console.error('[Fatal Error] Serial Port setup failed:', e.message);
}

server.listen(LOCAL_PORT, () => {
  console.log(`🚀 [Express] Local server listening on port ${LOCAL_PORT}`);
});
