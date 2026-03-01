import { API_BASE_URL } from "./config";
import { LoginPayload } from "../types/auth";

type ApiErrorBody = {
  error?: { message?: string };
};

function withBase(path: string) {
  return `${API_BASE_URL}${path}`;
}

async function parseError(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as ApiErrorBody;
    return body.error?.message ?? fallback;
  } catch {
    return fallback;
  }
}

export async function login(email: string, password: string) {
  const response = await fetch(withBase("/api/auth/login"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    throw new Error(await parseError(response, `Login failed (${response.status})`));
  }

  const body = (await response.json()) as { data: LoginPayload };
  return body.data;
}

export async function registerRider(payload: {
  tenantSlug: string;
  fullName: string;
  email: string;
  password: string;
  phoneNumber?: string;
  licenseNumber: string;
  vehicleType: string;
  vehiclePlate: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleColor?: string;
}) {
  const response = await fetch(withBase("/api/rider/register"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(await parseError(response, `Registration failed (${response.status})`));
  }

  return response.json();
}

export async function updateRiderStatus(accessToken: string, payload: {
  availability: "online" | "offline" | "on_trip";
  lat?: number;
  lng?: number;
}) {
  const response = await fetch(withBase("/api/rider/status"), {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(await parseError(response, `Status update failed (${response.status})`));
  }
}

export async function updateRiderTripStatus(accessToken: string, tripId: string, status: "accepted" | "arrived" | "in_progress" | "completed" | "cancelled") {
  const response = await fetch(withBase(`/api/rider/trips/${tripId}/status`), {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({ status })
  });

  if (!response.ok) {
    throw new Error(await parseError(response, `Trip status update failed (${response.status})`));
  }
}

export async function requestPassengerTrip(accessToken: string, payload: {
  pickupAddress: string;
  dropoffAddress: string;
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  estimatedDistanceKm: number;
  estimatedDurationMin: number;
}) {
  const response = await fetch(withBase("/api/passenger/trips"), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(await parseError(response, `Trip request failed (${response.status})`));
  }

  return response.json();
}

export async function searchNearbyRiders(accessToken: string, params: {
  lat: number;
  lng: number;
  radiusKm?: number;
  limit?: number;
}) {
  const query = new URLSearchParams({
    lat: String(params.lat),
    lng: String(params.lng),
    radiusKm: String(params.radiusKm ?? 5),
    limit: String(params.limit ?? 30)
  });

  const response = await fetch(withBase(`/api/passenger/riders/nearby?${query.toString()}`), {
    headers: {
      authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error(await parseError(response, `Nearby rider search failed (${response.status})`));
  }

  return response.json();
}

export async function estimatePassengerFare(accessToken: string, payload: {
  estimatedDistanceKm: number;
  estimatedDurationMin: number;
}) {
  const response = await fetch(withBase("/api/passenger/fare-estimate"), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(await parseError(response, `Fare estimate failed (${response.status})`));
  }

  return response.json();
}
