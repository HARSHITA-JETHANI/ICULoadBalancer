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
// Dynamic Criticality Routing: severity (1–10) shifts weight between
// proximity and bed capacity.
//   - Critical (≥8): 90% distance weight → get them to the closest hospital NOW
//   - Moderate (4-7): balanced 60/40
//   - Stable (≤3):  30% distance weight → prioritize hospitals with most free beds
//
// Distance is normalized against MAX_RANGE_KM so both factors operate on a
// comparable 0–1 scale.  This prevents the raw km value from drowning out
// occupancy in the score.
const MAX_RANGE_KM = 30; // Jaipur metro radius — normalises distance to 0-1

export function calculateHospitalScore(hospital, patientNeedsVentilator, userLocation, severity = 5) {
  if (hospital.occupiedBeds >= hospital.totalBeds) return Infinity;
  if (patientNeedsVentilator && !hospital.hasVentilators) return Infinity;

  const origin = userLocation ?? { lat: 26.9124, lng: 75.7873 };
  const distanceKm = getDistanceKm(origin.lat, origin.lng, hospital.lat, hospital.lng);

  // Normalise both factors to 0–1
  const distanceNorm   = Math.min(distanceKm / MAX_RANGE_KM, 1);
  const occupancyRatio = hospital.occupiedBeds / hospital.totalBeds;

  // Dynamic weighting based on severity (1-10)
  let distWeight;
  if (severity >= 8)      distWeight = 0.9;  // CRITICAL — nearest hospital wins
  else if (severity >= 4) distWeight = 0.6;  // MODERATE — balanced
  else                    distWeight = 0.3;  // STABLE   — emptiest hospital wins

  return (distanceNorm * distWeight) + (occupancyRatio * (1 - distWeight));
}