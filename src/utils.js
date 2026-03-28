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
// severity:     1–10  — drives dynamic weight selection
// Returns Infinity if hospital is disqualified (full or missing ventilator).
export function calculateHospitalScore(hospital, patientNeedsVentilator, userLocation, severity = 5) {
  if (hospital.occupiedBeds >= hospital.totalBeds) return Infinity;
  if (patientNeedsVentilator && !hospital.hasVentilators) return Infinity;

  // If userLocation not yet available, fall back to Jaipur city centre
  const origin = userLocation ?? { lat: 26.9124, lng: 75.7873 };

  const distance = getDistanceKm(origin.lat, origin.lng, hospital.lat, hospital.lng);
  const occupancyRatio = hospital.occupiedBeds / hospital.totalBeds;

  // Dynamic weighting based on patient severity
  let wDist, wOcc;
  if (severity >= 8) {
    // High severity — time-critical, prioritise closest hospital
    wDist = 0.8;
    wOcc  = 0.2;
  } else if (severity >= 4) {
    // Medium severity — standard balance
    wDist = 0.6;
    wOcc  = 0.4;
  } else {
    // Low severity — patient is stable, save beds at busy trauma centres
    wDist = 0.3;
    wOcc  = 0.7;
  }

  // Lower score = better
  return distance * wDist + occupancyRatio * wOcc;
}