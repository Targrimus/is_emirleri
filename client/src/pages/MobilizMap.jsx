import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { io } from 'socket.io-client';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default Leaflet marker icons not working in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const MobilizMap = () => {
    const [vehicles, setVehicles] = useState({});
    const [connected, setConnected] = useState(false);
    const mapRef = useRef(null);

    // Helper to create colored car icon
    const createCarIcon = (speed) => {
        const isMoving = speed > 5;
        const color = isMoving ? '#28a745' : '#6c757d'; // Green or Gray
        
        return L.divIcon({
            className: 'custom-car-icon',
            html: `<div style="color: ${color}; filter: drop-shadow(1px 1px 2px rgba(0,0,0,0.5));">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" width="30" height="30" fill="currentColor">
                        <path d="M542.22 32.05c-13-3.92-24.87-1.09-33.28 7.39-12.59 12.69-38.35 12.39-51.48-.68-15.02-14.95-35.13-17.79-52.02-6.52l-9.52 6.35c-15.01 10.01-34.92 5.06-43.08-11.27l-5.74-11.49C338.2 1.48 317.5-6.57 295.66 4.35l-33.58 16.79c-20.9 10.45-32.96 32.79-29.69 56.12 7.74 54.78 3.96 112.18-12.55 167.35-12.87 43.15-46.12 76.54-90.28 89.28l-8.48 2.45c-28.87 8.35-43.71 40.54-32.54 69.34l22.06 50.11c10.87 23.95 35.1 39.42 61.42 39.42h288c26.32 0 50.55-15.47 61.42-39.42l22.06-50.11c11.17-28.8-3.67-60.99-32.54-69.34l-8.48-2.45c-44.16-12.74-77.41-46.13-90.28-89.28-16.51-55.17-20.29-112.57-12.55-167.35 3.27-23.33-8.79-45.67-29.69-56.12l-33.58-16.79z M288 384c35.35 0 64 28.65 64 64s-28.65 64-64 64-64-28.65-64-64 28.65-64 64-64z"/>
                        <path d="M288 384c35.35 0 64 28.65 64 64s-28.65 64-64 64-64-28.65-64-64 28.65-64 64-64z" fill="#333"/>
                        <rect x="70" y="240" width="436" height="120" rx="20" ry="20" fill="currentColor"/>
                        <circle cx="120" cy="380" r="40" fill="#333"/>
                        <circle cx="456" cy="380" r="40" fill="#333"/>
                    </svg>
                   </div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });
    };
    
    // Simple Boxy Car svg path for clear visibility
    const getCarIcon = (speed) => {
         const isMoving = speed > 5;
         const color = isMoving ? '#28a745' : '#757575'; 
         
         return L.divIcon({
            className: 'custom-car-icon',
            html: `<div style="color: ${color}; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.3));">
                   <svg viewBox="0 0 512 512" width="32" height="32" fill="currentColor">
                     <path d="M499.99 176h-59.87l-16.64-41.6C406.38 91.63 365.23 64 319.5 64h-127c-45.73 0-86.88 27.63-103.98 70.4L71.88 176H12.01C5.37 176 0 181.37 0 188v24c0 35.35 28.65 64 64 64h384c35.35 0 64-28.65 64-64v-24c0-6.63-5.37-12-12.01-12zM128 448c-35.35 0-64-28.65-64-64h128c0 35.35-28.65 64-64 64zm256 0c-35.35 0-64-28.65-64-64h128c0 35.35-28.65 64-64 64zm64-128H64v-32h384v32z"/>
                   </svg>
                   </div>`,
             iconSize: [16, 16],
             iconAnchor: [8, 8],
             popupAnchor: [0, -10]
         });
    }

    useEffect(() => {
        // Connect to Mobiliz Service (Port 3002)
        const socket = io('http://localhost:3002');

        socket.on('connect', () => {
            console.log('Connected to Mobiliz Service');
            setConnected(true);
        });

        socket.on('disconnect', () => {
            console.log('Disconnected from Mobiliz Service');
            setConnected(false);
        });

        socket.on('vehicle-update', (data) => {
            console.log('Vehicle update:', data);
            setVehicles(prev => {
                const next = { ...prev };
                if (Array.isArray(data)) {
                    data.forEach(v => {
                       const id = v.id || v.vehicleId || v.plaka || 'unknown'; 
                       next[id] = v;
                    });
                } else {
                     const id = data.id || data.vehicleId || data.plaka || 'unknown';
                     next[id] = data;
                }
                return next;
            });
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    // Default center (Turkey)
    const defaultCenter = [39.9334, 32.8597]; 
    const defaultZoom = 6;

    return (
        <div className="mobiliz-map-container" style={{ height: 'calc(100vh - 100px)', width: '100%', borderRadius: '15px', overflow: 'hidden', border: '1px solid #e0e0e0' }}>
            <div className="p-2 bg-white border-bottom d-flex justify-content-between align-items-center">
                <h5 className="m-0">Canlı Araç Takip (Mobiliz)</h5>
                <span className={`badge ${connected ? 'bg-success' : 'bg-danger'}`}>
                    {connected ? 'Bağlı' : 'Bağlantı Yok'}
                </span>
            </div>
            
            <MapContainer 
                center={defaultCenter} 
                zoom={defaultZoom} 
                style={{ height: '100%', width: '100%' }}
                ref={mapRef}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />

                {Object.values(vehicles).map(vehicle => {
                    // Normalize lat/lng
                    const lat = vehicle.lat || vehicle.latitude;
                    const lng = vehicle.lng || vehicle.longitude;
                    const id = vehicle.id || vehicle.vehicleId || vehicle.plaka || 'Unknown';
                    const speed = vehicle.speed || 0;

                    if (lat && lng) {
                         return (
                            <Marker 
                                key={id} 
                                position={[lat, lng]}
                                icon={getCarIcon(speed)}
                            >
                                <Popup className="custom-popup">
                                    <div style={{ minWidth: '100px' }}>
                                        <h6 className="mb-1 text-primary">{vehicle.vehicleLabel || vehicle.plaka || 'Bilinmeyen Araç'}</h6>
                                        <table className="table table-sm table-borderless mb-0" style={{ fontSize: '0.9rem' }}>
                                            <tbody>
                                                <tr>
                                                    <td className="fw-bold p-0 pe-2">Plaka:</td>
                                                    <td className="p-0">{vehicle.plaka}</td>
                                                </tr>
                                                <tr>
                                                    <td className="fw-bold p-0 pe-2">Sürücü:</td>
                                                    <td className="p-0">{vehicle.driverName || '-'}</td>
                                                </tr>
                                                <tr>
                                                    <td className="fw-bold p-0 pe-2">Tanım:</td>
                                                    <td className="p-0">{vehicle.name || '-'}</td>
                                                </tr>
                                                <tr>
                                                    <td className="fw-bold p-0 pe-2">Hız:</td>
                                                    <td className="p-0">
                                                        <span className={`badge ${speed > 0 ? 'bg-success' : 'bg-secondary'}`}>
                                                            {speed} km/h
                                                        </span>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                        <div className="text-muted small mt-1 text-end">
                                            {new Date().toLocaleTimeString()}
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        );
                    }
                    return null;
                })}
            </MapContainer>
        </div>
    );
};

export default MobilizMap;
