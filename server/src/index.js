require('dotenv').config();
const express = require('express');
const cors = require('cors');
const workRoutes = require('./routes/workRoutes');
const WebSocket = require('ws');
const http = require('http');
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Function to broadcast to all connected clients
const broadcastToClients = (data) => {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    });
};

/* SAP WebSocket Client Logic */
let sapWs;
const SAP_WS_URL = 'ws://mobilsahaprod.aksa.com.tr:8000/sap/bc/apc/sap/zpm_apc_map';

const connectToSap = () => {
    try {
        const username = process.env.SAP_USERNAME;
        const password = process.env.SAP_PASSWORD;
        const auth = Buffer.from(`${username}:${password}`).toString('base64');
        
        // Construct URL with auth embedded if possible, or try headers (thoughws module supports headers)
        // Note: 'ws' module supports headers directly!
        console.log(`Connecting to SAP WebSocket: ${SAP_WS_URL}`);
        
        // Using headers for Basic Auth is cleaner and standard for 'ws' client
        sapWs = new WebSocket(SAP_WS_URL, {
            headers: {
                'Authorization': `Basic ${auth}`,
                // 'Sec-WebSocket-Protocol': 'v10.pcp.sap.com' // Common SAP protocol, uncomment if needed
            }
        });

        sapWs.on('open', () => {
            console.log('✅ Connected to SAP WebSocket');
        });

        sapWs.on('message', (data) => {
            console.log('📩 Message from SAP:', data.toString());
            // Forward to frontend clients
            console.log(`Forwarding to ${wss.clients.size} clients`);
            broadcastToClients(data.toString());
        });

        sapWs.on('error', (err) => {
            console.error('❌ SAP WebSocket Error:', err.message);
        });

        sapWs.on('close', () => {
            console.log('⚠️ SAP WebSocket Disconnected. Reconnecting in 5s...');
            setTimeout(connectToSap, 5000);
        });

    } catch (error) {
        console.error('Failed to init SAP WS:', error);
        setTimeout(connectToSap, 5000);
    }
};

// Start the SAP connection
connectToSap();


// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/works', workRoutes);

const PORT = process.env.PORT || 5000;

// Handle frontend connections
wss.on('connection', (ws) => {
  console.log('Frontend Client connected');
  ws.send(JSON.stringify({ type: 'INFO', message: 'Connected to Proxy Server' }));
});

server.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  console.log('In-memory mode active. Data will be lost on restart.');
});
