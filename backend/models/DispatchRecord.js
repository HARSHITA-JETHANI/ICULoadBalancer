// models/DispatchRecord.js
import mongoose from "mongoose";

const dispatchRecordSchema = new mongoose.Schema({
  hospitalId:      { type: mongoose.Schema.Types.ObjectId, ref: "Hospital", required: true },
  hospitalName:    { type: String, required: true },
  patientId:       { type: String, required: true },       // auto-generated ID like "PT-20260330-001"
  severity:        { type: String, enum: ["Critical", "Severe", "Moderate"], default: "Critical" },
  origin:          { type: String, default: "Ambulance Dispatch" },
  status:          { type: String, enum: ["En Route", "Preparing Bed", "Admitted", "Discharged"], default: "En Route" },
  estimatedArrival:{ type: Date },
  dispatchedAt:    { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.model("DispatchRecord", dispatchRecordSchema);
