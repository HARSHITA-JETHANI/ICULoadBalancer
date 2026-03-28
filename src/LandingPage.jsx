import { useNavigate } from "react-router-dom";
import { Activity, Ambulance, Building2 } from "lucide-react";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden"
      style={{ fontFamily: "'IBM Plex Mono', 'JetBrains Mono', monospace" }}>

      {/* ── Animated background pulses ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-red-500/5 animate-ping" style={{ animationDuration: "4s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-sky-500/5 animate-ping" style={{ animationDuration: "3s", animationDelay: "1s" }} />
        <div className="absolute top-0 left-0 w-full h-full"
          style={{ backgroundImage: "radial-gradient(circle at 50% 50%, rgba(239,68,68,0.03) 0%, transparent 70%)" }} />
      </div>

      {/* ── Branding ── */}
      <div className="relative z-10 flex flex-col items-center mb-12">
        <div className="relative w-20 h-20 mb-6">
          <div className="absolute inset-0 rounded-2xl bg-red-500/20 animate-ping" style={{ animationDuration: "3s" }} />
          <div className="relative w-20 h-20 bg-red-500/20 border-2 border-red-500/50 rounded-2xl flex items-center justify-center backdrop-blur-sm">
            <Activity size={36} className="text-red-400" />
          </div>
        </div>
        <h1 className="text-4xl sm:text-5xl font-black tracking-[0.2em] uppercase mb-2"
          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
          <span className="text-red-400">Pulse</span><span className="text-white">Route</span>
        </h1>
        <p className="text-slate-500 text-xs sm:text-sm tracking-[0.4em] uppercase">
          Emergency ICU Load Balancer
        </p>
      </div>

      {/* ── Two portal cards ── */}
      <div className="relative z-10 flex flex-col sm:flex-row gap-6 px-6 w-full max-w-3xl">

        {/* Dispatcher Card */}
        <button
          onClick={() => navigate("/dispatch")}
          className="group flex-1 bg-slate-800/40 border border-slate-700/50 rounded-2xl p-8 sm:p-10
                     backdrop-blur-xl hover:bg-slate-800/70 hover:border-red-500/40
                     transition-all duration-500 cursor-pointer
                     hover:shadow-[0_0_60px_-15px_rgba(239,68,68,0.3)]
                     active:scale-[0.97] text-left"
        >
          <div className="w-14 h-14 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center mb-6
                          group-hover:bg-red-500/25 group-hover:border-red-500/50 transition-all duration-500">
            <Ambulance size={26} className="text-red-400 group-hover:scale-110 transition-transform duration-300" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-wider uppercase mb-2"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            Emergency Dispatcher
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm leading-relaxed mb-6">
            Real-time ICU bed tracking, smart routing algorithm, and one-click ambulance dispatch to the optimal hospital.
          </p>
          <div className="flex items-center gap-2 text-red-400 text-xs font-bold tracking-widest uppercase
                          group-hover:gap-3 transition-all duration-300">
            <span>Launch Map</span>
            <span className="text-lg">→</span>
          </div>
        </button>

        {/* Admin Portal Card */}
        <button
          onClick={() => navigate("/admin")}
          className="group flex-1 bg-slate-800/40 border border-slate-700/50 rounded-2xl p-8 sm:p-10
                     backdrop-blur-xl hover:bg-slate-800/70 hover:border-sky-500/40
                     transition-all duration-500 cursor-pointer
                     hover:shadow-[0_0_60px_-15px_rgba(56,189,248,0.3)]
                     active:scale-[0.97] text-left"
        >
          <div className="w-14 h-14 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center mb-6
                          group-hover:bg-sky-500/25 group-hover:border-sky-500/50 transition-all duration-500">
            <Building2 size={26} className="text-sky-400 group-hover:scale-110 transition-transform duration-300" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-wider uppercase mb-2"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            Hospital Portal
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm leading-relaxed mb-6">
            Update bed availability, manage ventilator status, and receive real-time incoming patient alerts with audio notifications.
          </p>
          <div className="flex items-center gap-2 text-sky-400 text-xs font-bold tracking-widest uppercase
                          group-hover:gap-3 transition-all duration-300">
            <span>Staff Login</span>
            <span className="text-lg">→</span>
          </div>
        </button>
      </div>

      {/* ── Footer tagline ── */}
      <div className="relative z-10 mt-12 text-center">
        <p className="text-slate-600 text-[10px] tracking-[0.3em] uppercase font-mono">
          Built for hackathon · Real-time Socket.io · Leaflet Maps
        </p>
      </div>
    </div>
  );
}
