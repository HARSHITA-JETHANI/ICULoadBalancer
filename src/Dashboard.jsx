import { useState } from "react";
import {
  Activity, AlertTriangle, Wind, ChevronRight,
  Ambulance, CheckCircle, Clock, Wifi
} from "lucide-react";
import { calculateHospitalScore, getOccupancyTier, getDistanceKm } from "./utils";

function TierBadge({ tier }) {
  const cfg = {
    green:  { bg: "bg-green-500/15",  text: "text-green-400",  border: "border-green-500/30",  label: "AVAILABLE" },
    yellow: { bg: "bg-yellow-500/15", text: "text-yellow-400", border: "border-yellow-500/30", label: "MODERATE"  },
    red:    { bg: "bg-red-500/15",    text: "text-red-400",    border: "border-red-500/30",    label: "CRITICAL"  },
  }[tier];
  return (
    <span className={`text-[10px] font-bold tracking-widest px-2 py-0.5 rounded border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      {cfg.label}
    </span>
  );
}

function OccupancyBar({ hospital }) {
  const pct = (hospital.occupiedBeds / hospital.totalBeds) * 100;
  const color = pct >= 90 ? "#ef4444" : pct >= 70 ? "#eab308" : "#22c55e";
  return (
    <div className="w-full h-1 bg-slate-700 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }} />
    </div>
  );
}

function ScoreRing({ score, rank }) {
  if (!isFinite(score)) return null;
  const normalized = Math.max(0, 1 - score / 20);
  const colors = ["#f59e0b", "#94a3b8", "#cd7c2f"];
  const ringColor = rank < 3 ? colors[rank] : "#475569";
  return (
    <div className="relative flex items-center justify-center w-9 h-9">
      <svg className="absolute inset-0" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="15" fill="none" stroke="#1e293b" strokeWidth="3" />
        <circle cx="18" cy="18" r="15" fill="none" stroke={ringColor} strokeWidth="3"
          strokeDasharray={`${normalized * 94.25} 94.25`} strokeLinecap="round"
          transform="rotate(-90 18 18)" />
      </svg>
      <span className="text-[11px] font-bold" style={{ color: ringColor }}>#{rank + 1}</span>
    </div>
  );
}

export default function Dashboard({ hospitals, userLocation, onDispatch }) {
  const [severity, setSeverity] = useState(5);
  const [needsVent, setNeedsVent] = useState(false);
  const [results, setResults]   = useState(null);
  const [dispatched, setDispatched] = useState(null);

  function handleCalculate() {
    const scored = hospitals
      .map(h => ({ ...h, score: calculateHospitalScore(h, needsVent, userLocation) }))
      .sort((a, b) => a.score - b.score);
    setResults(scored);
    setDispatched(null);
  }

  function handleDispatch(hospital) {
    onDispatch(hospital);
    setDispatched(hospital._id);
  }

  const severityColor = severity <= 3 ? "text-green-400" : severity <= 6 ? "text-yellow-400" : "text-red-400";

  return (
    <div className="flex flex-col h-full gap-4 overflow-y-auto pr-1">

      {/* Intake Form */}
      <div className="bg-slate-800/70 border border-slate-700/60 rounded-xl p-5 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-sky-500/20 flex items-center justify-center">
            <Activity size={15} className="text-sky-400" />
          </div>
          <h2 className="text-sm font-bold tracking-widest text-slate-300 uppercase">Emergency Intake</h2>
          <div className="ml-auto flex items-center gap-1.5 text-[10px] text-green-400 font-mono">
            <Wifi size={10} className="animate-pulse" /> LIVE
          </div>
        </div>

        {/* Origin */}
        <div className="mb-4 bg-slate-900/60 rounded-lg px-3 py-2 border border-slate-700/40">
          <div className="text-[10px] text-slate-500 tracking-widest uppercase mb-0.5">Origin (Your Location)</div>
          {userLocation ? (
            <>
              <div className="text-xs text-slate-300 font-mono">
                {userLocation.lat.toFixed(5)}°N, {userLocation.lng.toFixed(5)}°E
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">GPS — device location</div>
            </>
          ) : (
            <div className="text-xs text-slate-500 font-mono">Detecting…</div>
          )}
        </div>

        {/* Severity */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs text-slate-400 tracking-wider uppercase">Patient Severity Score</label>
            <span className={`text-xl font-black font-mono ${severityColor}`}>{severity}</span>
          </div>
          <input type="range" min={1} max={10} value={severity}
            onChange={e => setSeverity(Number(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
            style={{ background: `linear-gradient(to right, ${severity <= 3 ? "#22c55e" : severity <= 6 ? "#eab308" : "#ef4444"} ${(severity-1)/9*100}%, #334155 0%)` }} />
          <div className="flex justify-between text-[10px] text-slate-600 mt-1 font-mono">
            <span>STABLE</span><span>MODERATE</span><span>CRITICAL</span>
          </div>
        </div>

        {/* Ventilator toggle */}
        <label className="flex items-center gap-3 cursor-pointer group mb-5 select-none">
          <div onClick={() => setNeedsVent(!needsVent)}
            className={`w-10 h-5 rounded-full transition-colors duration-200 flex items-center px-0.5 ${needsVent ? "bg-sky-500" : "bg-slate-700"}`}>
            <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${needsVent ? "translate-x-5" : "translate-x-0"}`} />
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-sm text-slate-300 group-hover:text-white transition-colors">
              <Wind size={13} className={needsVent ? "text-sky-400" : "text-slate-500"} />
              Requires Ventilator
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Filter hospitals without ventilation support</div>
          </div>
        </label>

        <button onClick={handleCalculate}
          className="w-full py-3 rounded-lg bg-sky-500 hover:bg-sky-400 active:scale-[0.98] transition-all font-bold text-sm tracking-wider text-white shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2">
          <Activity size={15} />
          CALCULATE BEST ROUTE
        </button>
      </div>

      {/* Results */}
      {results ? (
        <div className="bg-slate-800/70 border border-slate-700/60 rounded-xl p-5 backdrop-blur-sm flex-1">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Ambulance size={14} className="text-amber-400" />
            </div>
            <h2 className="text-sm font-bold tracking-widest text-slate-300 uppercase">Recommended Destinations</h2>
            <span className="ml-auto text-[10px] bg-slate-700 text-slate-400 px-2 py-0.5 rounded font-mono">
              {results.filter(r => isFinite(r.score)).length} eligible
            </span>
          </div>

          <div className="space-y-2">
            {results.map((h, idx) => {
              const isDisqualified = !isFinite(h.score);
              const isDispatched   = dispatched === h._id;
              const tier = getOccupancyTier(h);
              const available = h.totalBeds - h.occupiedBeds;
              const dist = userLocation
                ? getDistanceKm(userLocation.lat, userLocation.lng, h.lat, h.lng)
                : null;
              const occupancyPct = Math.round((h.occupiedBeds / h.totalBeds) * 100);

              return (
                <div key={h._id}
                  className={`rounded-lg border p-3 transition-all duration-300 ${
                    isDispatched    ? "border-sky-500/60 bg-sky-500/10"
                    : isDisqualified ? "border-slate-700/30 bg-slate-900/40 opacity-50"
                    : "border-slate-700/50 bg-slate-900/50 hover:border-slate-600"
                  }`}>
                  <div className="flex items-start gap-2 mb-2">
                    {!isDisqualified
                      ? <ScoreRing score={h.score} rank={idx} />
                      : <div className="w-9 h-9 flex items-center justify-center">
                          <AlertTriangle size={16} className="text-red-500/60" />
                        </div>
                    }
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-semibold truncate ${isDisqualified ? "text-slate-500" : "text-slate-200"}`}>
                          {h.name}
                        </span>
                        <TierBadge tier={tier} />
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-[10px] text-slate-500 font-mono flex-wrap">
                        {dist !== null && <span>{dist.toFixed(1)} km</span>}
                        <span>·</span>
                        <span>{occupancyPct}% full</span>
                        <span>·</span>
                        <span className={available === 0 ? "text-red-400" : "text-slate-400"}>
                          {available} bed{available !== 1 ? "s" : ""} free
                        </span>
                        {h.hasVentilators && <><span>·</span><Wind size={9} className="text-sky-400" /></>}
                      </div>
                    </div>
                  </div>

                  <OccupancyBar hospital={h} />

                  {!isDisqualified && (
                    <div className="mt-2.5 flex items-center justify-between">
                      <div className="text-[10px] text-slate-500 font-mono">
                        {dist !== null ? `ETA ~${Math.round(dist / 0.5 + 2)} min` : ""}
                      </div>
                      {isDispatched ? (
                        <div className="flex items-center gap-1.5 text-[11px] text-sky-400 font-bold">
                          <CheckCircle size={13} />DISPATCHED
                        </div>
                      ) : (
                        <button onClick={() => handleDispatch(h)} disabled={!!dispatched}
                          className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95">
                          <Ambulance size={11} />DISPATCH<ChevronRight size={10} />
                        </button>
                      )}
                    </div>
                  )}

                  {isDisqualified && (
                    <div className="mt-2 text-[10px] text-red-500/70 font-mono">
                      {h.occupiedBeds >= h.totalBeds ? "✗ No beds available" : "✗ No ventilator support"}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center border border-dashed border-slate-700/50 rounded-xl">
          <div className="text-center text-slate-600 py-10">
            <Clock size={28} className="mx-auto mb-3 opacity-40" />
            <div className="text-sm">Awaiting patient assessment</div>
            <div className="text-xs mt-1">Configure intake form and calculate route</div>
          </div>
        </div>
      )}
    </div>
  );
}