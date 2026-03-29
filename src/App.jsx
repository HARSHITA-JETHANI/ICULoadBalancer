import { Routes, Route } from "react-router-dom";
import LandingPage from "./LandingPage";
import DispatchView from "./DispatchView";
import AdminDashboard from "./AdminDashboard";

// ─── App: Thin Router Shell ──────────────────────────────────────────────────
export default function App() {
  return (
    <>
      {/* ── Global styles ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;700&family=Barlow+Condensed:wght@400;700;900&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; background: #020617; }
        .leaflet-container { background: #0f172a !important; }
        .leaflet-popup-content-wrapper { background: transparent !important; border: none !important; box-shadow: none !important; padding: 0 !important; }
        .leaflet-popup-tip-container { display: none; }
        .leaflet-popup-content { margin: 0 !important; }

        .leaflet-tooltip.map-label {
          background-color: #0f172a;
          border: 1px solid #334155;
          font-family: 'IBM Plex Mono', monospace;
          font-weight: 600;
          font-size: 11px;
          padding: 4px 8px;
          border-radius: 6px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.5);
        }
        .leaflet-tooltip.origin-label { color: #f87171; border-color: #7f1d1d; }
        .leaflet-tooltip.dest-label   { color: #38bdf8; border-color: #0c4a6e; }
        .leaflet-tooltip-bottom.map-label::before { border-bottom-color: #334155; }
        .leaflet-routing-container { display: none !important; }

        input[type=range]::-webkit-slider-thumb { appearance: none; width: 16px; height: 16px; border-radius: 50%; background: white; cursor: pointer; box-shadow: 0 0 0 3px rgba(14,165,233,0.4); }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0f172a; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }

        @keyframes slide-in { from { transform: translateX(100%) scale(0.95); opacity:0; } to { transform:translateX(0) scale(1); opacity:1; } }
        .animate-slide-in { animation: slide-in 0.25s cubic-bezier(0.34,1.56,0.64,1) forwards; }
      `}</style>

      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dispatch" element={<DispatchView />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </>
  );
}