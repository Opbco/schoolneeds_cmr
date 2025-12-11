import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const NetworkMap = ({ members }) => {
  if (!members || members.length === 0) return null;

  // 1. Filter valid GPS points
  const validMembers = members.filter(m => m.latitude && m.longitude);
  if (validMembers.length === 0) return <div>No GPS data available</div>;

  // 2. Calculate center of the network
  const lats = validMembers.map(m => parseFloat(m.latitude));
  const lngs = validMembers.map(m => parseFloat(m.longitude));
  const centerLat = lats.reduce((a, b) => a + b, 0) / lats.length;
  const centerLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;

  // 3. Create connections (lines between all members)
  const connections = [];
  for (let i = 0; i < validMembers.length; i++) {
    for (let j = i + 1; j < validMembers.length; j++) {
      connections.push([
        [validMembers[i].latitude, validMembers[i].longitude],
        [validMembers[j].latitude, validMembers[j].longitude]
      ]);
    }
  }

  return (
    <div className="h-[400px] rounded-lg overflow-hidden border border-gray-200 shadow-sm relative z-0">
      <MapContainer 
        center={[centerLat, centerLng]} 
        zoom={12} 
        scrollWheelZoom={false} 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Draw Lines between schools */}
        {connections.map((line, idx) => (
          <Polyline key={idx} positions={line} color="#6366f1" dashArray="5, 10" weight={2} />
        ))}

        {/* Draw Markers */}
        {validMembers.map(school => (
          <Marker 
            key={school.school_id} 
            position={[school.latitude, school.longitude]}
          >
            <Popup>
              <div className="text-center">
                <strong className="block text-indigo-600">{school.school_name}</strong>
                <span className={`text-xs font-bold px-2 py-0.5 rounded text-white ${
                  school.role === 'PROVIDER' ? 'bg-green-500' : 'bg-red-500'
                }`}>
                  {school.role}
                </span>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default NetworkMap;