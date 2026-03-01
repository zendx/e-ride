import { API_BASE_URL } from "./config";
import { LoginPayload } from "../types/auth";

type ApiErrorBody = {
  error?: { message?: string };
};

type ApiRequestOptions = {
  retries?: number;
  timeoutMs?: number;
};

const API_TIMEOUT_MS = Number(process.env.EXPO_PUBLIC_API_TIMEOUT_MS ?? 12000);
const API_GET_RETRIES = Number(process.env.EXPO_PUBLIC_API_GET_RETRIES ?? 1);
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

function withBase(path: string) {
  return `${API_BASE_URL}${path}`;
}

function isAbortError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  return (error as { name?: string }).name === "AbortError";
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function apiRequest(url: string, init?: RequestInit, options?: ApiRequestOptions) {
  const method = (init?.method ?? "GET").toUpperCase();
  const retries = options?.retries ?? (method === "GET" ? API_GET_RETRIES : 0);
  const timeoutMs = options?.timeoutMs ?? API_TIMEOUT_MS;

  let networkError: unknown = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      if (!response.ok) {
        const canRetry = method === "GET" && RETRYABLE_STATUS.has(response.status) && attempt < retries;
        if (canRetry) {
          await sleep(300 * (attempt + 1));
          continue;
        }
      }
      return response;
    } catch (error) {
      networkError = error;
      if (attempt < retries && method === "GET") {
        await sleep(300 * (attempt + 1));
        continue;
      }
      if (isAbortError(error)) {
        throw new Error("Request timed out. Please try again.");
      }
      throw new Error("Network error. Check your connection and try again.");
    } finally {
      clearTimeout(timeout);
    }
  }

  if (isAbortError(networkError)) {
    throw new Error("Request timed out. Please try again.");
  }
  throw new Error("Network error. Check your connection and try again.");
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
  const response = await apiRequest(withBase("/api/auth/login"), {
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
  firstName: string;
  lastName: string;
  middleName?: string;
  email: string;
  password: string;
  address: string;
  phoneNumber: string;
  whatsappNumber: string;
  identificationType: "international_passport" | "nin" | "voters_card";
  identificationNumber?: string;
  identificationImageUrl: string;
  dateOfBirth: string;
  mothersMaidenName: string;
  carName: string;
  carModel: string;
  carYear: number;
  carCondition: string;
  vehiclePlate: string;
  livenessConfirmed: boolean;
}) {
  const response = await apiRequest(withBase("/api/rider/register"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(await parseError(response, `Registration failed (${response.status})`));
  }

  return response.json();
}

export async function registerPassenger(payload: {
  tenantSlug: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  email: string;
  password: string;
  phoneNumber?: string;
}) {
  const response = await apiRequest(withBase("/api/passenger/register"), {
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
  const response = await apiRequest(withBase("/api/rider/status"), {
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
  return updateRiderTripStatusWithReason(accessToken, tripId, { status });
}

export async function updateRiderTripStatusWithReason(
  accessToken: string,
  tripId: string,
  payload: { status: "accepted" | "arrived" | "in_progress" | "completed" | "cancelled"; cancelReason?: string }
) {
  const response = await apiRequest(withBase(`/api/rider/trips/${tripId}/status`), {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(await parseError(response, `Trip status update failed (${response.status})`));
  }
}

export async function cancelRiderTrip(accessToken: string, tripId: string, reason: string) {
  const response = await apiRequest(withBase(`/api/rider/trips/${tripId}/cancel`), {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({ reason })
  });

  if (!response.ok) {
    throw new Error(await parseError(response, `Trip cancellation failed (${response.status})`));
  }
}

export async function pingRiderLocation(accessToken: string, payload: {
  lat: number;
  lng: number;
  heading?: number;
  speedKph?: number;
  accuracyMeters?: number;
  tripId?: string;
}) {
  const response = await apiRequest(withBase("/api/rider/location"), {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(await parseError(response, `Location ping failed (${response.status})`));
  }

  return response.json();
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
  const response = await apiRequest(withBase("/api/passenger/trips"), {
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

export async function cancelPassengerTrip(accessToken: string, tripId: string, reason: string) {
  const response = await apiRequest(withBase(`/api/passenger/trips/${tripId}/cancel`), {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({ reason })
  });

  if (!response.ok) {
    throw new Error(await parseError(response, `Trip cancellation failed (${response.status})`));
  }
}

export async function getPassengerTripLive(accessToken: string, tripId: string) {
  const response = await apiRequest(withBase(`/api/passenger/trips/${tripId}/live`), {
    headers: {
      authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error(await parseError(response, `Live trip fetch failed (${response.status})`));
  }

  return response.json();
}

export async function getRiderTripLive(accessToken: string, tripId: string) {
  const response = await apiRequest(withBase(`/api/rider/trips/${tripId}/live`), {
    headers: {
      authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error(await parseError(response, `Live trip fetch failed (${response.status})`));
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

  const response = await apiRequest(withBase(`/api/passenger/riders/nearby?${query.toString()}`), {
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
  const response = await apiRequest(withBase("/api/passenger/fare-estimate"), {
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

export async function getPassengerTripHistory(accessToken: string, params?: { status?: string; limit?: number }) {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  if (params?.limit) query.set("limit", String(params.limit));

  const response = await apiRequest(withBase(`/api/passenger/trips/history${query.toString() ? `?${query.toString()}` : ""}`), {
    headers: {
      authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error(await parseError(response, `Trip history fetch failed (${response.status})`));
  }

  return response.json();
}

export async function getRiderTripHistory(accessToken: string, params?: { status?: string; limit?: number }) {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  if (params?.limit) query.set("limit", String(params.limit));

  const response = await apiRequest(withBase(`/api/rider/trips/history${query.toString() ? `?${query.toString()}` : ""}`), {
    headers: {
      authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error(await parseError(response, `Trip history fetch failed (${response.status})`));
  }

  return response.json();
}

export async function ratePassengerTrip(accessToken: string, tripId: string, payload: { rating: number; feedback?: string }) {
  const response = await apiRequest(withBase(`/api/passenger/trips/${tripId}/rate`), {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(await parseError(response, `Trip rating failed (${response.status})`));
  }

  return response.json();
}

export async function rateRiderTrip(accessToken: string, tripId: string, payload: { rating: number; feedback?: string }) {
  const response = await apiRequest(withBase(`/api/rider/trips/${tripId}/rate`), {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(await parseError(response, `Trip rating failed (${response.status})`));
  }

  return response.json();
}

export async function registerPushToken(accessToken: string, payload: {
  token: string;
  platform: "ios" | "android" | "web";
  appVersion?: string;
}) {
  const response = await apiRequest(withBase("/api/mobile/push-token"), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(await parseError(response, `Push token registration failed (${response.status})`));
  }

  return response.json();
}

export async function getMobilePreferences(accessToken: string) {
  const response = await apiRequest(withBase("/api/mobile/preferences"), {
    headers: {
      authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error(await parseError(response, `Preferences fetch failed (${response.status})`));
  }

  return response.json();
}

export async function saveMobilePreferences(accessToken: string, payload: {
  profileName?: string;
  profilePhone?: string;
  preferredPaymentMethod?: "card" | "wallet" | "cash";
  notifications?: {
    rideRequests: boolean;
    rideUpdates: boolean;
    promotions: boolean;
  };
}) {
  const response = await apiRequest(withBase("/api/mobile/preferences"), {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(await parseError(response, `Preferences save failed (${response.status})`));
  }

  return response.json();
}

export async function createSupportTicket(accessToken: string, payload: {
  subject: string;
  body: string;
  priority?: "low" | "normal" | "high";
}) {
  const response = await apiRequest(withBase("/api/mobile/support/tickets"), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(await parseError(response, `Support request failed (${response.status})`));
  }

  return response.json();
}

export async function getPassengerTripReceipt(accessToken: string, tripId: string) {
  const response = await apiRequest(withBase(`/api/passenger/trips/${tripId}/receipt`), {
    headers: {
      authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error(await parseError(response, `Receipt fetch failed (${response.status})`));
  }

  return response.json();
}

export async function getRiderTripReceipt(accessToken: string, tripId: string) {
  const response = await apiRequest(withBase(`/api/rider/trips/${tripId}/receipt`), {
    headers: {
      authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error(await parseError(response, `Earnings receipt fetch failed (${response.status})`));
  }

  return response.json();
}

export async function getPassengerReceipts(accessToken: string) {
  const response = await apiRequest(withBase("/api/passenger/receipts"), {
    headers: {
      authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error(await parseError(response, `Passenger receipts fetch failed (${response.status})`));
  }

  return response.json();
}

export async function getRiderReceipts(accessToken: string) {
  const response = await apiRequest(withBase("/api/rider/receipts"), {
    headers: {
      authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error(await parseError(response, `Rider receipts fetch failed (${response.status})`));
  }

  return response.json();
}

export async function listSupportTickets(accessToken: string) {
  const response = await apiRequest(withBase("/api/mobile/support/tickets"), {
    headers: {
      authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error(await parseError(response, `Support tickets fetch failed (${response.status})`));
  }

  return response.json();
}

export async function listSupportMessages(accessToken: string, ticketId: string) {
  const response = await apiRequest(withBase(`/api/mobile/support/tickets/${ticketId}/messages`), {
    headers: {
      authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error(await parseError(response, `Support messages fetch failed (${response.status})`));
  }

  return response.json();
}

export async function sendSupportMessage(accessToken: string, ticketId: string, body: string) {
  const response = await apiRequest(withBase(`/api/mobile/support/tickets/${ticketId}/messages`), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({ body })
  });

  if (!response.ok) {
    throw new Error(await parseError(response, `Support message send failed (${response.status})`));
  }

  return response.json();
}

export async function simulateSupportReply(accessToken: string, ticketId: string) {
  const response = await apiRequest(withBase(`/api/mobile/support/tickets/${ticketId}/simulate-reply`), {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error(await parseError(response, `Simulate support reply failed (${response.status})`));
  }

  return response.json();
}

export async function reportRiderIssue(accessToken: string, payload: {
  reportType: "driver_report" | "failed_transaction" | "dispute";
  subject: string;
  details: string;
  tripId?: string;
  driverId?: string;
  paymentTransactionId?: string;
}) {
  const response = await apiRequest(withBase("/api/mobile/reports"), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(await parseError(response, `Issue report failed (${response.status})`));
  }

  return response.json();
}

export async function listTripChatMessages(accessToken: string, tripId: string) {
  const response = await apiRequest(withBase(`/api/mobile/trips/${tripId}/chat`), {
    headers: {
      authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error(await parseError(response, `Trip chat fetch failed (${response.status})`));
  }

  return response.json();
}

export async function sendTripChatMessage(accessToken: string, tripId: string, body: string) {
  const response = await apiRequest(withBase(`/api/mobile/trips/${tripId}/chat`), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({ body })
  });

  if (!response.ok) {
    throw new Error(await parseError(response, `Trip chat send failed (${response.status})`));
  }

  return response.json();
}

type TripChatSubscriptionHandlers = {
  onRefreshRequired: () => void;
  onMode?: (mode: "stream" | "fallback") => void;
};

export function subscribeTripChatEvents(
  accessToken: string,
  role: "rider" | "passenger",
  tripId: string,
  handlers: TripChatSubscriptionHandlers
) {
  const EventSourceCtor = (globalThis as { EventSource?: new (url: string) => {
    addEventListener: (type: string, listener: (event: { data: string }) => void) => void;
    removeEventListener: (type: string, listener: (event: { data: string }) => void) => void;
    close: () => void;
    onerror: null | (() => void);
  } }).EventSource;
  if (EventSourceCtor) {
    const path = role === "rider"
      ? `/api/rider/trips/${tripId}/stream`
      : `/api/passenger/trips/${tripId}/stream`;
    const eventSource = new EventSourceCtor(withBase(`${path}?accessToken=${encodeURIComponent(accessToken)}`));

    const onTripEvent = (event: { data: string }) => {
      try {
        const payload = JSON.parse(event.data) as { rawMessage?: string };
        const raw = payload.rawMessage;
        if (!raw) return;
        const parsed = JSON.parse(raw) as { event?: string };
        if (parsed.event === "trip.chat_message") {
          handlers.onRefreshRequired();
        }
      } catch {
        // ignore malformed stream payloads
      }
    };

    eventSource.addEventListener("trip_event", onTripEvent);
    eventSource.addEventListener("ready", () => handlers.onMode?.("stream"));
    eventSource.onerror = () => {
      handlers.onMode?.("fallback");
      eventSource.close();
    };

    return () => {
      eventSource.removeEventListener("trip_event", onTripEvent);
      eventSource.close();
    };
  }

  handlers.onMode?.("fallback");
  const interval = setInterval(() => {
    handlers.onRefreshRequired();
  }, 3500);
  return () => clearInterval(interval);
}
