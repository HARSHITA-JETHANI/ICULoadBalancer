// seed.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import Hospital from "./models/Hospital.js";

dotenv.config();

const mockHospitals = [
  { name: "SMS Hospital", lat: 26.9124, lng: 75.7873, totalBeds: 100, occupiedBeds: 82, hasVentilators: true, specialties: ["Trauma", "Cardiac Surgery", "Neurology"] },
  { name: "Fortis Escorts Hospital", lat: 26.8988, lng: 75.7611, totalBeds: 70, occupiedBeds: 55, hasVentilators: true, specialties: ["Cardiology", "Orthopedics", "Oncology"] },
  { name: "Mahatma Gandhi Hospital", lat: 26.8534, lng: 75.8105, totalBeds: 80, occupiedBeds: 72, hasVentilators: true, specialties: ["General Surgery", "Pediatrics", "Gynecology"] },
  { name: "Narayana Multispeciality", lat: 26.9345, lng: 75.8267, totalBeds: 60, occupiedBeds: 24, hasVentilators: false, specialties: ["ENT", "Ophthalmology", "Dermatology"] },
  { name: "Eternal Heart Care Centre", lat: 26.9215, lng: 75.7432, totalBeds: 50, occupiedBeds: 48, hasVentilators: true, specialties: ["Cardiology", "Cardiac ICU", "Electrophysiology"] }
];

async function seedDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    await Hospital.deleteMany({});
    console.log("🧹 Cleared existing hospitals");

    await Hospital.insertMany(mockHospitals);
    console.log("🏥 Successfully seeded Jaipur hospitals!");

    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  }
}

seedDB();