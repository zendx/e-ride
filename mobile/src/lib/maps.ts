const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

type LatLng = { lat: number; lng: number };

function requireKey() {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error("Missing EXPO_PUBLIC_GOOGLE_MAPS_API_KEY");
  }
}

export async function geocodeAddress(address: string): Promise<LatLng> {
  requireKey();
  const query = new URLSearchParams({
    address,
    key: GOOGLE_MAPS_API_KEY as string
  });

  const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${query.toString()}`);
  const body = await response.json();
  if (!response.ok || body.status !== "OK" || !body.results?.length) {
    throw new Error("Address lookup failed.");
  }

  const location = body.results[0].geometry.location as LatLng;
  return { lat: location.lat, lng: location.lng };
}

export async function estimateRoute(origin: LatLng, destination: LatLng) {
  requireKey();
  const query = new URLSearchParams({
    origin: `${origin.lat},${origin.lng}`,
    destination: `${destination.lat},${destination.lng}`,
    key: GOOGLE_MAPS_API_KEY as string
  });

  const response = await fetch(`https://maps.googleapis.com/maps/api/directions/json?${query.toString()}`);
  const body = await response.json();
  if (!response.ok || body.status !== "OK" || !body.routes?.length) {
    throw new Error("Route estimate failed.");
  }

  const leg = body.routes[0].legs?.[0];
  if (!leg) throw new Error("Route estimate failed.");

  return {
    distanceKm: Number((leg.distance.value / 1000).toFixed(2)),
    durationMin: Math.max(1, Math.round(leg.duration.value / 60))
  };
}
