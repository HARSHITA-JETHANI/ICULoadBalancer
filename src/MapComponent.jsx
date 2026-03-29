import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Tooltip } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// MUST come AFTER the imports above!
import "leaflet-routing-machine";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";

import { getOccupancyTier, getDistanceKm } from "./utils";


delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const TIER_COLORS = {
  green: { fill: "#22c55e", ring: "#16a34a" },
  yellow: { fill: "#eab308", ring: "#ca8a04" },
  red: { fill: "#ef4444", ring: "#dc2626" },
};

function createHospitalIcon(tier, isSelected = false) {
  const c = TIER_COLORS[tier];
  const size = isSelected ? 44 : 36;
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg">
      <circle cx="22" cy="22" r="20" fill="${c.fill}" fill-opacity="0.18" stroke="${c.ring}" stroke-width="1.5"/>
      <circle cx="22" cy="22" r="13" fill="${c.fill}" stroke="${c.ring}" stroke-width="2">
        <animate attributeName="r" values="13;15;13" dur="2.4s" repeatCount="indefinite"/>
        <animate attributeName="fill-opacity" values="1;0.75;1" dur="2.4s" repeatCount="indefinite"/>
      </circle>
      <text x="22" y="27" text-anchor="middle" font-size="14" font-weight="bold" fill="white" font-family="monospace">H</text>
      ${isSelected ? `<circle cx="22" cy="22" r="20" fill="none" stroke="white" stroke-width="2.5" stroke-dasharray="4 3"/>` : ""}
    </svg>`;
  return L.divIcon({ html: svg, className: "", iconSize: [size, size], iconAnchor: [size / 2, size / 2], popupAnchor: [0, -size / 2] });
}

function createUserIcon() {
  const svg = `
    <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="18" fill="#ef4444" fill-opacity="0.15" stroke="#ef4444" stroke-width="1.5">
        <animate attributeName="r" values="18;23;18" dur="1.5s" repeatCount="indefinite"/>
        <animate attributeName="fill-opacity" values="0.15;0.04;0.15" dur="1.5s" repeatCount="indefinite"/>
      </circle>
      <circle cx="20" cy="20" r="10" fill="#ef4444"/>
      <text x="20" y="25" text-anchor="middle" font-size="14" font-weight="bold" fill="white">!</text>
    </svg>`;
  return L.divIcon({ html: svg, className: "", iconSize: [40, 40], iconAnchor: [20, 20] });
}

// Re-center map whenever userLocation changes
function RecenterMap({ userLocation, hospitals }) {
  const map = useMap();
  useEffect(() => {
    if (!userLocation) return;
    const points = hospitals.map(h => [h.lat, h.lng]);
    points.push([userLocation.lat, userLocation.lng]);
    if (points.length > 1) {
      map.fitBounds(points, { padding: [40, 40] });
    } else {
      map.setView([userLocation.lat, userLocation.lng], 13);
    }
  }, [userLocation]);
  return null;
}

// ─── Actual Road Routing Component ───────────────────────────────────────────
function RoadRouter({ origin, destination }) {
  const map = useMap();
  const routingControlRef = useRef(null);

  useEffect(() => {
    if (!origin || !destination) return;

    // If the route doesn't exist yet, create it
    if (!routingControlRef.current) {
      routingControlRef.current = L.Routing.control({
        waypoints: [
          L.latLng(origin.lat, origin.lng),
          L.latLng(destination.lat, destination.lng)
        ],
        lineOptions: {
          styles: [{ color: '#38bdf8', weight: 4, opacity: 0.9, dashArray: '10 10' }]
        },
        show: false,          // Hides the clunky text-directions box
        addWaypoints: false,  // Prevents users from dragging the line mid-route
        routeWhileDragging: false,
        fitSelectedRoutes: false, // Prevents map from wildly zooming on every tiny GPS update
        createMarker: () => null  // Hides default markers so we can use your custom ones!
      }).addTo(map);
    } else {
      // If the route already exists, just update the start point as the ambulance moves!
      routingControlRef.current.setWaypoints([
        L.latLng(origin.lat, origin.lng),
        L.latLng(destination.lat, destination.lng)
      ]);
    }

    // Cleanup when component unmounts
    return () => {
      if (routingControlRef.current && map) {
        map.removeControl(routingControlRef.current);
        routingControlRef.current = null;
      }
    };
  }, [origin, destination, map]);

  return null;
}

export default function MapComponent({ hospitals, routeLine, selectedHospitalId, userLocation }) {
  const center = userLocation
    ? [userLocation.lat, userLocation.lng]
    : [26.8429063, 75.5654288830038]; // Jaipur fallback

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden border border-slate-700/60 shadow-2xl">
      <div className="pointer-events-none absolute inset-0 z-[1000] opacity-[0.03]"
        style={{ backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,0.5) 2px,rgba(255,255,255,0.5) 4px)" }} />

      <MapContainer center={center} zoom={12}
        style={{ height: "100%", width: "100%", background: "#0f172a" }} zoomControl={false}>

        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />
        <RecenterMap userLocation={userLocation} hospitals={hospitals} />


        {/* Hospital markers */}
        {hospitals.map(h => {
          const tier = getOccupancyTier(h);
          const isSelected = h._id === selectedHospitalId;
          const available = h.totalBeds - h.occupiedBeds;
          const occupancyPct = Math.round((h.occupiedBeds / h.totalBeds) * 100);
          const iconSize = isSelected ? 44 : 36;
          const dist = userLocation
            ? getDistanceKm(userLocation.lat, userLocation.lng, h.lat, h.lng)
            : null;

          return (
            <Marker key={h._id} position={[h.lat, h.lng]} icon={createHospitalIcon(tier, isSelected)}>
              <Tooltip
                permanent
                direction="top"
                offset={[0, -(iconSize / 2) - 2]}
                className={`map-label dest-label`}
              >
                {h.name} — {available} beds
              </Tooltip>
              <Popup>
                <div className="text-xs font-mono bg-slate-900 text-slate-100 p-2 rounded min-w-[180px]">
                  <div className="font-bold text-white mb-2 text-sm">{h.name}</div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-slate-300">
                    <span className="text-slate-500">Beds Free</span>
                    <span className={available === 0 ? "text-red-400 font-bold" : "text-green-400 font-bold"}>
                      {available} / {h.totalBeds}
                    </span>
                    <span className="text-slate-500">Occupancy</span>
                    <span className={occupancyPct >= 90 ? "text-red-400" : occupancyPct >= 70 ? "text-yellow-400" : "text-green-400"}>
                      {occupancyPct}%
                    </span>
                    {dist !== null && <><span className="text-slate-500">Distance</span><span>{dist.toFixed(1)} km</span></>}
                    <span className="text-slate-500">Ventilators</span>
                    <span className={h.hasVentilators ? "text-green-400" : "text-slate-500"}>
                      {h.hasVentilators ? "✓ Yes" : "✗ No"}
                    </span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-700 text-slate-400">
                    {h.specialties.join(" · ")}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Draw the actual road network path */}
        {routeLine && userLocation && (
          <RoadRouter origin={userLocation} destination={routeLine} />
        )}

        {/* User / emergency origin marker — rendered AFTER RoadRouter so it stays on top */}
        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={createUserIcon()} zIndexOffset={1000}>
            <Tooltip permanent direction="bottom" className="map-label origin-label">Origin: Your Location</Tooltip>
            <Popup>
              <div className="text-xs font-mono bg-slate-900 text-red-400 p-2 rounded">
                <div className="font-bold text-red-300 mb-1">🚨 YOUR LOCATION</div>
                <div className="text-slate-400">{userLocation.lat.toFixed(5)}°N, {userLocation.lng.toFixed(5)}°E</div>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}