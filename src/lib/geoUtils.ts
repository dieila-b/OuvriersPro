/**
 * Calcule la distance entre deux points géographiques en kilomètres
 * Utilise la formule de Haversine
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Rayon de la Terre en km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Formate une distance pour l'affichage
 */
export function formatDistance(km: number, language: string = "fr"): string {
  if (km < 1) {
    const meters = Math.round(km * 1000);
    return language === "fr" ? `${meters} m` : `${meters} m`;
  }
  
  return language === "fr" 
    ? `${km.toFixed(1)} km`
    : `${km.toFixed(1)} km`;
}
