import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Zap, AlertTriangle, Activity,
  Radio, X, CheckCircle, MapPin, Loader2, ArrowLeft
} from "lucide-react";
import MapComponent from "./MapComponent";
import Dashboard from "./Dashboard";
import socket, { BACKEND_URL } from "./socket";

// ─── Toast ───────────────────────────────────────────────────────────────────
function Toast({ message, type = "success", onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4500);
    return () => clearTimeout(t);
  }, [onDismiss]);

  const cfg = {
    success: { bg: "bg-sky-900/90 border-sky-500/50",     icon: <CheckCircle size={16} className="text-sky-400" />,    text: "text-sky-100"   },
    warning: { bg: "bg-amber-900/90 border-amber-500/50", icon: <AlertTriangle size={16} className="text-amber-400" />, text: "text-amber-100" },
    error:   { bg: "bg-red-900/90 border-red-500/50",     icon: <X size={16} className="text-red-400" />,              text: "text-red-100"   },
  }[type] ?? {};

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-sm animate-slide-in ${cfg.bg}`}>
      {cfg.icon}
      <span className={`text-sm font-medium ${cfg.text}`}>{message}</span>
      <button onClick={onDismiss} className="ml-2 opacity-50 hover:opacity-100"><X size={13} /></button>
    </div>
  );
}

// ─── Loading Screen ───────────────────────────────────────────────────────────
function LoadingScreen({ status }) {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-6">
      <div className="relative">
        <div className="w-20 h-20 rounded-full border-2 border-red-500/30 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-red-500/60 animate-ping" />
          <Activity size={32} className="text-red-400 animate-pulse" />
        </div>
      </div>
      <div className="text-center">
        <div className="text-xl font-black tracking-widest text-white mb-2"
          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
          <span className="text-red-400">Pulse</span>Route
        </div>
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <Loader2 size={14} className="animate-spin" />
          {status}
        </div>
      </div>
    </div>
  );
}

// ─── DispatchView ─────────────────────────────────────────────────────────────
export default function DispatchView() {
  const navigate = useNavigate();

  const [hospitals, setHospitals]             = useState([]);
  const [hospitalVersion, setHospitalVersion] = useState(0);
  const [userLocation, setUserLocation]       = useState(null);
  const [loadingStatus, setLoadingStatus]     = useState("Detecting your location…");
  const [ready, setReady]                     = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [routeLine, setRouteLine]             = useState(null);
  const [selectedId, setSelectedId]           = useState(null);
  const [toasts, setToasts]                   = useState([]);

  function addToast(message, type = "success") {
    setToasts(prev => [...prev, { id: Date.now() + Math.random(), message, type }]);
  }
  function removeToast(id) {
    setToasts(prev => prev.filter(t => t.id !== id));
  }

  // ── LIVE TRACKING Bootstrap: watchPosition → fetch hospitals → connect socket
  useEffect(() => {
    const DAHMI_KALAN_CAMPUS = { lat: 26.8429, lng: 75.5654 };
    let hasBootstrapped = false;

    function bootstrap(loc) {
      hasBootstrapped = true;
      setUserLocation(loc);
      setLoadingStatus("Connecting to hospital network…");

      fetch(`${BACKEND_URL}/api/hospitals`)
        .then(r => r.ok ? r.json() : Promise.reject("Backend unreachable"))
        .then(data => { setHospitals(data); setHospitalVersion(v => v + 1); })
        .catch(() => addToast("⚠ Could not reach backend — is server.js running?", "error"));

      setLoadingStatus("Opening real-time channel…");
      socket.connect();
      socket.on("connect", () => { setSocketConnected(true); setReady(true); });
      socket.on("connect_error", () => setReady(true));
      socket.on("disconnect", () => setSocketConnected(false));
      socket.on("hospitalsUpdated", (fresh) => { setHospitals(fresh); setHospitalVersion(v => v + 1); });
    }

    if (!navigator.geolocation) {
      bootstrap(DAHMI_KALAN_CAMPUS);
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const newLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        if (!hasBootstrapped) {
          bootstrap(newLoc);
        } else {
          setUserLocation(newLoc);
        }
      },
      (err) => {
        console.warn("GPS Error, falling back to campus:", err);
        if (!hasBootstrapped) bootstrap(DAHMI_KALAN_CAMPUS);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      socket.off("connect");
      socket.off("connect_error");
      socket.off("disconnect");
      socket.off("hospitalsUpdated");
      socket.disconnect();
    };
  }, []);

  // ── Dispatch → POST, socket broadcast updates state everywhere
  const handleDispatch = useCallback(async (hospital) => {
    setRouteLine({ lat: hospital.lat, lng: hospital.lng });
    setSelectedId(hospital._id);

    // Optimistic UI Update
    setHospitals(prev => prev.map(h =>
      h._id === hospital._id ? { ...h, occupiedBeds: h.occupiedBeds + 1 } : h
    ));

    try {
      const res = await fetch(`${BACKEND_URL}/api/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hospitalId: hospital._id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Dispatch failed");
      addToast(`🚑 Ambulance routed to ${hospital.name}`, "success");
    } catch (err) {
      addToast(`✗ ${err.message}`, "error");
      setHospitals(prev => prev.map(h =>
        h._id === hospital._id ? { ...h, occupiedBeds: h.occupiedBeds - 1 } : h
      ));
    }
  }, []);

  if (!ready) return <LoadingScreen status={loadingStatus} />;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans overflow-hidden"
      style={{ fontFamily: "'IBM Plex Mono', 'JetBrains Mono', monospace" }}>

      {/* ── Header ── */}
      <header className="flex-shrink-0 h-14 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md flex items-center px-4 gap-4 z-50">
        <button onClick={() => navigate("/")}
          className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors mr-1">
          <ArrowLeft size={14} />
        </button>

        <div className="flex items-center gap-2.5 mr-2">
          <div className="relative w-8 h-8">
            <div className="absolute inset-0 bg-red-500/20 rounded-lg animate-ping" style={{ animationDuration: "3s" }} />
            <div className="relative w-8 h-8 bg-red-500/30 border border-red-500/60 rounded-lg flex items-center justify-center">
              <Activity size={16} className="text-red-400" />
            </div>
          </div>
          <div>
            <div className="text-sm font-black tracking-[0.15em] uppercase leading-tight"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.2em" }}>
              <span className="text-red-400">Pulse</span><span className="text-white">Route</span>
            </div>
            <div className="text-[8px] text-slate-500 tracking-[0.3em] uppercase">Emergency ICU Router</div>
          </div>
        </div>

        <div className="h-6 w-px bg-slate-700" />

        <div className={`flex items-center gap-1.5 text-[10px] font-mono ${socketConnected ? "text-green-400" : "text-red-400"}`}>
          <Radio size={10} className={socketConnected ? "animate-pulse" : ""} />
          {socketConnected ? "LIVE SYNC" : "OFFLINE"}
        </div>

        {userLocation && (
          <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-slate-500 font-mono ml-auto">
            <MapPin size={10} className="text-sky-500" />
            {userLocation.lat.toFixed(4)}°N · {Math.abs(userLocation.lng).toFixed(4)}°E
          </div>
        )}
      </header>

      {/* ── Split layout ── */}
      <main className="flex flex-1 overflow-hidden">
        <div className="relative flex-[3] p-3">
          <div className="absolute top-5 left-5 z-[999]">
            <div className="bg-slate-900/85 border border-slate-700/60 rounded-lg px-3 py-1.5 backdrop-blur-sm flex items-center gap-2">
              <Zap size={11} className="text-amber-400" />
              <span className="text-[10px] text-slate-400 font-mono tracking-wider uppercase">Live Network Map</span>
            </div>
          </div>
          <div className="absolute bottom-5 left-5 z-[999] bg-slate-900/85 border border-slate-700/60 rounded-lg px-3 py-2 backdrop-blur-sm">
            <div className="text-[9px] text-slate-500 tracking-widest uppercase mb-1.5">Occupancy</div>
            {[
              { color: "#22c55e", label: "< 70%  Available" },
              { color: "#eab308", label: "70–89% Moderate" },
              { color: "#ef4444", label: "≥ 90%  Critical"  },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-2 mb-0.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-[10px] text-slate-400 font-mono">{label}</span>
              </div>
            ))}
          </div>
          <MapComponent hospitals={hospitals} routeLine={routeLine}
            selectedHospitalId={selectedId} userLocation={userLocation} />
        </div>

        <div className="flex-[2] p-3 pl-0 overflow-hidden flex flex-col">
          <Dashboard hospitals={hospitals} userLocation={userLocation}
            onDispatch={handleDispatch} hospitalVersion={hospitalVersion} />
        </div>
      </main>

      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 items-end">
        {toasts.map(t => (
          <Toast key={t.id} message={t.message} type={t.type} onDismiss={() => removeToast(t.id)} />
        ))}
      </div>
    </div>
  );
}
