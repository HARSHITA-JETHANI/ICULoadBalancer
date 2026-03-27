// ─── Mock Emergency Location (Times Square, NYC) ───────────────────────────
export const EMERGENCY_LOCATION = { lat: 40.758, lng: -73.9855 };

// ─── Haversine Distance (km) ────────────────────────────────────────────────
export function getDistanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Occupancy Colour Tier ──────────────────────────────────────────────────
export function getOccupancyTier(hospital) {
  const ratio = hospital.occupiedBeds / hospital.totalBeds;
  if (ratio >= 0.9) return "red";
  if (ratio >= 0.7) return "yellow";
  return "green";
}

// ─── Routing Score ──────────────────────────────────────────────────────────
// Lower score = better option. Returns Infinity if hospital is disqualified.
export function calculateHospitalScore(hospital, patientNeedsVentilator) {
  // Hard disqualifiers
  if (hospital.occupiedBeds >= hospital.totalBeds) return Infinity;
  if (patientNeedsVentilator && !hospital.hasVentilators) return Infinity;

  const distance = getDistanceKm(
    EMERGENCY_LOCATION.lat,
    EMERGENCY_LOCATION.lng,
    hospital.lat,
    hospital.lng
  );

  const occupancyRatio = hospital.occupiedBeds / hospital.totalBeds;

  // Weighted: 60% distance, 40% occupancy (lower is better)
  return distance * 0.6 + occupancyRatio * 0.4;
}

// ─── Initial Hospital Dataset ───────────────────────────────────────────────
export const INITIAL_HOSPITALS = [
  {
    id: 1,
    name: "Bellevue Medical Center",
    lat: 40.7394,
    lng: -73.9749,
    totalBeds: 60,
    occupiedBeds: 32,
    hasVentilators: true,
    specialties: ["Trauma", "Burn Unit"],
  },
  {
    id: 2,
    name: "Lenox Hill Hospital",
    lat: 40.7714,
    lng: -73.9546,
    totalBeds: 50,
    occupiedBeds: 46,
    hasVentilators: true,
    specialties: ["Cardiac", "Neurology"],
  },
  {
    id: 3,
    name: "NYU Langone Health",
    lat: 40.742,
    lng: -73.974,
    totalBeds: 70,
    occupiedBeds: 65,
    hasVentilators: true,
    specialties: ["Oncology", "Orthopedics"],
  },
  {
    id: 4,
    name: "Mount Sinai West",
    lat: 40.769,
    lng: -73.9863,
    totalBeds: 45,
    occupiedBeds: 18,
    hasVentilators: false,
    specialties: ["Obstetrics", "Pediatrics"],
  },
  {
    id: 5,
    name: "Columbia Presbyterian",
    lat: 40.8404,
    lng: -73.9416,
    totalBeds: 80,
    occupiedBeds: 72,
    hasVentilators: true,
    specialties: ["Transplant", "Cardiac Surgery"],
  },
  {
    id: 6,
    name: "Harlem Hospital Center",
    lat: 40.8116,
    lng: -73.9465,
    totalBeds: 40,
    occupiedBeds: 12,
    hasVentilators: false,
    specialties: ["General Surgery", "Trauma"],
  },
  {
    id: 7,
    name: "Weill Cornell Medicine",
    lat: 40.7647,
    lng: -73.9543,
    totalBeds: 55,
    occupiedBeds: 51,
    hasVentilators: true,
    specialties: ["Neurosurgery", "Urology"],
  },
];
