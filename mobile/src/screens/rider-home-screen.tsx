import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { cancelRiderTrip, getRiderTripHistory, getRiderTripLive, getRiderTripReceipt, listTripChatMessages, pingRiderLocation, rateRiderTrip, sendTripChatMessage, subscribeTripChatEvents, updateRiderStatus, updateRiderTripStatusWithReason } from "../lib/api";
import { isAuthOrRoleError, toApiErrorMessage } from "../lib/api-errors";
import { NoticeBanner } from "../components/notice-banner";
import { useAuth } from "../state/auth-context";

type RiderHistoryItem = {
  id: string;
  status: string;
  pickupAddress: string;
  dropoffAddress: string;
  requestedAt: string;
  fareTotalMinor: number;
  passenger?: {
    user?: {
      fullName?: string;
    };
  } | null;
};

type RiderHomeScreenProps = {
  onRoleAuthError?: () => void;
};

export function RiderHomeScreen({ onRoleAuthError }: RiderHomeScreenProps) {
  const { session } = useAuth();
  const [availability, setAvailability] = useState<"online" | "offline">("online");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [tripId, setTripId] = useState("");
  const [tripStatus, setTripStatus] = useState<"accepted" | "arrived" | "in_progress" | "completed" | "cancelled">("accepted");
  const [cancelReason, setCancelReason] = useState("");
  const [cancelTripId, setCancelTripId] = useState("");
  const [history, setHistory] = useState<RiderHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [liveTripId, setLiveTripId] = useState("");
  const [liveSnapshot, setLiveSnapshot] = useState<string>("");
  const [liveTracking, setLiveTracking] = useState(false);
  const [ratingTripId, setRatingTripId] = useState("");
  const [ratingValue, setRatingValue] = useState("5");
  const [ratingFeedback, setRatingFeedback] = useState("");
  const [rideEarningsMinor, setRideEarningsMinor] = useState<number | null>(null);
  const [tipMinor, setTipMinor] = useState<number>(0);
  const [chatTripId, setChatTripId] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; senderRole?: string; body?: string }>>([]);
  const [chatMessageInput, setChatMessageInput] = useState("");
  const [chatLive, setChatLive] = useState(false);
  const [chatMode, setChatMode] = useState<"idle" | "stream" | "fallback">("idle");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  if (!session) return null;
  const activeSession = session;
  function handleApiError(err: unknown, fallback: string) {
    if (isAuthOrRoleError(err)) {
      onRoleAuthError?.();
      return "Session access issue detected. Open Profile tab to switch role or log in again.";
    }
    return toApiErrorMessage(err, fallback);
  }
  const liveParsed = useMemo(() => {
    if (!liveSnapshot.trim()) return null;
    try {
      return JSON.parse(liveSnapshot) as {
        trip?: { pickupLat?: number; pickupLng?: number; dropoffLat?: number; dropoffLng?: number; status?: string };
        latestPing?: { lat?: number; lng?: number };
        eta?: { toPickupMin?: number | null; toDropoffMin?: number | null };
      };
    } catch {
      return null;
    }
  }, [liveSnapshot]);
  const mapRegion = useMemo(() => {
    const fallback = { latitude: 6.5244, longitude: 3.3792, latitudeDelta: 0.08, longitudeDelta: 0.08 };
    const pingLat = liveParsed?.latestPing?.lat;
    const pingLng = liveParsed?.latestPing?.lng;
    if (typeof pingLat === "number" && typeof pingLng === "number") {
      return {
        latitude: pingLat,
        longitude: pingLng,
        latitudeDelta: 0.06,
        longitudeDelta: 0.06
      };
    }
    if (lat && lng) {
      return {
        latitude: Number(lat),
        longitude: Number(lng),
        latitudeDelta: 0.06,
        longitudeDelta: 0.06
      };
    }
    return fallback;
  }, [lat, lng, liveParsed]);

  async function onUpdateAvailability() {
    setError("");
    setResult("");
    try {
      await updateRiderStatus(activeSession.accessToken, {
        availability,
        lat: lat ? Number(lat) : undefined,
        lng: lng ? Number(lng) : undefined
      });
      if (lat && lng) {
        await pingRiderLocation(activeSession.accessToken, {
          lat: Number(lat),
          lng: Number(lng),
          tripId: tripId.trim() || undefined
        });
      }
      setResult("Availability updated.");
    } catch (err) {
      setError(handleApiError(err, "Failed to update availability."));
    }
  }

  async function onUpdateTripStatus() {
    setError("");
    setResult("");
    try {
      await updateRiderTripStatusWithReason(activeSession.accessToken, tripId.trim(), {
        status: tripStatus,
        cancelReason: tripStatus === "cancelled" ? cancelReason.trim() : undefined
      });
      setResult("Trip status updated.");
    } catch (err) {
      setError(handleApiError(err, "Failed to update trip status."));
    }
  }

  async function onCancelTrip() {
    setError("");
    setResult("");
    try {
      await cancelRiderTrip(activeSession.accessToken, cancelTripId.trim(), cancelReason.trim());
      setResult("Trip cancelled.");
    } catch (err) {
      setError(handleApiError(err, "Failed to cancel trip."));
    }
  }

  async function loadHistory() {
    setHistoryLoading(true);
    setError("");
    try {
      const response = await getRiderTripHistory(activeSession.accessToken, { limit: 10 });
      const trips = ((response?.data?.trips ?? []) as RiderHistoryItem[]);
      setHistory(trips);
    } catch (err) {
      setError(handleApiError(err, "Failed to load trip history."));
    } finally {
      setHistoryLoading(false);
    }
  }

  async function loadLiveTrip() {
    if (!liveTripId.trim()) {
      setError("Trip ID is required.");
      return;
    }

    setError("");
    setResult("");
    try {
      const response = await getRiderTripLive(activeSession.accessToken, liveTripId.trim());
      setLiveSnapshot(JSON.stringify(response?.data ?? response, null, 2));
    } catch (err) {
      setError(handleApiError(err, "Failed to load live trip."));
    }
  }

  useEffect(() => {
    if (!liveTracking || !liveTripId.trim()) return;

    let active = true;
    const execute = async () => {
      try {
        const response = await getRiderTripLive(activeSession.accessToken, liveTripId.trim());
        if (active) {
          setLiveSnapshot(JSON.stringify(response?.data ?? response, null, 2));
        }
      } catch (err) {
        if (active) {
          setError(handleApiError(err, "Live tracking failed."));
        }
      }
    };

    void execute();
    const timer = setInterval(() => {
      void execute();
    }, 4000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [activeSession.accessToken, liveTracking, liveTripId]);

  async function submitRating() {
    const numeric = Number(ratingValue);
    if (!ratingTripId.trim() || Number.isNaN(numeric) || numeric < 1 || numeric > 5) {
      setError("Provide trip ID and rating (1-5).");
      return;
    }

    setError("");
    setResult("");
    try {
      await rateRiderTrip(activeSession.accessToken, ratingTripId.trim(), {
        rating: numeric,
        feedback: ratingFeedback.trim() || undefined
      });
      setResult("Passenger rating submitted.");
    } catch (err) {
      setError(handleApiError(err, "Failed to submit rating."));
    }
  }

  async function completeRideSummary() {
    const receiptTripId = ratingTripId.trim() || tripId.trim() || history[0]?.id;
    if (!receiptTripId) {
      setError("Provide a trip ID (Trip Status or Rating section) to load earnings.");
      return;
    }
    try {
      const response = await getRiderTripReceipt(activeSession.accessToken, receiptTripId);
      const riderEarnings = Number(response?.data?.earnings?.riderEarningsMinor ?? 0);
      const computedTipMinor = Math.round(riderEarnings * 0.1);
      setTipMinor(computedTipMinor);
      setRideEarningsMinor(riderEarnings + computedTipMinor);
      setResult("Ride earnings summary loaded.");
    } catch (err) {
      setError(handleApiError(err, "Failed to load earnings receipt."));
    }
  }

  async function loadTripChat() {
    if (!chatTripId.trim()) {
      setError("Trip ID is required for chat.");
      return;
    }
    try {
      const response = await listTripChatMessages(activeSession.accessToken, chatTripId.trim());
      const rows = (response?.data?.messages ?? []) as Array<{ id: string; senderRole?: string; body?: string }>;
      setChatMessages(rows);
    } catch (err) {
      setError(handleApiError(err, "Failed to load trip chat."));
    }
  }

  async function postTripChatMessage() {
    if (!chatTripId.trim() || !chatMessageInput.trim()) return;
    try {
      await sendTripChatMessage(activeSession.accessToken, chatTripId.trim(), chatMessageInput.trim());
      setChatMessageInput("");
      await loadTripChat();
    } catch (err) {
      setError(handleApiError(err, "Failed to send trip chat message."));
    }
  }

  useEffect(() => {
    if (!chatLive || !chatTripId.trim()) {
      setChatMode("idle");
      return;
    }

    void loadTripChat();
    const unsubscribe = subscribeTripChatEvents(activeSession.accessToken, "rider", chatTripId.trim(), {
      onRefreshRequired: () => {
        void loadTripChat();
      },
      onMode: (mode) => setChatMode(mode)
    });
    return unsubscribe;
  }, [activeSession.accessToken, chatLive, chatTripId]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Driver Home</Text>
      <Text style={styles.subtitle}>{activeSession.user.email}</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Current Status</Text>
        <View style={styles.row}>
          <TouchableOpacity style={[styles.pill, availability === "online" && styles.pillActive]} onPress={() => setAvailability("online")}>
            <Text style={availability === "online" ? styles.pillTextActive : styles.pillText}>Available</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.pill, availability === "offline" && styles.pillActive]} onPress={() => setAvailability("offline")}>
            <Text style={availability === "offline" ? styles.pillTextActive : styles.pillText}>Offline</Text>
          </TouchableOpacity>
        </View>
        <TextInput style={styles.input} value={lat} onChangeText={setLat} keyboardType="numeric" placeholder="Latitude (optional)" />
        <TextInput style={styles.input} value={lng} onChangeText={setLng} keyboardType="numeric" placeholder="Longitude (optional)" />
        <TouchableOpacity style={styles.button} onPress={onUpdateAvailability}>
          <Text style={styles.buttonText}>Update Availability</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Incoming Ride Request</Text>
        <TextInput style={styles.input} value={tripId} onChangeText={setTripId} placeholder="Trip ID" />
        <View style={styles.rowWrap}>
          {(["accepted", "arrived", "in_progress", "completed", "cancelled"] as const).map((status) => (
            <TouchableOpacity key={status} style={[styles.pill, tripStatus === status && styles.pillActive]} onPress={() => setTripStatus(status)}>
              <Text style={tripStatus === status ? styles.pillTextActive : styles.pillText}>{status}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {tripStatus === "cancelled" ? (
          <TextInput style={styles.input} value={cancelReason} onChangeText={setCancelReason} placeholder="Cancellation reason" />
        ) : null}
        <TouchableOpacity style={styles.button} onPress={onUpdateTripStatus}>
          <Text style={styles.buttonText}>Update Trip Status</Text>
        </TouchableOpacity>
        <View style={styles.row}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {
              setTripStatus("accepted");
              void onUpdateTripStatus();
            }}
          >
            <Text style={styles.secondaryButtonText}>Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {
              setTripStatus("cancelled");
              void onUpdateTripStatus();
            }}
          >
            <Text style={styles.secondaryButtonText}>Decline</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Navigation</Text>
        <MapView style={styles.map} initialRegion={mapRegion} region={mapRegion}>
          {liveParsed?.latestPing?.lat != null && liveParsed?.latestPing?.lng != null ? (
            <Marker coordinate={{ latitude: liveParsed.latestPing.lat, longitude: liveParsed.latestPing.lng }} title="You" pinColor="blue" />
          ) : null}
          {liveParsed?.trip?.pickupLat != null && liveParsed?.trip?.pickupLng != null ? (
            <Marker coordinate={{ latitude: liveParsed.trip.pickupLat, longitude: liveParsed.trip.pickupLng }} title="Pickup" pinColor="green" />
          ) : null}
          {liveParsed?.trip?.dropoffLat != null && liveParsed?.trip?.dropoffLng != null ? (
            <Marker coordinate={{ latitude: liveParsed.trip.dropoffLat, longitude: liveParsed.trip.dropoffLng }} title="Destination" pinColor="red" />
          ) : null}
        </MapView>
        <Text style={styles.muted}>ETA to pickup: {liveParsed?.eta?.toPickupMin ?? "-"} min</Text>
        <Text style={styles.muted}>ETA to dropoff: {liveParsed?.eta?.toDropoffMin ?? "-"} min</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Cancel Trip</Text>
        <TextInput style={styles.input} value={cancelTripId} onChangeText={setCancelTripId} placeholder="Trip ID" />
        <TextInput style={styles.input} value={cancelReason} onChangeText={setCancelReason} placeholder="Cancellation reason" />
        <TouchableOpacity style={styles.button} onPress={onCancelTrip}>
          <Text style={styles.buttonText}>Cancel Trip</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Recent Trips</Text>
        <TouchableOpacity style={styles.button} onPress={() => void loadHistory()}>
          <Text style={styles.buttonText}>{historyLoading ? "Loading..." : "Refresh History"}</Text>
        </TouchableOpacity>
        {history.map((trip) => (
          <View key={trip.id} style={styles.historyItem}>
            <Text style={styles.historyTitle}>{trip.status.toUpperCase()} | {(trip.fareTotalMinor / 100).toFixed(2)}</Text>
            <Text style={styles.muted}>{trip.pickupAddress} {"->"} {trip.dropoffAddress}</Text>
            <Text style={styles.muted}>Passenger: {trip.passenger?.user?.fullName ?? "-"}</Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Ride in Progress</Text>
        <TextInput style={styles.input} value={liveTripId} onChangeText={setLiveTripId} placeholder="Trip ID" />
        <View style={styles.row}>
          <TouchableOpacity style={styles.button} onPress={() => setLiveTracking(true)}>
            <Text style={styles.buttonText}>Start Live Tracking</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ghostButton} onPress={() => setLiveTracking(false)}>
            <Text style={styles.ghostButtonText}>Stop</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.secondaryButton} onPress={loadLiveTrip}>
          <Text style={styles.secondaryButtonText}>Refresh Once</Text>
        </TouchableOpacity>
        {liveSnapshot ? <Text style={styles.muted}>{liveSnapshot}</Text> : null}
        <Text style={styles.muted}>{liveTracking ? "Tracking live every 4 seconds" : "Live tracking paused"}</Text>
        <View style={styles.row}>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => setResult("Chat with rider will open here.")}>
            <Text style={styles.secondaryButtonText}>Chat Rider</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => setResult("Call rider will open here.")}>
            <Text style={styles.secondaryButtonText}>Call Rider</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => setResult("Emergency alert triggered.")}>
          <Text style={styles.secondaryButtonText}>Emergency SOS</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Rate Passenger</Text>
        <TextInput style={styles.input} value={ratingTripId} onChangeText={setRatingTripId} placeholder="Completed Trip ID" />
        <TextInput style={styles.input} value={ratingValue} onChangeText={setRatingValue} keyboardType="numeric" placeholder="Rating (1-5)" />
        <TextInput style={styles.input} value={ratingFeedback} onChangeText={setRatingFeedback} placeholder="Feedback (optional)" />
        <TouchableOpacity style={styles.button} onPress={submitRating}>
          <Text style={styles.buttonText}>Submit Rating</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Ride Completion & Earnings</Text>
        <Text style={styles.muted}>Base Earnings: {rideEarningsMinor != null ? ((rideEarningsMinor - tipMinor) / 100).toFixed(2) : "-"}</Text>
        <Text style={styles.muted}>Tips: {(tipMinor / 100).toFixed(2)}</Text>
        <Text style={styles.muted}>Total Earnings: {rideEarningsMinor != null ? (rideEarningsMinor / 100).toFixed(2) : "-"}</Text>
        <TouchableOpacity style={styles.button} onPress={() => void completeRideSummary()}>
          <Text style={styles.buttonText}>Generate Earnings Summary</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Emergency & Support</Text>
        <View style={styles.row}>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => setResult("Emergency alert sent with live location.")}>
            <Text style={styles.secondaryButtonText}>Emergency SOS</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => setResult("Open the Help tab for support chat and tickets.")}>
            <Text style={styles.secondaryButtonText}>Open Help Tab</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>In-App Trip Chat</Text>
        <TextInput style={styles.input} value={chatTripId} onChangeText={setChatTripId} placeholder="Trip ID" />
        <View style={styles.row}>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => void loadTripChat()}>
            <Text style={styles.secondaryButtonText}>Load Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => setChatLive((current) => !current)}>
            <Text style={styles.secondaryButtonText}>{chatLive ? "Stop Live" : "Start Live"}</Text>
          </TouchableOpacity>
        </View>
        {chatMessages.map((message) => (
          <View key={message.id} style={styles.historyItem}>
            <Text style={styles.historyTitle}>{message.senderRole ?? "user"}</Text>
            <Text style={styles.muted}>{message.body ?? ""}</Text>
          </View>
        ))}
        <Text style={styles.muted}>
          {chatLive
            ? chatMode === "stream"
              ? "Chat live mode: stream"
              : "Chat live mode: polling fallback (3.5s)"
            : "Chat live mode paused"}
        </Text>
        <TextInput style={styles.input} value={chatMessageInput} onChangeText={setChatMessageInput} placeholder="Type message" />
        <TouchableOpacity style={styles.button} onPress={() => void postTripChatMessage()}>
          <Text style={styles.buttonText}>Send</Text>
        </TouchableOpacity>
      </View>

      <NoticeBanner tone="success" message={result} />
      <NoticeBanner tone="error" message={error} />

      <TouchableOpacity
        style={styles.button}
        onPress={() => {
          setAvailability("online");
          void onUpdateAvailability();
          setResult("Ready for next ride.");
        }}
      >
        <Text style={styles.buttonText}>Go to Next Ride</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12
  },
  title: {
    fontSize: 22,
    fontWeight: "700"
  },
  subtitle: {
    color: "#5a6f8a"
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    gap: 10
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700"
  },
  input: {
    borderWidth: 1,
    borderColor: "#d8e1ee",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44
  },
  map: {
    height: 240,
    borderRadius: 12
  },
  row: {
    flexDirection: "row",
    gap: 8
  },
  rowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  pill: {
    borderWidth: 1,
    borderColor: "#d8e1ee",
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  pillActive: {
    backgroundColor: "#0e7490",
    borderColor: "#0e7490"
  },
  pillText: {
    color: "#0f1f33"
  },
  pillTextActive: {
    color: "#fff"
  },
  button: {
    backgroundColor: "#0e7490",
    borderRadius: 10,
    height: 44,
    justifyContent: "center",
    alignItems: "center"
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#d8e1ee",
    borderRadius: 10,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff"
  },
  secondaryButtonText: {
    color: "#0f1f33",
    fontWeight: "600"
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700"
  },
  ghostButton: {
    borderWidth: 1,
    borderColor: "#d8e1ee",
    borderRadius: 10,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff"
  },
  ghostButtonText: {
    color: "#0f1f33",
    fontWeight: "700"
  },
  historyItem: {
    borderWidth: 1,
    borderColor: "#d8e1ee",
    borderRadius: 10,
    padding: 10,
    gap: 4
  },
  historyTitle: {
    fontWeight: "700",
    color: "#0f1f33"
  }
});
