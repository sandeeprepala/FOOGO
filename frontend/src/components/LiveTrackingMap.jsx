import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Wifi, WifiOff, AlertTriangle } from 'lucide-react';

// Custom Map Leaflet Markers using inline SVG / Canvas
const createCustomIcon = (bgColor, iconSvg) => {
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `<div style="
      background-color: ${bgColor};
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 6px 16px rgba(35, 69, 45, 0.25);
      border: 3px solid #FBF8EA;
      color: white;
    ">${iconSvg}</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

const customerIcon = createCustomIcon(
  '#23452D',
  `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>`
);

const restaurantIcon = createCustomIcon(
  '#789C45',
  `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m2 7 10-5 10 5v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z"/></svg>`
);

const agentIcon = createCustomIcon(
  '#789C45',
  `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-1.1 0-2 .9-2 2v7c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>`
);

function RecenterMap({ bounds }) {
  const map = useMap();
  const initialRef = useRef(false);
  useEffect(() => {
    if (bounds && bounds.length > 0 && !initialRef.current) {
      map.fitBounds(bounds, { padding: [50, 50] });
      initialRef.current = true;
    }
  }, [bounds, map]);
  return null;
}

function PanAgentMarker({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position && position.length === 2) {
      map.panTo(position, { animate: true, duration: 1.0 });
    }
  }, [position, map]);
  return null;
}

export function LiveTrackingMap({
  customerPos = [28.6139, 77.2090],
  restaurantPos = [28.6120, 77.2100],
  agentPos = null,
  connectionStatus = 'connected',
  isStale = false,
  secondsAgo = null
}) {
  const validAgentPos = Array.isArray(agentPos)
    ? (agentPos.length === 2 && !isNaN(agentPos[0]) && !isNaN(agentPos[1]) ? agentPos : null)
    : (agentPos?.lat && agentPos?.lng && !isNaN(Number(agentPos.lat)) && !isNaN(Number(agentPos.lng))
        ? [Number(agentPos.lat), Number(agentPos.lng)]
        : null);

  // Bounds fitting
  const points = [customerPos, restaurantPos];
  if (validAgentPos) points.push(validAgentPos);

  return (
    <div className="relative w-full h-[380px] sm:h-[450px] rounded-3xl overflow-hidden border border-border-light shadow-soft">
      {/* Status Bar Overlay */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-ivory/95 backdrop-blur-md rounded-full border border-border-light shadow-card text-xs font-semibold text-forest-green pointer-events-auto">
          {connectionStatus === 'connected' ? (
            <>
              <span className="w-2 h-2 rounded-full bg-primary-olive animate-ping" />
              <Wifi className="w-3.5 h-3.5 text-primary-olive" />
              <span>Live Tracking Active</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5 text-[#D32F2F]" />
              <span className="text-[#7A1C1C]">Status: {connectionStatus}</span>
            </>
          )}
        </div>

        {isStale && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FFFBEB]/95 backdrop-blur-md rounded-full border border-[#F59E0B] text-xs font-semibold text-[#78350F] pointer-events-auto shadow-card">
            <AlertTriangle className="w-3.5 h-3.5 text-[#D97706]" />
            <span>Updated {secondsAgo || 60}s ago</span>
          </div>
        )}
      </div>

      <MapContainer
        center={customerPos}
        zoom={14}
        scrollWheelZoom={false}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <RecenterMap bounds={points} />
        {validAgentPos && <PanAgentMarker position={validAgentPos} />}

        {/* Customer Home Marker */}
        <Marker position={customerPos} icon={customerIcon}>
          <Popup><strong>Delivery Location</strong><br/>Your address</Popup>
        </Marker>

        {/* Restaurant Marker */}
        <Marker position={restaurantPos} icon={restaurantIcon}>
          <Popup><strong>Restaurant</strong><br/>Food preparation hub</Popup>
        </Marker>

        {/* Live Delivery Agent Marker */}
        {validAgentPos && (
          <Marker position={validAgentPos} icon={agentIcon}>
            <Popup><strong>Delivery Agent</strong><br/>Live position</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
