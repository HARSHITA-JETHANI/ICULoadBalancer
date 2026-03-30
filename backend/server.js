import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import dotenv from "dotenv";
import Hospital from "./models/Hospital.js";
import DispatchRecord from "./models/DispatchRecord.js";

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST", "PUT", "PATCH"] },
});

app.use(cors());
app.use(express.json());

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function broadcastUpdate() {
  const allHospitals = await Hospital.find({});
  io.emit("hospitalsUpdated", allHospitals);
}

/** Generate a human-readable Patient ID like PT-20260330-004 */
function generatePatientId() {
  const d = new Date();
  // FIXED: Added backticks around the template literals
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = String(Math.floor(Math.random() * 900) + 100); // 3-digit
  return `PT-${date}-${rand}`; 
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

// POST /api/dispatch — dispatch an ambulance, increment bed, alert admin, persist record
app.post("/api/dispatch", async (req, res) => {
  const { hospitalId } = req.body;
  if (!hospitalId) return res.status(400).json({ error: "hospitalId is required" });

  try {
    // RESTORED: The Atomic Update to prevent Race Conditions while booking
    const updatedHospital = await Hospital.findOneAndUpdate(
      { 
        _id: hospitalId, 
        $expr: { $lt: ["$occupiedBeds", "$totalBeds"] } 
      },
      { $inc: { occupiedBeds: 1 } },
      { new: true }
    );

    if (!updatedHospital) {
      return res.status(409).json({ error: "Bed conflict: No beds available or hospital not found." });
    }

    // ~ Create a persistent dispatch record ~
    const severity = ["Critical", "Severe", "Moderate"][Math.floor(Math.random() * 3)];
    const estimatedArrival = new Date(Date.now() + (8 + Math.floor(Math.random() * 15)) * 60000); // 8-22 min

    const record = await DispatchRecord.create({
      hospitalId:       updatedHospital._id,
      hospitalName:     updatedHospital.name,
      patientId:        generatePatientId(),
      severity,
      origin:           "Ambulance Dispatch",
      status:           "En Route",
      estimatedArrival,
    });

    // Broadcast updated bed counts to all dispatch clients
    await broadcastUpdate();

    // Alert the specific hospital's admin portal (now with richer data)
    io.emit("incomingPatient", {
      _id:              record._id,
      hospitalId:       updatedHospital._id.toString(),
      hospitalName:     updatedHospital.name,
      patientId:        record.patientId,
      severity:         record.severity,
      origin:           record.origin,
      status:           record.status,
      estimatedArrival: record.estimatedArrival,
      timestamp:        record.dispatchedAt,
    });

    res.json({ success: true, hospital: updatedHospital, record });
  } catch (err) {
    console.error("Dispatch error:", err);
    res.status(500).json({ error: "Server error during dispatch" });
  }
});

// GET /api/dispatches/:hospitalId — fetch dispatch history for a hospital
app.get("/api/dispatches/:hospitalId", async (req, res) => {
  try {
    const records = await DispatchRecord.find({ hospitalId: req.params.hospitalId })
      .sort({ dispatchedAt: -1 })
      .limit(50);
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch dispatch records" });
  }
});

// PATCH /api/dispatches/:id/status — update a dispatch record's status
app.patch("/api/dispatches/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    if (!["En Route", "Preparing Bed", "Admitted", "Discharged"].includes(status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }

    const record = await DispatchRecord.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!record) return res.status(404).json({ error: "Record not found" });

    // Broadcast the updated record to all admin portals
    io.emit("dispatchStatusUpdated", record);

    res.json({ success: true, record });
  } catch (err) {
    res.status(500).json({ error: "Failed to update dispatch status" });
  }
});

// ─── Socket.io ───────────────────────────────────────────────────────────────
io.on("connection", async (socket) => {
  // FIXED: Added backticks
  console.log(`[socket] client connected: ${socket.id}`);
  const hospitals = await Hospital.find({});
  socket.emit("hospitalsUpdated", hospitals);

  socket.on("disconnect", () => {
    // FIXED: Added backticks
    console.log(`[socket] client disconnected: ${socket.id}`);
  });
});

// ─── MongoDB Connection & Server Start ───────────────────────────────────────
const PORT = process.env.PORT || 3000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB Connected Successfully");
    httpServer.listen(PORT, () => {
      // FIXED: Added backticks
      console.log(`\n🚑 PulseRoute backend running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error("❌ MongoDB Connection Error:", err.message);
    console.log("👉 Did you forget to start the MongoDB service on your computer?");
  });