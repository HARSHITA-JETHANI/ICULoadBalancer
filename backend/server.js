// server.js
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import dotenv from "dotenv";
import Hospital from "./models/Hospital.js";

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST", "PUT"] },
});

app.use(cors());
app.use(express.json());

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function broadcastUpdate() {
  const allHospitals = await Hospital.find({});
  io.emit("hospitalsUpdated", allHospitals);
}

// ─── REST Routes ─────────────────────────────────────────────────────────────

// GET  /api/hospitals — return all hospitals
app.get("/api/hospitals", async (req, res) => {
  try {
    const hospitals = await Hospital.find({});
    res.json(hospitals);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch hospitals" });
  }
});

// PUT  /api/hospitals/:id — admin updates bed counts / ventilator
app.put("/api/hospitals/:id", async (req, res) => {
  try {
    const { totalBeds, occupiedBeds, hasVentilators } = req.body;
    const hospital = await Hospital.findById(req.params.id);
    if (!hospital) return res.status(404).json({ error: "Hospital not found" });

    // Only update fields that were actually sent
    if (totalBeds !== undefined)      hospital.totalBeds = totalBeds;
    if (occupiedBeds !== undefined)   hospital.occupiedBeds = occupiedBeds;
    if (hasVentilators !== undefined) hospital.hasVentilators = hasVentilators;

    await hospital.save();
    await broadcastUpdate();          // Instantly refresh all Dispatch maps
    res.json({ success: true, hospital });
  } catch (err) {
    res.status(500).json({ error: "Failed to update hospital" });
  }
});

// POST /api/dispatch — dispatch an ambulance, increment bed, alert admin
app.post("/api/dispatch", async (req, res) => {
  const { hospitalId } = req.body;
  if (!hospitalId) return res.status(400).json({ error: "hospitalId is required" });

  try {
    const hospital = await Hospital.findById(hospitalId);
    if (!hospital) return res.status(404).json({ error: "Hospital not found" });
    if (hospital.occupiedBeds >= hospital.totalBeds) {
      return res.status(409).json({ error: "No beds available" });
    }

    // Update in DB
    hospital.occupiedBeds += 1;
    await hospital.save();

    // Broadcast updated bed counts to all dispatch clients
    await broadcastUpdate();

    // Alert the specific hospital's admin portal
    io.emit("incomingPatient", {
      hospitalId: hospital._id,
      hospitalName: hospital.name,
      timestamp: new Date(),
    });

    res.json({ success: true, hospital });
  } catch (err) {
    res.status(500).json({ error: "Server error during dispatch" });
  }
});

// ─── Socket.io ───────────────────────────────────────────────────────────────
io.on("connection", async (socket) => {
  console.log(`[socket] client connected: ${socket.id}`);
  const hospitals = await Hospital.find({});
  socket.emit("hospitalsUpdated", hospitals);

  socket.on("disconnect", () => {
    console.log(`[socket] client disconnected: ${socket.id}`);
  });
});

// ─── MongoDB Connection & Server Start ───────────────────────────────────────
const PORT = process.env.PORT || 3000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB Connected Successfully");
    httpServer.listen(PORT, () => {
      console.log(`\n🚑 PulseRoute backend running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error("❌ MongoDB Connection Error:", err.message);
    console.log("👉 Did you forget to start the MongoDB service on your computer?");
  });