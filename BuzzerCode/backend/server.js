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

const ARDUINO_COM_PORT = process.env.ARDUINO_COM_PORT || "COM11";
// const VPS_SOCKET_URL = process.env.VITE_API_URL || "https; // Connect to Local Backend instead of Prod Cloud
const VPS_SOCKET_URL = "https://api.mathxpccoer.in";
const LOCAL_PORT = 5000;

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

app.get('/test-vps', (req, res) => {
  if (vpsSocket && vpsSocket.connected) {
    vpsSocket.emit('client:round3:test_connection', {
      message: 'Ping from Local Buzzer Node!',
      timestamp: Date.now()
    });
    console.log('✅ UI requested VPS connection check: CONNECTED & PING SENT');
    res.json({ connected: true, message: 'Successfully connected to VPS. Ping sent!' });
  } else {
    console.log('❌ UI requested VPS connection check: DISCONNECTED');
    res.json({ connected: false, message: 'Not connected to VPS' });
  }
});

app.get('/simulate-buzz/:teamId', (req, res) => {
  const teamId = parseInt(req.params.teamId, 10);
  if (!isNaN(teamId) && teamId >= 1 && teamId <= 6) {
    const fakeSignal = `[SIMULATOR] BUTTON_${teamId}`;

    // Broadcast to local dev monitor so it shows up in the UI logs
    localIo.emit('serialData', fakeSignal);

    if (vpsSocket && vpsSocket.connected) {
      console.log(`💻 [SIMULATED BUZZ] Team ${teamId} pressed buzzer via UI! Forwarding...`);
      vpsSocket.emit('client:round3:buzzer_pressed', {
        teamId: teamId,
        timestamp: Date.now(),
        rawSignal: fakeSignal
      });
      res.json({ success: true, message: `Simulated buzz for Team ${teamId}` });
    } else {
      console.warn(`⚠️ [Offline Drop] Simulated Team ${teamId} buzz, but NOT connected to VPS!`);
      res.status(503).json({ success: false, message: 'VPS not connected' });
    }
  } else {
    res.status(400).json({ success: false, message: 'Invalid Team ID' });
  }
});

app.get('/trigger-light/:teamId/:mode', (req, res) => {
  const teamId = parseInt(req.params.teamId, 10);
  const mode = req.params.mode.toUpperCase();
  const validModes = ['U', 'S', 'B', 'O'];

  if (!isNaN(teamId) && teamId >= 1 && teamId <= 6 && validModes.includes(mode)) {
    if (port && port.isOpen) {
      const command = `${teamId}${mode}\n`;
      port.write(command, (err) => {
        if (err) {
          console.error(`[Serial Error] Failed to write to port:`, err);
          return res.status(500).json({ success: false, message: 'Failed to write to serial port' });
        }
        console.log(`💡 [LIGHT COMMAND] Sent ${teamId}${mode} to Arduino`);
        localIo.emit('serialDataSent', command.trim());
        res.json({ success: true, message: `Sent ${teamId}${mode} to Arduino` });
      });
    } else {
      console.warn(`⚠️ [Serial Offline] Cannot send ${teamId}${mode}, port is not open or configured.`);
      // Just simulate for logging if no arduino is connected
      console.log(`💡 [SIMULATED LIGHT COMMAND] Sent ${teamId}${mode} to Arduino`);
      localIo.emit('serialDataSent', `${teamId}${mode}`);
      res.json({ success: true, message: `Simulated sending ${teamId}${mode} (Port offline)` });
    }
  } else {
    res.status(400).json({ success: false, message: 'Invalid Team ID or Mode' });
  }
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

    // Broadcast raw input to local dev monitor optionally  
    localIo.emit('serialData', cleanData);

    // Try to extract any digit from the string (in case it sends "Team 1", "1", "BUTTON_PRESSED 1", etc.)
    const match = cleanData.match(/\d+/);
    const teamId = match ? parseInt(match[0], 10) : NaN;

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

        // Instantly turn on the local light for that Team
        if (port && port.isOpen) {
          const command = `${teamId}U\n`;
          port.write(command);
          localIo.emit('serialDataSent', command.trim());
        }

      } else {
        console.log(`[Hardware Debug] Ignoring unrecognized hardware signal: "${cleanData}"`);
      }
    } else {
      console.warn(`⚠️ [Offline Drop] Hardware sent "${cleanData}", but we are NOT connected to the VPS!`);
    }
  });

} catch (e) {
  console.error('[Fatal Error] Serial Port setup failed:', e.message);
}

server.listen(LOCAL_PORT, () => {
  console.log(`🚀 [Express] Local server listening on port ${LOCAL_PORT}`);
});
