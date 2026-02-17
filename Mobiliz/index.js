const puppeteer = require('puppeteer');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins for simplicity in development
    methods: ["GET", "POST"]
  }
});

const PORT = 3002;

// Store latest vehicle data
let vehicleData = {};

io.on('connection', (socket) => {
  console.log('Client connected to Mobiliz socket');
  
  // Send existing data immediately upon connection
  socket.emit('vehicle-update', Object.values(vehicleData));

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

async function startMobilizTracking() {
  const browser = await puppeteer.launch({
    headless: false, // Set to true for production/background
    defaultViewport: null,
    args: ['--start-maximized', '--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Navigate to login
  try {
  // Listen for HTTP responses using Puppeteer API
  page.on('response', async response => {
      const url = response.url();
      
      // Log all API requests to help debug
      if (url.includes('/api/') || url.includes('vehicletree')) {
          console.log(`API Response: ${url}`);
      }

      // Check for 'vehicletree' specifically as requested by user
      if (url.includes('vehicletree')) {
          console.log(`Intercepted Vehicle Tree: ${url}`);
          try {
              const data = await response.json();
              
              console.log(`Parsed Vehicle Tree.`);

              // Parse vehicle metadata from tree
              // The tree provides IDs and Plates but maybe not current location
              let vehiclesFound = [];
              const extract = (obj) => {
                   if (Array.isArray(obj)) {
                       obj.forEach(item => {
                           if (item && typeof item === 'object') {
                               // Check for vehicle-like properties
                               if (item.id && (item.plate || item.vehicleLabel)) {
                                    // Store metadata
                                    const v = {
                                       id: item.id,
                                       plaka: item.plate || 'Unknown',
                                       vehicleLabel: item.vehicleLabel || '',
                                       name: item.name || '',
                                       driverName: item.driverName || '',
                                       speed: 0, // Default
                                       lat: 0,   // Default
                                       lng: 0    // Default
                                   };
                                   vehiclesFound.push(v);
                                   
                                   // Update global store
                                   if (!vehicleData[v.id]) {
                                       vehicleData[v.id] = v;
                                   } else {
                                       // Update metadata only
                                       vehicleData[v.id].plaka = v.plaka;
                                       vehicleData[v.id].vehicleLabel = v.vehicleLabel;
                                       vehicleData[v.id].name = v.name;
                                       vehicleData[v.id].driverName = v.driverName;
                                   }
                               }
                               // recursive search
                               extract(item);
                           }
                       });
                   } else if (obj && typeof obj === 'object') {
                       // Direct check
                       if (obj.id && (obj.plate || obj.vehicleLabel)) {
                             const v = {
                               id: obj.id,
                               plaka: obj.plate || 'Unknown',
                               vehicleLabel: obj.vehicleLabel || '',
                               name: obj.name || '',
                               driverName: obj.driverName || '',
                               speed: 0,
                               lat: 0,
                               lng: 0
                           };
                           vehiclesFound.push(v);
                           if (!vehicleData[v.id]) {
                               vehicleData[v.id] = v;
                           } else {
                               vehicleData[v.id].plaka = v.plaka;
                               vehicleData[v.id].vehicleLabel = v.vehicleLabel;
                               vehicleData[v.id].name = v.name;
                               vehicleData[v.id].driverName = v.driverName;
                           }
                       }

                       // Recursive search in common keys
                       if (obj.data) extract(obj.data);
                       if (obj.results) extract(obj.results);
                       if (obj.list) extract(obj.list);
                       if (obj.items) extract(obj.items);
                       if (obj.children) extract(obj.children);
                   }
              };

              extract(data);

              if (vehiclesFound.length > 0) {
                  console.log(`Found ${vehiclesFound.length} vehicles in Vehicle Tree (Metadata only).`);
                  // We don't broadcast yet because they have no location (0,0)
                  // But we might want to send them if we want to show a list on the UI
              } else {
                  console.log('No vehicles extracted from Vehicle Tree.');
              }
          } catch (e) {
              console.error('Error parsing vehicletree:', e.message);
          }
      }

      // Intercept locations endpoint
      if (url.includes('/api/map/locations')) {
          console.log(`Intercepted Locations: ${url}`);
          try {
              const data = await response.json();
             
              // Parse locations
              let vehiclesFound = [];
              const extractLocations = (obj) => {
                  if (Array.isArray(obj)) {
                      obj.forEach(item => processItem(item));
                  } else if (obj && typeof obj === 'object') {
                       if (obj.data) extractLocations(obj.data);
                       if (obj.result) extractLocations(obj.result); // Sometimes result wrapper
                       processItem(obj);
                  }
              };

              // Helper for updating vehicle data
              const processItem = (item) => {
                  const lat = item.lat || item.latitude || item.Latitude || item.Lat;
                  const lng = item.lng || item.longitude || item.Longitude || item.Lng || item.longtitude;
                  
                  if (lat && lng) {
                      const id = item.muId || item.id || item.vehicleId || item.plaka || item.plate || 'unknown';
                      // Try to find existing metadata first
                      const existing = vehicleData[id] || {};
                      
                      const v = {
                          id: id,
                          lat: parseFloat(lat),
                          lng: parseFloat(lng),
                          speed: item.speed || 0,
                          // Use existing metadata if available, otherwise fallback to item properties
                          plaka: existing.plaka || item.plaka || item.plate || item.driverName || item.muId || 'Unknown',
                          vehicleLabel: existing.vehicleLabel || item.vehicleLabel || '',
                          name: existing.name || item.name || '',
                          driverName: existing.driverName || item.driverName || ''
                      };
                      vehiclesFound.push(v);
                      // Merge with existing data to preserve metadata like plate/label
                      vehicleData[v.id] = { ...existing, ...v };
                  }
              };

              extractLocations(data);

              if (vehiclesFound.length > 0) {
                  console.log(`Found ${vehiclesFound.length} vehicles in Locations API. Broadcasting...`);
                  console.log(`Total tracked vehicles: ${Object.keys(vehicleData).length}`);
                  io.emit('vehicle-update', Object.values(vehicleData));
              }
          } catch (e) {
               console.error('Error parsing locations:', e.message);
          }
      }
  });

  console.log('Navigating to Mobiliz login...');
    await page.goto('https://ng.mobiliz.com.tr/#!/login', { waitUntil: 'networkidle2' });

    // Login credentials
    const username = "rifattolga.kiran";
    const password = "G8k33pr!!";

    console.log('Filling credentials...');
    // Selectors might need adjustment based on actual page structure
    await page.waitForSelector('input[name="username"]', { visible: true, timeout: 60000 });
    await page.type('input[name="username"]', username);
    await page.type('input[name="password"]', password);
    
    // Login
    console.log('Logging in...');
    await page.click('button[type="submit"]');
    
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    console.log('Login successful (assumed based on navigation).');

    // Take a screenshot to see the state
    await page.screenshot({ path: 'mobiliz_dashboard.png' });
    console.log('Screenshot saved to mobiliz_dashboard.png');

  } catch (error) {
    console.error('Login failed:', error);
    // await browser.close(); // Keep open for debugging
    return;
  }

  // Set up CDP session to intercept WebSockets
  const client = await page.createCDPSession();
  await client.send('Network.enable');

  client.on('Network.webSocketFrameReceived', ({ response }) => {
    try {
      const payloadData = response.payloadData;
      
      // Attempt to parse JSON. 
      // Mobiliz might use a custom protocol or plain JSON.
      // We need to inspect the data format.
      // For now, let's assume it's JSON and log it to understand the structure.
      
      // Ignore hearbeats
      if (payloadData === '3probe' || payloadData === '2probe' || payloadData === '3' || payloadData === '2') {
          return; 
      }

      console.log('--- WS FRAME ---');
      // console.log('Snippet:', payloadData.substring(0, 100));

      let jsonString = payloadData;
      
      // Handle Socket.IO prefix (e.g. 42["event",...]) or 32["event"...] for older versions
      if (/^\d+/.test(payloadData)) {
          const match = payloadData.match(/^(\d+)(.*)$/);
          if (match) {
              const prefix = match[1];
              const rest = match[2];
              
              if (['42', '43', '32', '3'].includes(prefix)) {
                  jsonString = rest;
              } else {
                   // Fallback
                   jsonString = rest;
              }
          }
      }

      if (jsonString.startsWith('{') || jsonString.startsWith('[')) {
          try {
              const data = JSON.parse(jsonString);
              // console.log('Parsed JSON:', JSON.stringify(data).substring(0, 200));
              
              let vehiclesFound = [];
              let potentialVehicles = [];

              // If socket.io event: ["eventName", data]
              if (Array.isArray(data) && typeof data[0] === 'string') {
                   console.log('Event:', data[0]);
                   // data[1] is the payload
                   if (data[1]) {
                       if (Array.isArray(data[1])) potentialVehicles = data[1];
                       else potentialVehicles = [data[1]];
                   }
              } else if (Array.isArray(data)) {
                  potentialVehicles = data;
              } else {
                  potentialVehicles = [data];
              }

              const extractVehicle = (obj) => {
                   if (obj && typeof obj === 'object') {
                       // recursive search for lat/lng if nested
                       // Mobiliz uses 'longtitude' (typo in their API)
                       const lat = obj.lat || obj.latitude || obj.Latitude || obj.Lat;
                       const lng = obj.lng || obj.longitude || obj.Longitude || obj.Lng || obj.longtitude;
                       
                       if (lat && lng) {
                           const id = obj.muId || obj.id || obj.vehicleId || obj.plaka || obj.plate || 'unknown';
                           const existing = vehicleData[id] || {};
                           
                           return {
                               id: id,
                               lat: parseFloat(lat),
                               lng: parseFloat(lng),
                               speed: obj.speed || 0,
                               // START FIX: Use existing metadata, don't fallback to driverName for plate
                               plaka: existing.plaka || obj.plaka || obj.plate || obj.muId || 'Unknown',
                               vehicleLabel: existing.vehicleLabel || obj.vehicleLabel || '',
                               name: existing.name || obj.name || '',
                               driverName: existing.driverName || obj.driverName || ''
                               // END FIX
                           };
                       }
                   }
                   return null;
              };

              potentialVehicles.forEach(item => {
                  const v = extractVehicle(item);
                  if (v) vehiclesFound.push(v);
              });

              if (vehiclesFound.length > 0) {
                  console.log(`Found ${vehiclesFound.length} vehicles. Broadcasting...`);
                  vehiclesFound.forEach(v => {
                      // Merge with existing to ensure we don't lose keys if extractVehicle didn't cover them (though it does cover the main ones now)
                      // The extractVehicle above already tries to pull from existing, but let's be safe.
                      vehicleData[v.id] = { ...vehicleData[v.id], ...v };
                  });
                  io.emit('vehicle-update', Object.values(vehicleData));
              } else {
                   // Only log if it was an event we might care about
                   if (Array.isArray(data) && data[0] === 'VehicleLocationChanged') {
                       console.log(`VehicleLocationChanged found but extraction failed. Data keys: ${Object.keys(data[1] || {}).join(', ')}`);
                   }
              }

          } catch (e) {
              // console.log('JSON Parse Error:', e.message);
          }
      }


    } catch (e) {
      // Ignore parse errors for non-JSON frames
    }
  });

  console.log('Tracking started. Listening for WebSocket frames...');
}

server.listen(PORT, () => {
  console.log(`Mobiliz Service running on port ${PORT}`);
  startMobilizTracking();
});
