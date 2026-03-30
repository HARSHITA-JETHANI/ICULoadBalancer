import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity, ArrowLeft, Building2, Radio, Save, Wind,
  AlertTriangle, CheckCircle, X, Search, ChevronDown, LogIn, LogOut,
  Bed, Loader2, Clock, Users, Siren, UserCheck, History
} from "lucide-react";
import socket, { BACKEND_URL } from "./socket";

// ─── Alarm Sound (Web Audio API) ─────────────────────────────────────────────
function playAlarmSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();

    function beep(startTime, freq = 880, duration = 0.15) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = "square";
      gain.gain.setValueAtTime(0.3, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      osc.start(startTime);
      osc.stop(startTime + duration);
    }

    const now = ctx.currentTime;
    [0, 0.2, 0.4, 0.8, 1.0, 1.2].forEach(offset => {
      beep(now + offset, 880, 0.15);
    });
  } catch (e) {
    console.warn("Audio playback failed:", e);
  }
}

// ─── Status Badge Component ──────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = {
    "En Route":       { bg: "bg-red-500/20",    border: "border-red-500/50",    text: "text-red-400",    dot: "bg-red-400",    glow: true },
    "Preparing Bed":  { bg: "bg-amber-500/20",  border: "border-amber-500/50",  text: "text-amber-400",  dot: "bg-amber-400",  glow: false },
    "Admitted":       { bg: "bg-green-500/20",  border: "border-green-500/50",  text: "text-green-400",  dot: "bg-green-400",  glow: false },
    "Discharged":     { bg: "bg-slate-500/20",  border: "border-slate-500/50",  text: "text-slate-400",  dot: "bg-slate-400",  glow: false },
  }[status] ?? { bg: "bg-slate-500/20", border: "border-slate-500/50", text: "text-slate-400", dot: "bg-slate-400", glow: false };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border ${cfg.bg} ${cfg.border} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${cfg.glow ? "animate-pulse" : ""}`} />
      {status}
    </span>
  );
}

// ─── Severity Badge Component ────────────────────────────────────────────────
function SeverityBadge({ severity }) {
  const cfg = {
    "Critical": { bg: "bg-red-500/15",    text: "text-red-400",    icon: "🔴" },
    "Severe":   { bg: "bg-orange-500/15", text: "text-orange-400", icon: "🟠" },
    "Moderate": { bg: "bg-yellow-500/15", text: "text-yellow-400", icon: "🟡" },
  }[severity] ?? { bg: "bg-slate-500/15", text: "text-slate-400", icon: "⚪" };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase ${cfg.bg} ${cfg.text}`}>
      {cfg.icon} {severity}
    </span>
  );
}

// ─── Searchable Hospital Dropdown ────────────────────────────────────────────
function HospitalDropdown({ hospitals, selected, onSelect }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = hospitals.filter(h =>
    h.name.toLowerCase().includes(search.toLowerCase())
  );

  const selectedName = selected
    ? hospitals.find(h => h._id === selected)?.name ?? "Unknown"
    : null;

  return (
    <div ref={ref} className="relative w-full">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3
                   bg-slate-800/70 border border-slate-700/60 rounded-xl text-left
                   hover:border-sky-500/40 transition-colors"
      >
        <span className={selectedName ? "text-white text-sm" : "text-slate-500 text-sm"}>
          {selectedName || "Select your hospital…"}
        </span>
        <ChevronDown size={16} className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-full bg-slate-800 border border-slate-700/60 rounded-xl
                        shadow-2xl overflow-hidden animate-slide-in">
          <div className="p-2 border-b border-slate-700/40">
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-900/60 rounded-lg">
              <Search size={14} className="text-slate-500" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search hospitals…"
                autoFocus
                className="bg-transparent text-sm text-white placeholder-slate-500 outline-none flex-1"
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-3 text-slate-500 text-sm">No hospitals found</div>
            ) : (
              filtered.map(h => (
                <button
                  key={h._id}
                  onClick={() => { onSelect(h._id); setOpen(false); setSearch(""); }}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-sky-500/10 transition-colors flex items-center gap-3
                    ${h._id === selected ? "bg-sky-500/15 text-sky-300" : "text-slate-300"}`}
                >
                  <Building2 size={14} className="text-slate-500 flex-shrink-0" />
                  <span className="truncate">{h.name}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Incoming Patient Alert Modal (Enhanced) ─────────────────────────────────
function IncomingAlertModal({ alert, onAccept }) {
  if (!alert) return null;

  const ts = new Date(alert.timestamp).toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true
  });

  const eta = alert.estimatedArrival
    ? new Date(alert.estimatedArrival).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
    : "—";

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-alert-bg">
      <div className="relative bg-slate-900 border-2 border-red-500 rounded-2xl p-8 sm:p-12 max-w-lg w-[90%]
                      shadow-[0_0_80px_-10px_rgba(239,68,68,0.6)] animate-alert-card">
        {/* Flashing border effect */}
        <div className="absolute inset-0 rounded-2xl border-2 border-red-500 animate-ping opacity-30 pointer-events-none" />

        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🚨</div>
          <h2 className="text-2xl sm:text-3xl font-black text-red-400 tracking-wider uppercase mb-3"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            URGENT: INCOMING PATIENT
          </h2>

          {/* Enhanced Info Grid */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">
              <div className="text-red-300 text-[9px] font-mono tracking-widest uppercase mb-0.5">Dispatched</div>
              <div className="text-white text-lg font-black font-mono">{ts}</div>
            </div>
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">
              <div className="text-red-300 text-[9px] font-mono tracking-widest uppercase mb-0.5">ETA</div>
              <div className="text-white text-lg font-black font-mono">{eta}</div>
            </div>
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">
              <div className="text-red-300 text-[9px] font-mono tracking-widest uppercase mb-0.5">Patient ID</div>
              <div className="text-white text-sm font-bold font-mono">{alert.patientId || "—"}</div>
            </div>
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">
              <div className="text-red-300 text-[9px] font-mono tracking-widest uppercase mb-0.5">Severity</div>
              <div className="mt-0.5"><SeverityBadge severity={alert.severity || "Critical"} /></div>
            </div>
          </div>

          <p className="text-slate-400 text-sm mb-6 font-mono">
            Prepare bed immediately. Ambulance is en route to your facility.
          </p>

          <div className="flex gap-3 justify-center">
            <button
              onClick={onAccept}
              className="px-8 py-3 rounded-xl bg-green-500 hover:bg-green-400 text-white font-bold
                         tracking-wider uppercase transition-all active:scale-95 shadow-lg shadow-green-500/30
                         flex items-center gap-2"
            >
              <UserCheck size={18} />
              ACCEPT PATIENT
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Patient Record Card (for mobile / compact view) ─────────────────────────
function PatientCard({ patient, onUpdateStatus }) {
  const ts = new Date(patient.timestamp).toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true
  });
  const eta = patient.estimatedArrival
    ? new Date(patient.estimatedArrival).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
    : "—";

  const isEnRoute = patient.status === "En Route";

  return (
    <div className={`relative bg-slate-800/60 border rounded-xl p-4 transition-all duration-300 group
      ${isEnRoute
        ? "border-red-500/40 shadow-[0_0_20px_-5px_rgba(239,68,68,0.3)] animate-en-route-glow"
        : patient.status === "Preparing Bed"
          ? "border-amber-500/30"
          : patient.status === "Admitted"
            ? "border-green-500/30"
            : "border-slate-700/40"
      }`}>
      {/* En Route scanning line effect */}
      {isEnRoute && (
        <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-red-500/5 via-transparent to-transparent animate-scan-line" />
        </div>
      )}

      <div className="relative z-10">
        {/* Top row: Patient ID + Status */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-white text-sm font-bold font-mono">{patient.patientId || "—"}</span>
            <SeverityBadge severity={patient.severity || "Critical"} />
          </div>
          <StatusBadge status={patient.status} />
        </div>

        {/* Info row */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <div className="text-[9px] text-slate-500 tracking-widest uppercase">Dispatched</div>
            <div className="text-xs text-slate-300 font-mono">{ts}</div>
          </div>
          <div>
            <div className="text-[9px] text-slate-500 tracking-widest uppercase">ETA</div>
            <div className="text-xs text-slate-300 font-mono">{eta}</div>
          </div>
          <div>
            <div className="text-[9px] text-slate-500 tracking-widest uppercase">Origin</div>
            <div className="text-xs text-slate-300 font-mono truncate">{patient.origin || "Dispatch"}</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {patient.status === "En Route" && (
            <button
              onClick={() => onUpdateStatus(patient, "Preparing Bed")}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg
                         bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-bold
                         tracking-wider uppercase hover:bg-amber-500/25 transition-all active:scale-[0.97]"
            >
              <Bed size={12} /> Prepare Bed
            </button>
          )}
          {(patient.status === "En Route" || patient.status === "Preparing Bed") && (
            <button
              onClick={() => onUpdateStatus(patient, "Admitted")}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg
                         bg-green-500/15 border border-green-500/30 text-green-400 text-[10px] font-bold
                         tracking-wider uppercase hover:bg-green-500/25 transition-all active:scale-[0.97]"
            >
              <UserCheck size={12} /> Mark Admitted
            </button>
          )}
          {patient.status === "Admitted" && (
            <button
              onClick={() => onUpdateStatus(patient, "Discharged")}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg
                         bg-slate-500/15 border border-slate-500/30 text-slate-400 text-[10px] font-bold
                         tracking-wider uppercase hover:bg-slate-500/25 transition-all active:scale-[0.97]"
            >
              <LogOut size={12} /> Discharge
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Admin Dashboard ─────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate = useNavigate();

  const [hospitals, setHospitals]         = useState([]);
  const [loading, setLoading]             = useState(true);
  const [loggedInId, setLoggedInId]       = useState(null);
  const [selectedId, setSelectedId]       = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [saving, setSaving]               = useState(false);
  const [saveSuccess, setSaveSuccess]     = useState(false);
  const [incomingAlert, setIncomingAlert] = useState(null);

  // ── NEW: Incoming patients state ──
  const [incomingPatients, setIncomingPatients] = useState([]);
  const [registryTab, setRegistryTab] = useState("active"); // "active" | "history"

  // Editable fields
  const [editTotalBeds, setEditTotalBeds]       = useState(0);
  const [editOccupiedBeds, setEditOccupiedBeds] = useState(0);
  const [editHasVent, setEditHasVent]           = useState(false);

  // Ref for the logged-in ID so the socket callback always sees the latest value
  const loggedInRef = useRef(null);
  loggedInRef.current = loggedInId;

  // ── Fetch hospitals + connect socket ──
  useEffect(() => {
    fetch(`${BACKEND_URL}/api/hospitals`)
      .then(r => r.json())
      .then(data => { setHospitals(data); setLoading(false); })
      .catch(() => setLoading(false));

    socket.connect();

    function onConnect()    { setSocketConnected(true); }
    function onDisconnect() { setSocketConnected(false); }
    function onHospitalsUpdated(fresh) { setHospitals(fresh); }
    function onIncomingPatient(data) {
      if (data.hospitalId === loggedInRef.current) {
        playAlarmSound();
        setIncomingAlert(data);
        // Also append to the patient registry
        setIncomingPatients(prev => {
          // De-duplicate by _id
          if (prev.some(p => p._id === data._id)) return prev;
          return [data, ...prev];
        });
      }
    }
    function onDispatchStatusUpdated(record) {
      // Update local state when status is changed (e.g. from another tab)
      setIncomingPatients(prev =>
        prev.map(p => (p._id === record._id ? { ...p, status: record.status } : p))
      );
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("hospitalsUpdated", onHospitalsUpdated);
    socket.on("incomingPatient", onIncomingPatient);
    socket.on("dispatchStatusUpdated", onDispatchStatusUpdated);

    if (socket.connected) setSocketConnected(true);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("hospitalsUpdated", onHospitalsUpdated);
      socket.off("incomingPatient", onIncomingPatient);
      socket.off("dispatchStatusUpdated", onDispatchStatusUpdated);
      socket.disconnect();
    };
  }, []);

  // ── Load dispatch history when hospital is logged in ──
  useEffect(() => {
    if (!loggedInId) {
      setIncomingPatients([]);
      return;
    }
    fetch(`${BACKEND_URL}/api/dispatches/${loggedInId}`)
      .then(r => r.json())
      .then(records => {
        const mapped = records.map(r => ({
          _id:              r._id,
          hospitalId:       r.hospitalId,
          hospitalName:     r.hospitalName,
          patientId:        r.patientId,
          severity:         r.severity,
          origin:           r.origin,
          status:           r.status,
          estimatedArrival: r.estimatedArrival,
          timestamp:        r.dispatchedAt || r.createdAt,
        }));
        setIncomingPatients(mapped);
      })
      .catch(err => console.warn("Failed to load dispatch history:", err));
  }, [loggedInId]);

  // ── Sync editable fields when hospital data changes or login changes ──
  useEffect(() => {
    if (!loggedInId) return;
    const h = hospitals.find(h => h._id === loggedInId);
    if (h) {
      setEditTotalBeds(h.totalBeds);
      setEditOccupiedBeds(h.occupiedBeds);
      setEditHasVent(h.hasVentilators);
    }
  }, [loggedInId, hospitals]);

  const myHospital = loggedInId ? hospitals.find(h => h._id === loggedInId) : null;

  // ── Login handler ──
  function handleLogin() {
    if (!selectedId) return;
    setLoggedInId(selectedId);
  }

  // ── Logout handler ──
  function handleLogout() {
    setLoggedInId(null);
    setSelectedId(null);
  }

  // ── Accept patient from modal: dismiss alarm + update status to "Preparing Bed" ──
  async function handleAcceptPatient() {
    if (!incomingAlert) return;
    const alertData = incomingAlert;
    setIncomingAlert(null); // dismiss modal

    // Update local state optimistically
    setIncomingPatients(prev =>
      prev.map(p => p._id === alertData._id ? { ...p, status: "Preparing Bed" } : p)
    );

    // Persist to backend
    try {
      await fetch(`${BACKEND_URL}/api/dispatches/${alertData._id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Preparing Bed" }),
      });
    } catch (err) {
      console.warn("Failed to update dispatch status:", err);
    }
  }

  // ── Update patient status (from card actions) ──
  async function handleUpdateStatus(patient, newStatus) {
    // Optimistic
    setIncomingPatients(prev =>
      prev.map(p => p._id === patient._id ? { ...p, status: newStatus } : p)
    );

    try {
      await fetch(`${BACKEND_URL}/api/dispatches/${patient._id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch (err) {
      console.warn("Failed to update status:", err);
      // Revert
      setIncomingPatients(prev =>
        prev.map(p => p._id === patient._id ? { ...p, status: patient.status } : p)
      );
    }
  }

  // ── Save updates via PUT ──
  const handleSave = useCallback(async () => {
    if (!loggedInId) return;
    setSaving(true);
    setSaveSuccess(false);

    try {
      const res = await fetch(`${BACKEND_URL}/api/hospitals/${loggedInId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          totalBeds: editTotalBeds,
          occupiedBeds: editOccupiedBeds,
          hasVentilators: editHasVent,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      alert("Error saving: " + err.message);
    } finally {
      setSaving(false);
    }
  }, [loggedInId, editTotalBeds, editOccupiedBeds, editHasVent]);

  const occupancyPct = myHospital
    ? Math.round((myHospital.occupiedBeds / myHospital.totalBeds) * 100)
    : 0;
  const available = myHospital ? myHospital.totalBeds - myHospital.occupiedBeds : 0;

  // ── Filter patients by tab ──
  const activePatients  = incomingPatients.filter(p => ["En Route", "Preparing Bed"].includes(p.status));
  const historyPatients = incomingPatients.filter(p => ["Admitted", "Discharged"].includes(p.status));
  const displayPatients = registryTab === "active" ? activePatients : historyPatients;

  // ─── Loading state ──
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center"
        style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
        <Loader2 size={32} className="text-sky-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col"
      style={{ fontFamily: "'IBM Plex Mono', 'JetBrains Mono', monospace" }}>

      {/* Alert Modal */}
      <IncomingAlertModal alert={incomingAlert} onAccept={handleAcceptPatient} />

      {/* ── Custom animations ── */}
      <style>{`
        @keyframes alert-bg { from { opacity: 0; } to { opacity: 1; } }
        .animate-alert-bg { animation: alert-bg 0.2s ease-out forwards; }
        @keyframes alert-card { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .animate-alert-card { animation: alert-card 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        @keyframes slide-in { from { transform: translateX(100%) scale(0.95); opacity:0; } to { transform:translateX(0) scale(1); opacity:1; } }
        .animate-slide-in { animation: slide-in 0.25s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        @keyframes en-route-glow {
          0%, 100% { box-shadow: 0 0 15px -5px rgba(239,68,68,0.25); }
          50% { box-shadow: 0 0 30px -5px rgba(239,68,68,0.5); }
        }
        .animate-en-route-glow { animation: en-route-glow 2s ease-in-out infinite; }
        @keyframes scan-line {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(200%); }
        }
        .animate-scan-line { animation: scan-line 3s linear infinite; }
        @keyframes count-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        .animate-count-pulse { animation: count-pulse 2s ease-in-out infinite; }
        @keyframes fade-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
      `}</style>

      {/* ── Header ── */}
      <header className="flex-shrink-0 h-14 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md flex items-center px-4 gap-4 z-50">
        <button onClick={() => navigate("/")}
          className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors mr-1">
          <ArrowLeft size={14} />
        </button>

        <div className="flex items-center gap-2.5 mr-2">
          <div className="relative w-8 h-8">
            <div className="relative w-8 h-8 bg-sky-500/30 border border-sky-500/60 rounded-lg flex items-center justify-center">
              <Building2 size={16} className="text-sky-400" />
            </div>
          </div>
          <div>
            <div className="text-sm font-black tracking-[0.15em] uppercase leading-tight"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.2em" }}>
              <span className="text-sky-400">Hospital</span><span className="text-white"> Portal</span>
            </div>
            <div className="text-[8px] text-slate-500 tracking-[0.3em] uppercase">Admin Dashboard</div>
          </div>
        </div>

        <div className="h-6 w-px bg-slate-700" />

        <div className={`flex items-center gap-1.5 text-[10px] font-mono ${socketConnected ? "text-green-400" : "text-red-400"}`}>
          <Radio size={10} className={socketConnected ? "animate-pulse" : ""} />
          {socketConnected ? "LIVE SYNC" : "OFFLINE"}
        </div>

        {/* Active patient counter in header */}
        {loggedInId && activePatients.length > 0 && (
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-red-400 animate-count-pulse">
            <Siren size={10} />
            {activePatients.length} ACTIVE
          </div>
        )}

        {loggedInId && (
          <button onClick={handleLogout}
            className="ml-auto flex items-center gap-1.5 text-[10px] text-slate-400 hover:text-red-400 font-mono transition-colors">
            <LogOut size={10} />
            LOGOUT
          </button>
        )}
      </header>

      {/* ── Main Content ── */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-8">
        {!loggedInId ? (
          /* ─── Login Screen ─── */
          <div className="flex items-center justify-center min-h-[calc(100vh-3.5rem)]">
            <div className="w-full max-w-md">
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8 backdrop-blur-xl
                              shadow-[0_0_60px_-15px_rgba(56,189,248,0.15)]">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-sky-500/15 border border-sky-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Building2 size={28} className="text-sky-400" />
                  </div>
                  <h2 className="text-2xl font-black tracking-wider text-white uppercase mb-1"
                    style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                    Hospital Login
                  </h2>
                  <p className="text-slate-500 text-xs tracking-wider">
                    Select your facility to access the admin panel
                  </p>
                </div>

                <div className="mb-6">
                  <label className="text-[10px] text-slate-500 tracking-widest uppercase block mb-2">
                    Your Hospital
                  </label>
                  <HospitalDropdown
                    hospitals={hospitals}
                    selected={selectedId}
                    onSelect={setSelectedId}
                  />
                </div>

                <button
                  onClick={handleLogin}
                  disabled={!selectedId}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
                             bg-sky-500 hover:bg-sky-400 disabled:bg-slate-700 disabled:text-slate-500
                             text-white font-bold tracking-wider uppercase text-sm
                             transition-all active:scale-[0.97] shadow-lg shadow-sky-500/20
                             disabled:shadow-none disabled:cursor-not-allowed"
                >
                  <LogIn size={16} />
                  Access Portal
                </button>
              </div>
            </div>
          </div>
        ) : myHospital ? (
          /* ─── Dashboard ─── */
          <div className="w-full max-w-4xl mx-auto space-y-6">
            {/* Hospital Identity */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-xl">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-sky-500/15 border border-sky-500/30 rounded-xl flex items-center justify-center">
                  <Building2 size={22} className="text-sky-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-black text-white tracking-wider truncate"
                    style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                    {myHospital.name}
                  </h2>
                  <div className="text-[10px] text-slate-500 font-mono tracking-wider">
                    ID: {myHospital._id}
                  </div>
                </div>
              </div>

              {/* Live Stats Row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-4 text-center">
                  <div className="text-[9px] text-slate-500 tracking-widest uppercase mb-1">Occupancy</div>
                  <div className={`text-2xl font-black font-mono ${occupancyPct >= 90 ? "text-red-400" : occupancyPct >= 70 ? "text-yellow-400" : "text-green-400"}`}>
                    {occupancyPct}%
                  </div>
                </div>
                <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-4 text-center">
                  <div className="text-[9px] text-slate-500 tracking-widest uppercase mb-1">Beds Free</div>
                  <div className={`text-2xl font-black font-mono ${available === 0 ? "text-red-400" : available <= 5 ? "text-amber-400" : "text-green-400"}`}>
                    {available}
                  </div>
                </div>
                <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-4 text-center">
                  <div className="text-[9px] text-slate-500 tracking-widest uppercase mb-1">Ventilators</div>
                  <div className={`text-2xl font-black ${myHospital.hasVentilators ? "text-sky-400" : "text-slate-600"}`}>
                    {myHospital.hasVentilators ? "✓" : "✗"}
                  </div>
                </div>
              </div>

              {/* Occupancy bar */}
              <div className="mt-4 w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(occupancyPct, 100)}%`,
                    backgroundColor: occupancyPct >= 90 ? "#ef4444" : occupancyPct >= 70 ? "#eab308" : "#22c55e"
                  }}
                />
              </div>
            </div>

            {/* ── Edit Panel ── */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-xl">
              <h3 className="text-sm font-bold tracking-widest text-slate-300 uppercase mb-5 flex items-center gap-2">
                <Activity size={14} className="text-sky-400" />
                Update Hospital Data
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {/* Total Beds */}
                <div>
                  <label className="text-[10px] text-slate-500 tracking-widest uppercase block mb-1.5">
                    Total Beds
                  </label>
                  <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-700/40 rounded-lg px-3 py-2">
                    <Bed size={14} className="text-slate-500" />
                    <input
                      type="number"
                      min={0}
                      value={editTotalBeds}
                      onChange={e => setEditTotalBeds(Math.max(0, Number(e.target.value)))}
                      className="bg-transparent text-white text-sm font-mono outline-none flex-1 w-full"
                    />
                  </div>
                </div>

                {/* Occupied Beds */}
                <div>
                  <label className="text-[10px] text-slate-500 tracking-widest uppercase block mb-1.5">
                    Occupied Beds
                  </label>
                  <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-700/40 rounded-lg px-3 py-2">
                    <Bed size={14} className="text-amber-500" />
                    <input
                      type="number"
                      min={0}
                      max={editTotalBeds}
                      value={editOccupiedBeds}
                      onChange={e => setEditOccupiedBeds(Math.max(0, Math.min(editTotalBeds, Number(e.target.value))))}
                      className="bg-transparent text-white text-sm font-mono outline-none flex-1 w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Ventilator Toggle */}
              <div className="flex items-center gap-3 mb-6">
                <div onClick={() => setEditHasVent(!editHasVent)}
                  className={`w-11 h-6 rounded-full transition-colors duration-200 flex items-center px-0.5 cursor-pointer
                    ${editHasVent ? "bg-sky-500" : "bg-slate-700"}`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200
                    ${editHasVent ? "translate-x-5" : "translate-x-0"}`} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-sm text-slate-300">
                    <Wind size={14} className={editHasVent ? "text-sky-400" : "text-slate-500"} />
                    Ventilator Available
                  </div>
                  <div className="text-[10px] text-slate-500">Toggle ventilator support status</div>
                </div>
              </div>

              {/* Save Button */}
              <button
                onClick={handleSave}
                disabled={saving}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold
                           tracking-wider uppercase text-sm transition-all active:scale-[0.97]
                           ${saveSuccess
                             ? "bg-green-500 text-white shadow-lg shadow-green-500/20"
                             : "bg-sky-500 hover:bg-sky-400 text-white shadow-lg shadow-sky-500/20"
                           }
                           disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {saving ? (
                  <><Loader2 size={16} className="animate-spin" /> Saving…</>
                ) : saveSuccess ? (
                  <><CheckCircle size={16} /> Saved Successfully</>
                ) : (
                  <><Save size={16} /> Save Changes</>
                )}
              </button>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                ██  LIVE PATIENT REGISTRY — "High-Tech Command Center"
                ═══════════════════════════════════════════════════════════════════ */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl backdrop-blur-xl overflow-hidden">
              {/* Registry Header */}
              <div className="px-6 pt-6 pb-4 border-b border-slate-700/40">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold tracking-widest text-slate-300 uppercase flex items-center gap-2">
                    <Users size={14} className="text-cyan-400" />
                    Live Patient Registry
                  </h3>
                  <div className="flex items-center gap-3">
                    {activePatients.length > 0 && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/15 border border-red-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                        <span className="text-[10px] text-red-400 font-bold font-mono">
                          {activePatients.length} EN ROUTE / PREPARING
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tab Switcher */}
                <div className="flex gap-1 bg-slate-900/60 rounded-lg p-1">
                  <button
                    onClick={() => setRegistryTab("active")}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-[11px] font-bold tracking-wider uppercase transition-all
                      ${registryTab === "active"
                        ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-lg shadow-cyan-500/10"
                        : "text-slate-500 hover:text-slate-300"
                      }`}
                  >
                    <Siren size={12} />
                    Active ({activePatients.length})
                  </button>
                  <button
                    onClick={() => setRegistryTab("history")}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-[11px] font-bold tracking-wider uppercase transition-all
                      ${registryTab === "history"
                        ? "bg-slate-500/20 text-slate-300 border border-slate-500/30"
                        : "text-slate-500 hover:text-slate-300"
                      }`}
                  >
                    <History size={12} />
                    History ({historyPatients.length})
                  </button>
                </div>
              </div>

              {/* Registry Content */}
              <div className="p-6">
                {displayPatients.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-3 opacity-30">
                      {registryTab === "active" ? "🫁" : "📋"}
                    </div>
                    <div className="text-slate-500 text-sm font-mono">
                      {registryTab === "active"
                        ? "No active incoming patients"
                        : "No patient history yet"}
                    </div>
                    <div className="text-slate-600 text-[10px] font-mono mt-1">
                      {registryTab === "active"
                        ? "Patients will appear here when dispatched to your facility"
                        : "Admitted and discharged patients will appear here"}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {displayPatients.map((patient, idx) => (
                      <div key={patient._id} className="animate-fade-in" style={{ animationDelay: `${idx * 50}ms` }}>
                        <PatientCard
                          patient={patient}
                          onUpdateStatus={handleUpdateStatus}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── Alert Status ── */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-xl">
              <h3 className="text-sm font-bold tracking-widest text-slate-300 uppercase mb-3 flex items-center gap-2">
                <AlertTriangle size={14} className="text-red-400" />
                Incoming Dispatch Alerts
              </h3>
              <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl px-4 py-3 flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${socketConnected ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
                <span className="text-xs text-slate-400 font-mono">
                  {socketConnected
                    ? "Monitoring dispatches in real-time. Audio alerts will fire automatically."
                    : "Socket disconnected — alerts unavailable."}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-slate-500 text-sm flex items-center justify-center min-h-[calc(100vh-3.5rem)]">Hospital not found.</div>
        )}
      </main>
    </div>
  );
}