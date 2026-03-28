import { Routes, Route } from "react-router-dom";
import LandingPage from "./LandingPage";
import DispatchView from "./DispatchView";
import AdminDashboard from "./AdminDashboard";

// ─── App: Thin Router Shell ──────────────────────────────────────────────────
export default function App() {
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
    const JAIPUR_FALLBACK = { lat: 26.9124, lng: 75.7873 };
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
      socket.on("connect_error", () => setReady(true));   // show UI even if socket fails
      socket.on("disconnect", () => setSocketConnected(false));
      socket.on("hospitalsUpdated", (fresh) => { setHospitals(fresh); setHospitalVersion(v => v + 1); });
    }

    if (!navigator.geolocation) {
      bootstrap(JAIPUR_FALLBACK);
      return;
    }

    // This is the new Live Tracker that fires every time your GPS moves
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const newLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        if (!hasBootstrapped) {
          bootstrap(newLoc); // Only run the full boot sequence the very first time
        } else {
          setUserLocation(newLoc); // Afterwards, just silently update the map pin!
        }
      },
      (err) => {
        console.warn("GPS Error:", err);
        if (!hasBootstrapped) bootstrap(JAIPUR_FALLBACK);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );

    // Cleanup when app closes
    return () => {
      navigator.geolocation.clearWatch(watchId);
      socket.disconnect();
    };
  }, []);

  // ── Dispatch → POST, socket broadcast updates state everywhere
  const handleDispatch = useCallback(async (hospital) => {
    setRouteLine({ lat: hospital.lat, lng: hospital.lng });
    setSelectedId(hospital._id); // Make sure this matches MongoDB _id if you use it in MapComponent
    try {
      const res  = await fetch(`${BACKEND_URL}/api/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hospitalId: hospital._id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Dispatch failed");
      addToast(`🚑 Ambulance routed to ${hospital.name}`, "success");
    } catch (err) {
      addToast(`✗ ${err.message}`, "error");
    }
  }, []);

  if (!ready) return <LoadingScreen status={loadingStatus} />;

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

        /* Hide the ugly text directions box generated by Leaflet Routing Machine */
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
      {/* ── Header ── */}
      <header className="flex-shrink-0 h-14 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md flex items-center px-4 gap-4 z-50">
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
              <span className="text-[10px] text-slate-400 font-mono tracking-wider uppercase">Live Network Map — Jaipur</span>
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
          <Dashboard hospitals={hospitals} userLocation={userLocation} onDispatch={handleDispatch} hospitalVersion={hospitalVersion} />
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