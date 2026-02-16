import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Badge, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
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

const MapView = ({ works }) => {
  const mapWorks = useMemo(() => {
    return works
      .map(work => ({
        ...work,
        coords: extractCoordinates(work.sortfield)
      }))
      .filter(work => work.coords);
  }, [works]);

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
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
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
      </MapContainer>
    </div>
  );
};

export default MapView;
