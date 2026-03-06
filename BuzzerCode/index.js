import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';
import { io } from 'socket.io-client';
import dotenv from 'dotenv';
dotenv.config();

// Configuration
const ARDUINO_COM_PORT = process.env.ARDUINO_COM_PORT || 'COM3'; // Change as needed
const BAUD_RATE = parseInt(process.env.BAUD_RATE || '9600', 10);
const VPS_URL = process.env.VPS_URL || 'http://localhost:3000';

console.log('--- MathX Local Buzzer Controller ---');
console.log(`Connecting to Main VPS at: ${VPS_URL}`);

// Initialize Socket.io connection to Main VPS
const socket = io(VPS_URL, {
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    timeout: 10000,
});

socket.on('connect', () => {
    console.log(`[Socket] Conected to Main VPS successfully. Socket ID: ${socket.id}`);
});

socket.on('disconnect', () => {
    console.log('[Socket] Disconnected from Main VPS. Attempting to reconnect...');
});

socket.on('connect_error', (err) => {
    console.log(`[Socket] Connection error: ${err.message}`);
});

// Hardcoded parsing map for Arduino serial outputs 
// Format: { 'arduino_string_output': 'team_id' }
const TEAM_MAP = {
    '1': 1, // Team 1
    '2': 2, // Team 2
    '3': 3, // Team 3
    '4': 4, // Team 4
    '5': 5, // Team 5
    '6': 6  // Team 6
};

// Initialize SerialPort
let port;
try {
    port = new SerialPort({
        path: ARDUINO_COM_PORT,
        baudRate: BAUD_RATE,
        autoOpen: true
    });

    const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

    port.on('open', () => {
        console.log(`[Serial] Successfully connected to Arduino on ${ARDUINO_COM_PORT} at ${BAUD_RATE} baud.`);
    });

    port.on('error', (err) => {
        console.error(`[Serial Error] ${err.message}`);
        console.log('=> Is the Arduino plugged in? Is the COM port correct? Modify .env to fix.');
    });

    // Handle incoming hardware signals
    parser.on('data', (data) => {
        const signal = data.toString().trim();
        console.log(`[Hardware Input] Received raw serial data: "${signal}"`);

        // Check if the signal maps to a valid team
        const mappedTeamId = TEAM_MAP[signal];
        if (mappedTeamId !== undefined) {
            console.log(`[Action] Emitting buzzer press for Team ${mappedTeamId} to VPS...`);
            socket.emit('client:round3:buzzer_pressed', {
                teamId: mappedTeamId,
                timestamp: Date.now() // Optional: local timestamp for debug
            });
        }
    });

} catch (err) {
    console.error(`[Fatal Serial Error] Could not establish serial connection: ${err.message}`);
}
