import React, { useMemo, useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.css';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.Default.css';
import { Badge, Button, Form, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import axios from 'axios';
import * as Esri from 'esri-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { extractCoordinates, calculateRemainingTime, getSapWebGuiUrl } from '../utils/workHelpers';

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Icons for different statuses
const createIcon = (color) => new L.Icon({
  iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const icons = {
  info: createIcon('blue'),
  warning: createIcon('orange'),
  danger: createIcon('red'),
  success: createIcon('green'),
  secondary: createIcon('grey')
};

// Car Icon Helper
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
         iconSize: [32, 32],
         iconAnchor: [16, 16],
         popupAnchor: [0, -10]
     });
};

const MapView = ({ works }) => {
  const mapWorks = useMemo(() => {
    return works
      .map(work => ({
        ...work,
        coords: extractCoordinates(work.sortfield)
      }))
      .filter(work => work.coords);
  }, [works]);

  // -- Mobiliz Integration --
  const [showVehicles, setShowVehicles] = useState(false);
  const [vehicles, setVehicles] = useState({});
  const [mobilizConnected, setMobilizConnected] = useState(false);

  useEffect(() => {
      if (!showVehicles) {
          setMobilizConnected(false);
          return;
      }

      console.log('Connecting to Mobiliz...');
      const socket = io('http://localhost:3002');

      socket.on('connect', () => {
          console.log('Connected to Mobiliz Service');
          setMobilizConnected(true);
      });

      socket.on('disconnect', () => {
          console.log('Disconnected from Mobiliz Service');
          setMobilizConnected(false);
      });

      socket.on('vehicle-update', (data) => {
          // console.log('Vehicle update:', data);
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
  }, [showVehicles]);

  // -- ArcGIS Integration --
  const [arcgisLayers, setArcgisLayers] = useState([]);
  const [visibleLayerIds, setVisibleLayerIds] = useState([]);
  const [showLayerPanel, setShowLayerPanel] = useState(false);
  const [layerLoadError, setLayerLoadError] = useState(null);
  const [mapInstance, setMapInstance] = useState(null);
  const arcgisLayerRef = React.useRef(null);
  const ARCGIS_URL = 'https://cbsarcgis2.aksa.com.tr/arcgis/rest/services/YENIWEB/CANAKKALEGAZ/MapServer';

  // Fetch Metadata
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        setLayerLoadError(null);
        // Use fetch with f=json
        const url = `${ARCGIS_URL}?f=json`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        const data = await response.json();
        
        if (data && data.layers) {
           const layers = data.layers;
           setArcgisLayers(layers);
           
           // Default: only "Adres" (id:34) and its children (35,36,37) are on
           const adresLayers = layers.filter(l => 
             l.name === 'Adres' || l.parentLayerId === layers.find(pl => pl.name === 'Adres')?.id
           ).map(l => l.id);
           
           setVisibleLayerIds(adresLayers);
        } else if (data && data.error) {
            throw new Error(data.error.message || 'ArcGIS Service Error');
        } else {
            throw new Error('Geçersiz metadata formatı');
        }
      } catch (error) {
        console.error('Error fetching ArcGIS metadata:', error);
        setLayerLoadError(error.message);
      }
    };
    fetchMetadata();
  }, []);

  // Manage Leaflet Layer
  useEffect(() => {
    if (!mapInstance) return;

    if (!arcgisLayerRef.current) {
        // Initialize layer
        arcgisLayerRef.current = Esri.dynamicMapLayer({
            url: ARCGIS_URL,
            useCors: false,
            f: 'image' // Export image
        });
        arcgisLayerRef.current.addTo(mapInstance);
    }

    // Update visible layers
    if (visibleLayerIds.length > 0) {
        arcgisLayerRef.current.setLayers(visibleLayerIds);
    } else {
        arcgisLayerRef.current.setLayers([-1]); // Hide all
    }

    return () => {
        // Cleanup if needed? Usually map removal handles it, but good practice.
        if (mapInstance && arcgisLayerRef.current) {
            mapInstance.removeLayer(arcgisLayerRef.current);
            arcgisLayerRef.current = null;
        }
    };
  }, [mapInstance, visibleLayerIds]);

  // Recursively render layer tree
  const renderLayerTree = (layers, parentId = -1) => {
      return layers
        .filter(l => l.parentLayerId === parentId)
        .map(layer => {
            const hasChildren = layers.some(l => l.parentLayerId === layer.id);
            const isChecked = visibleLayerIds.includes(layer.id);

            const handleToggle = (e) => {
                const checked = e.target.checked;
                const getChildIds = (id) => {
                    let ids = [];
                    const children = layers.filter(l => l.parentLayerId === id);
                    children.forEach(c => {
                        ids.push(c.id);
                        ids = [...ids, ...getChildIds(c.id)];
                    });
                    return ids;
                };

                const affectedIds = [layer.id, ...getChildIds(layer.id)];
                let newIds = [...visibleLayerIds];
                
                if (checked) {
                    // Add affected IDs without duplicates
                    newIds = Array.from(new Set([...newIds, ...affectedIds]));
                } else {
                    // Remove affected IDs
                    newIds = newIds.filter(id => !affectedIds.includes(id));
                }
                setVisibleLayerIds(newIds);
            };

            return (
                <div key={layer.id} className="ms-3">
                    <Form.Check 
                        type="checkbox"
                        id={`layer-${layer.id}`}
                        label={layer.name}
                        checked={isChecked}
                        onChange={handleToggle}
                        style={{ fontSize: '0.9rem' }}
                    />
                    {hasChildren && (
                        <div className="border-start ps-2 mb-1">
                            {renderLayerTree(layers, layer.id)}
                        </div>
                    )}
                </div>
            );
        });
  };

  // Center on first work or default to Turkey center
  const center = mapWorks.length > 0 
    ? [mapWorks[0].coords.lat, mapWorks[0].coords.lng] 
    : [39.0, 35.0];

  return (
    <div className="bg-white rounded shadow-sm border overflow-hidden" style={{ height: 'calc(100vh - 120px)', minHeight: '500px' }}>
      <MapContainer 
        center={center} 
        zoom={mapWorks.length > 0 ? 10 : 6} 
        style={{ height: '100%', width: '100%' }}
        whenReady={(map) => setMapInstance(map.target)}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Mobiliz Vehicles */}
        {showVehicles && Object.values(vehicles).map(vehicle => {
            const lat = vehicle.lat || vehicle.latitude;
            const lng = vehicle.lng || vehicle.longitude;
            const id = vehicle.id || vehicle.vehicleId || vehicle.plaka || 'Unknown';
            const speed = vehicle.speed || 0;

            if (lat && lng) {
                  return (
                    <Marker 
                        key={`veh-${id}`} 
                        position={[lat, lng]}
                        icon={getCarIcon(speed)}
                        zIndexOffset={1000} // Keep above regular markers
                    >
                        <Popup className="custom-popup">
                            <div style={{ minWidth: '200px' }}>
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

        {/* Controls Overlay */}
        <div 
            className="leaflet-bottom leaflet-left m-3 p-2 bg-white rounded shadow-sm" 
            style={{ zIndex: 1000, pointerEvents: 'auto' }}
        >
            <Form.Check 
                type="switch"
                id="show-vehicles-switch"
                label={
                    <span>
                        Araçları Göster
                        {showVehicles && (
                            <Badge 
                                bg={mobilizConnected ? 'success' : 'danger'} 
                                className="ms-2" 
                                style={{ fontSize: '0.6em' }}
                            >
                                {mobilizConnected ? 'Online' : 'Offline'}
                            </Badge>
                        )}
                    </span>
                }
                checked={showVehicles}
                onChange={(e) => setShowVehicles(e.target.checked)}
            />
            
            <hr className="my-2"/>

             {/* ArcGIS Layer Control */}
             <div className="mt-2 text-start">
             <Button 
                variant="outline-secondary" 
                size="sm" 
                className="w-100 d-flex justify-content-between align-items-center"
                onClick={() => setShowLayerPanel(!showLayerPanel)}
             >
                <span>🗺️ Katmanlar</span>
                <span>{showLayerPanel ? '▼' : '▶'}</span>
             </Button>
            
            {showLayerPanel && (
                <div className="mt-2 border rounded p-2 bg-light" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {layerLoadError ? (
                        <div className="text-danger small p-2">
                           ⚠️ Hata: {layerLoadError}
                           <Button variant="link" size="sm" onClick={() => window.location.reload()} className="p-0 ms-1">Tekrar Dene</Button>
                        </div>
                    ) : arcgisLayers.length > 0 ? (
                        renderLayerTree(arcgisLayers)
                    ) : (
                        <div className="text-muted small p-2">
                           <Spinner as="span" animation="border" size="sm" className="me-2" />
                           Yükleniyor...
                        </div>
                    )}
                </div>
            )}
            </div>
        </div>
        <MarkerClusterGroup chunkedLoading>
        {mapWorks.map((work) => {
          const remaining = calculateRemainingTime(work.zpm1027, work.zpm1028);
          const icon = remaining ? icons[remaining.variant] : icons.info;

          return (
            <Marker 
              key={work.sapId} 
              position={[work.coords.lat, work.coords.lng]}
              icon={icon}
            >
              <Popup>
                <div style={{ minWidth: '200px' }}>
                  <div className="d-flex justify-content-between align-items-start mb-2 border-bottom pb-2">
                    <span className="fw-bold text-primary">{work.ustIsEmri || work.sapId}</span>
                    <Badge bg={work.listType === 'LIST_ATANACAK' ? 'info' : 'warning'}>
                      {work.listType ? work.listType.replace('LIST_', '') : 'N/A'}
                    </Badge>
                  </div>
                  
                  <div className="small mb-2">
                    <div className="mb-1"><strong>Açıklama:</strong> {work.operation?.[0]?.shortText || work.shortText || '-'}</div>
                    <div className="mb-1"><strong>Tür:</strong> {work.orderTypeTxt || '-'}</div>
                    <div className="mb-1"><strong>İlçe:</strong> {work.adrCity1 || '-'}</div>
                    <div className="mb-1"><strong>Mahalle:</strong> {work.adrCity2 || '-'}</div>
                    {remaining && (
                      <div className="mt-1">
                        <Badge bg={remaining.variant}>{remaining.text}</Badge>
                      </div>
                    )}
                  </div>

                  <div className="d-flex gap-2 border-top pt-2">
                    <Link to={`/work/${work.sapId}`} className="btn btn-outline-primary btn-sm flex-grow-1">
                      Detay
                    </Link>
                    {work.notifNo && (
                      <a 
                        href={getSapWebGuiUrl(work.notifNo)} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="btn btn-outline-secondary btn-sm"
                      >
                        SAP
                      </a>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
};

export default MapView;
