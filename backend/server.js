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
  cors: { origin: "*", methods: ["GET", "POST"] },
});

app.use(cors());
app.use(express.json());

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function broadcastUpdate() {
  const allHospitals = await Hospital.find({});
  io.emit("hospitalsUpdated", allHospitals);
}

// ─── REST Routes ─────────────────────────────────────────────────────────────
app.get("/api/hospitals", async (req, res) => {
  try {
    const hospitals = await Hospital.find({});
    res.json(hospitals);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch hospitals" });
  }
});

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

    broadcastUpdate(); // Alert all connected clients
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
    // Only start the server AFTER the database is connected!
    httpServer.listen(PORT, () => {
      console.log(`\n🚑 PulseRoute backend running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error("❌ MongoDB Connection Error:", err.message);
    console.log("👉 Did you forget to start the MongoDB service on your computer?");
  });