import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

app.use(cors());
app.use(express.json());

// ─── In-Memory Hospital State (Jaipur, India) ────────────────────────────────
let hospitals = [
  {
    id: 1,
    name: "SMS Hospital",
    lat: 26.9124,
    lng: 75.7873,
    totalBeds: 100,
    occupiedBeds: 82,
    hasVentilators: true,
    specialties: ["Trauma", "Cardiac Surgery", "Neurology"],
  },
  {
    id: 2,
    name: "Fortis Escorts Hospital",
    lat: 26.8988,
    lng: 75.7611,
    totalBeds: 70,
    occupiedBeds: 55,
    hasVentilators: true,
    specialties: ["Cardiology", "Orthopedics", "Oncology"],
  },
  {
    id: 3,
    name: "Mahatma Gandhi Hospital",
    lat: 26.8534,
    lng: 75.8105,
    totalBeds: 80,
    occupiedBeds: 72,
    hasVentilators: true,
    specialties: ["General Surgery", "Pediatrics", "Gynecology"],
  },
  {
    id: 4,
    name: "Narayana Multispeciality",
    lat: 26.9345,
    lng: 75.8267,
    totalBeds: 60,
    occupiedBeds: 24,
    hasVentilators: false,
    specialties: ["ENT", "Ophthalmology", "Dermatology"],
  },
  {
    id: 5,
    name: "Eternal Heart Care Centre",
    lat: 26.9215,
    lng: 75.7432,
    totalBeds: 50,
    occupiedBeds: 48,
    hasVentilators: true,
    specialties: ["Cardiology", "Cardiac ICU", "Electrophysiology"],
  },
  {
    id: 6,
    name: "Santokba Durlabhji Hospital",
    lat: 26.9068,
    lng: 75.8201,
    totalBeds: 65,
    occupiedBeds: 30,
    hasVentilators: false,
    specialties: ["Orthopedics", "Spine Surgery", "Rehabilitation"],
  },
  {
    id: 7,
    name: "Apex Hospital Malviya Nagar",
    lat: 26.8624,
    lng: 75.8235,
    totalBeds: 45,
    occupiedBeds: 40,
    hasVentilators: true,
    specialties: ["Neurosurgery", "Transplant", "Critical Care"],
  },
  {
    id: 8,
    name: "Rukmani Birla Hospital",
    lat: 26.8762,
    lng: 75.7519,
    totalBeds: 55,
    occupiedBeds: 18,
    hasVentilators: false,
    specialties: ["Obstetrics", "Neonatology", "Women's Health"],
  },
  {
    id: 9,
    name: "Manipal Hospital Jaipur",
    lat: 26.8435,
    lng: 75.7923,
    totalBeds: 75,
    occupiedBeds: 60,
    hasVentilators: true,
    specialties: ["Oncology", "Bone Marrow Transplant", "Urology"],
  },
  {
    id: 10,
    name: "NIMS Medical College Hospital",
    lat: 26.9567,
    lng: 75.8012,
    totalBeds: 90,
    occupiedBeds: 45,
    hasVentilators: true,
    specialties: ["Trauma", "Burns Unit", "Plastic Surgery"],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function broadcastUpdate() {
  io.emit("hospitalsUpdated", hospitals);
}

// ─── REST Routes ─────────────────────────────────────────────────────────────
app.get("/api/hospitals", (req, res) => {
  res.json(hospitals);
});

app.post("/api/dispatch", (req, res) => {
  const { hospitalId } = req.body;
  if (!hospitalId) {
    return res.status(400).json({ error: "hospitalId is required" });
  }

  const hospital = hospitals.find((h) => h.id === hospitalId);
  if (!hospital) {
    return res.status(404).json({ error: "Hospital not found" });
  }
  if (hospital.occupiedBeds >= hospital.totalBeds) {
    return res.status(409).json({ error: "No beds available at this hospital" });
  }

  hospital.occupiedBeds += 1;
  broadcastUpdate();
  res.json({ success: true, hospital });
});

app.post("/api/surge", (req, res) => {
  // Pick 2-4 random hospitals and surge them
  const shuffled = [...hospitals].sort(() => Math.random() - 0.5);
  const targets = shuffled.slice(0, Math.floor(Math.random() * 3) + 2);

  targets.forEach((t) => {
    const h = hospitals.find((h) => h.id === t.id);
    const delta = Math.floor(Math.random() * 10) + 5; // 5-14 beds
    h.occupiedBeds = Math.min(h.totalBeds, h.occupiedBeds + delta);
  });

  broadcastUpdate();
  res.json({
    success: true,
    surgedHospitals: targets.map((t) => t.name),
    hospitals,
  });
});

// ─── Socket.io ───────────────────────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log(`[socket] client connected: ${socket.id}`);
  // Send current state immediately on connect
  socket.emit("hospitalsUpdated", hospitals);

  socket.on("disconnect", () => {
    console.log(`[socket] client disconnected: ${socket.id}`);
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`\n🚑 PulseRoute backend running at http://localhost:${PORT}`);
  console.log(`   GET  /api/hospitals`);
  console.log(`   POST /api/dispatch  { hospitalId }`);
  console.log(`   POST /api/surge\n`);
});
