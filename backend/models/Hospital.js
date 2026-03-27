// models/Hospital.js
import mongoose from "mongoose";

const hospitalSchema = new mongoose.Schema({
  name: { type: String, required: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  totalBeds: { type: Number, required: true },
  occupiedBeds: { type: Number, required: true },
  hasVentilators: { type: Boolean, default: false },
  specialties: [{ type: String }],
  // 💡 Future-proofing for your next feature:
  // adminUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.model("Hospital", hospitalSchema);