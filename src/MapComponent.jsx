import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getOccupancyTier, EMERGENCY_LOCATION, getDistanceKm } from "./utils";

// ─── Fix Leaflet default icon paths (Vite asset quirk) ─────────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ─── SVG Pulse Marker Factory ───────────────────────────────────────────────
const TIER_COLORS = {
  green:  { fill: "#22c55e", glow: "#4ade80", ring: "#16a34a" },
  yellow: { fill: "#eab308", glow: "#facc15", ring: "#ca8a04" },
  red:    { fill: "#ef4444", glow: "#f87171", ring: "#dc2626" },
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
  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

function createEmergencyIcon() {
  const svg = `
    <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="18" fill="#ef4444" fill-opacity="0.15" stroke="#ef4444" stroke-width="1.5">
        <animate attributeName="r" values="18;22;18" dur="1.5s" repeatCount="indefinite"/>
        <animate attributeName="fill-opacity" values="0.15;0.05;0.15" dur="1.5s" repeatCount="indefinite"/>
      </circle>
      <circle cx="20" cy="20" r="10" fill="#ef4444"/>
      <text x="20" y="25" text-anchor="middle" font-size="14" font-weight="bold" fill="white">!</text>
    </svg>`;
  return L.divIcon({ html: svg, className: "", iconSize: [40, 40], iconAnchor: [20, 20] });
}

// ─── Auto-fit map bounds when hospitals change ───────────────────────────────
function FitBounds({ hospitals }) {
  const map = useMap();
  useEffect(() => {
    if (!hospitals.length) return;
    const bounds = hospitals.map((h) => [h.lat, h.lng]);
    bounds.push([EMERGENCY_LOCATION.lat, EMERGENCY_LOCATION.lng]);
    map.fitBounds(bounds, { padding: [40, 40] });
  }, []);
  return null;
}

// ─── MapComponent ────────────────────────────────────────────────────────────
export default function MapComponent({ hospitals, routeLine, selectedHospitalId }) {
  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden border border-slate-700/60 shadow-2xl">
      {/* Scanline overlay for "command center" aesthetic */}
      <div
        className="pointer-events-none absolute inset-0 z-[1000] opacity-[0.03]"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.5) 2px, rgba(255,255,255,0.5) 4px)",
        }}
      />

      <MapContainer
        center={[EMERGENCY_LOCATION.lat, EMERGENCY_LOCATION.lng]}
        zoom={12}
        style={{ height: "100%", width: "100%", background: "#0f172a" }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />
        <FitBounds hospitals={hospitals} />

        {/* Emergency location marker */}
        <Marker
          position={[EMERGENCY_LOCATION.lat, EMERGENCY_LOCATION.lng]}
          icon={createEmergencyIcon()}
        >
          <Popup className="pulse-popup">
            <div className="text-xs font-mono bg-slate-900 text-red-400 p-2 rounded">
              <div className="font-bold text-red-300 mb-1">🚨 EMERGENCY ORIGIN</div>
              <div>Times Square, Manhattan</div>
              <div className="text-slate-400 mt-1">
                {EMERGENCY_LOCATION.lat.toFixed(4)}°N, {Math.abs(EMERGENCY_LOCATION.lng).toFixed(4)}°W
              </div>
            </div>
          </Popup>
        </Marker>

        {/* Hospital markers */}
        {hospitals.map((h) => {
          const tier = getOccupancyTier(h);
          const isSelected = h.id === selectedHospitalId;
          const available = h.totalBeds - h.occupiedBeds;
          const occupancyPct = Math.round((h.occupiedBeds / h.totalBeds) * 100);
          const dist = getDistanceKm(EMERGENCY_LOCATION.lat, EMERGENCY_LOCATION.lng, h.lat, h.lng);

          return (
            <Marker
              key={h.id}
              position={[h.lat, h.lng]}
              icon={createHospitalIcon(tier, isSelected)}
            >
              <Popup>
                <div className="text-xs font-mono bg-slate-900 text-slate-100 p-2 rounded min-w-[180px]">
                  <div className="font-bold text-white mb-2 text-sm">{h.name}</div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-slate-300">
                    <span className="text-slate-500">Beds Free</span>
                    <span className={available === 0 ? "text-red-400 font-bold" : "text-green-400 font-bold"}>
                      {available} / {h.totalBeds}
                    </span>
                    <span className="text-slate-500">Occupancy</span>
                    <span className={
                      occupancyPct >= 90 ? "text-red-400" :
                      occupancyPct >= 70 ? "text-yellow-400" : "text-green-400"
                    }>{occupancyPct}%</span>
                    <span className="text-slate-500">Distance</span>
                    <span>{dist.toFixed(1)} km</span>
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

        {/* Route polyline */}
        {routeLine && (
          <Polyline
            positions={[
              [EMERGENCY_LOCATION.lat, EMERGENCY_LOCATION.lng],
              [routeLine.lat, routeLine.lng],
            ]}
            pathOptions={{
              color: "#38bdf8",
              weight: 3,
              opacity: 0.9,
              dashArray: "8 6",
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}
