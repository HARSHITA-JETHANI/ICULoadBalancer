// ─── Haversine Distance (km) ─────────────────────────────────────────────────
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

// ─── Occupancy colour tier ────────────────────────────────────────────────────
export function getOccupancyTier(hospital) {
  const ratio = hospital.occupiedBeds / hospital.totalBeds;
  if (ratio >= 0.9) return "red";
  if (ratio >= 0.7) return "yellow";
  return "green";
}

// ─── Routing Score ────────────────────────────────────────────────────────────
// userLocation: { lat, lng } — comes from device GPS via App.jsx
// Returns Infinity if hospital is disqualified (full or missing ventilator).
export function calculateHospitalScore(hospital, patientNeedsVentilator, userLocation) {
  if (hospital.occupiedBeds >= hospital.totalBeds) return Infinity;
  if (patientNeedsVentilator && !hospital.hasVentilators) return Infinity;

  // If userLocation not yet available, fall back to Jaipur city centre
  const origin = userLocation ?? { lat: 26.9124, lng: 75.7873 };

  const distance = getDistanceKm(origin.lat, origin.lng, hospital.lat, hospital.lng);
  const occupancyRatio = hospital.occupiedBeds / hospital.totalBeds;

  // Lower score = better: 60% weight on distance, 40% on occupancy
  return distance * 0.6 + occupancyRatio * 0.4;
}