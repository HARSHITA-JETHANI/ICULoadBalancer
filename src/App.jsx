import { useState, useCallback, useEffect } from "react";
import {
  Zap, BedDouble, AlertTriangle, Activity,
  Radio, X, CheckCircle, Siren
} from "lucide-react";
import MapComponent from "./MapComponent";
import Dashboard from "./Dashboard";
import { INITIAL_HOSPITALS } from "./utils";

// ─── Toast Component ─────────────────────────────────────────────────────────
function Toast({ message, type = "success", onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4500);
    return () => clearTimeout(t);
  }, [onDismiss]);

  const cfg = {
    success: { bg: "bg-sky-900/90 border-sky-500/50",  icon: <CheckCircle size={16} className="text-sky-400" />, text: "text-sky-100" },
    warning: { bg: "bg-amber-900/90 border-amber-500/50", icon: <AlertTriangle size={16} className="text-amber-400" />, text: "text-amber-100" },
  }[type];

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-sm animate-slide-in ${cfg.bg}`}>
      {cfg.icon}
      <span className={`text-sm font-medium ${cfg.text}`}>{message}</span>
      <button onClick={onDismiss} className="ml-2 opacity-50 hover:opacity-100">
        <X size={13} />
      </button>
    </div>
  );
}

// ─── Stat Pill ───────────────────────────────────────────────────────────────
function StatPill({ label, value, accent, icon }) {
  return (
    <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/50 rounded-lg px-3 py-2">
      <div className={`text-lg font-black font-mono ${accent}`}>{value}</div>
      <div>
        <div className="text-[9px] text-slate-500 tracking-widest uppercase leading-tight">{label}</div>
      </div>
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────
export default function App() {
  const [hospitals, setHospitals] = useState(INITIAL_HOSPITALS);
  const [routeLine, setRouteLine]  = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [toasts, setToasts]         = useState([]);
  const [surging, setSurging]       = useState(false);

  // Derived stats
  const totalBeds     = hospitals.reduce((s, h) => s + h.totalBeds, 0);
  const occupiedBeds  = hospitals.reduce((s, h) => s + h.occupiedBeds, 0);
  const availableBeds = totalBeds - occupiedBeds;
  const criticalCount = hospitals.filter(h => h.occupiedBeds / h.totalBeds >= 0.9).length;

  function addToast(message, type = "success") {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  }
  function removeToast(id) {
    setToasts(prev => prev.filter(t => t.id !== id));
  }

  // Dispatch handler — draw route, increment beds, show toast
  const handleDispatch = useCallback((hospital) => {
    setRouteLine({ lat: hospital.lat, lng: hospital.lng });
    setSelectedId(hospital.id);
    setHospitals(prev =>
      prev.map(h =>
        h.id === hospital.id && h.occupiedBeds < h.totalBeds
          ? { ...h, occupiedBeds: h.occupiedBeds + 1 }
          : h
      )
    );
    addToast(`🚑 Ambulance routed to ${hospital.name}`, "success");
  }, []);

  // Surge simulation
  function handleSurge() {
    setSurging(true);
    setHospitals(prev =>
      prev.map(h => {
        const delta = Math.floor(Math.random() * 8) + 3; // 3-10
        return {
          ...h,
          occupiedBeds: Math.min(h.totalBeds, h.occupiedBeds + delta),
        };
      })
    );
    addToast("⚠ Mass Casualty Event simulated — network load updated", "warning");
    setTimeout(() => setSurging(false), 1500);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans overflow-hidden" style={{ fontFamily: "'IBM Plex Mono', 'JetBrains Mono', monospace" }}>
      {/* ── Google Font import via style tag ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;700&family=Barlow+Condensed:wght@400;700;900&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; background: #020617; }
        .leaflet-container { background: #0f172a !important; }
        .leaflet-popup-content-wrapper { background: transparent !important; border: none !important; box-shadow: none !important; padding: 0 !important; }
        .leaflet-popup-tip-container { display: none; }
        .leaflet-popup-content { margin: 0 !important; }
        input[type=range]::-webkit-slider-thumb { appearance: none; width: 16px; height: 16px; border-radius: 50%; background: white; cursor: pointer; box-shadow: 0 0 0 3px rgba(14,165,233,0.4); }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: #0f172a; } ::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
        @keyframes slide-in { from { transform: translateX(100%) scale(0.95); opacity: 0; } to { transform: translateX(0) scale(1); opacity: 1; } }
        .animate-slide-in { animation: slide-in 0.25s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        @keyframes surge-flash { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        .surge-active { animation: surge-flash 0.4s ease-in-out 3; }
      `}</style>

      {/* ══ TOP BAR ═══════════════════════════════════════════════════════════ */}
      <header className="flex-shrink-0 h-14 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md flex items-center px-4 gap-4 z-50">
        {/* Logo + Title */}
        <div className="flex items-center gap-2.5 mr-2">
          <div className="relative w-8 h-8">
            <div className="absolute inset-0 bg-red-500/20 rounded-lg animate-ping" style={{ animationDuration: "3s" }} />
            <div className="relative w-8 h-8 bg-red-500/30 border border-red-500/60 rounded-lg flex items-center justify-center">
              <Activity size={16} className="text-red-400" />
            </div>
          </div>
          <div>
            <div className="text-sm font-black tracking-[0.15em] uppercase leading-tight" style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.2em" }}>
              <span className="text-red-400">Pulse</span><span className="text-white">Route</span>
            </div>
            <div className="text-[8px] text-slate-500 tracking-[0.3em] uppercase">Emergency ICU Router</div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-slate-700" />

        {/* Live indicator */}
        <div className="flex items-center gap-1.5 text-[10px] text-green-400 font-mono">
          <Radio size={10} className="animate-pulse" />
          SYSTEM ONLINE
        </div>

        {/* Stats */}
        <div className="flex items-center gap-2 ml-auto">
          <StatPill
            label="Beds Available"
            value={availableBeds}
            accent={availableBeds < 20 ? "text-red-400" : "text-green-400"}
          />
          <StatPill
            label="Total Capacity"
            value={`${Math.round((occupiedBeds / totalBeds) * 100)}%`}
            accent="text-sky-400"
          />
          <StatPill
            label="Critical Hospitals"
            value={criticalCount}
            accent={criticalCount > 2 ? "text-red-400" : "text-slate-300"}
          />
        </div>

        {/* Surge button */}
        <button
          onClick={handleSurge}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border font-bold text-xs tracking-wider transition-all active:scale-95 ml-2 ${
            surging
              ? "bg-red-500/30 border-red-500 text-red-300 surge-active"
              : "bg-red-500/10 border-red-500/40 text-red-400 hover:bg-red-500/20 hover:border-red-500/70"
          }`}
        >
          <AlertTriangle size={13} />
          SIMULATE MCI
        </button>
      </header>

      {/* ══ MAIN SPLIT LAYOUT ════════════════════════════════════════════════ */}
      <main className="flex flex-1 overflow-hidden">
        {/* Left — Map (60%) */}
        <div className="relative flex-[3] p-3">
          {/* Map header */}
          <div className="absolute top-5 left-5 z-[999] flex items-center gap-2">
            <div className="bg-slate-900/85 border border-slate-700/60 rounded-lg px-3 py-1.5 backdrop-blur-sm flex items-center gap-2">
              <Zap size={11} className="text-amber-400" />
              <span className="text-[10px] text-slate-400 font-mono tracking-wider uppercase">Live Network Map</span>
            </div>
          </div>

          {/* Legend */}
          <div className="absolute bottom-5 left-5 z-[999] bg-slate-900/85 border border-slate-700/60 rounded-lg px-3 py-2 backdrop-blur-sm">
            <div className="text-[9px] text-slate-500 tracking-widest uppercase mb-1.5">Occupancy</div>
            {[
              { color: "#22c55e", label: "< 70%  Available" },
              { color: "#eab308", label: "70–89% Moderate" },
              { color: "#ef4444", label: "≥ 90%  Critical" },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-2 mb-0.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-[10px] text-slate-400 font-mono">{label}</span>
              </div>
            ))}
            <div className="mt-1.5 pt-1.5 border-t border-slate-700 flex items-center gap-2">
              <div className="w-2.5 h-0.5 bg-sky-400 rounded" style={{ backgroundImage: "repeating-linear-gradient(90deg, #38bdf8 0,#38bdf8 6px,transparent 6px,transparent 10px)" }} />
              <span className="text-[10px] text-slate-400 font-mono">Active Route</span>
            </div>
          </div>

          <MapComponent
            hospitals={hospitals}
            routeLine={routeLine}
            selectedHospitalId={selectedId}
          />
        </div>

        {/* Right — Dashboard (40%) */}
        <div className="flex-[2] p-3 pl-0 overflow-hidden flex flex-col">
          <Dashboard hospitals={hospitals} onDispatch={handleDispatch} />
        </div>
      </main>

      {/* ══ TOAST STACK ══════════════════════════════════════════════════════ */}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 items-end">
        {toasts.map(t => (
          <Toast key={t.id} message={t.message} type={t.type} onDismiss={() => removeToast(t.id)} />
        ))}
      </div>
    </div>
  );
}
