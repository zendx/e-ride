import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { cancelPassengerTrip, estimatePassengerFare, getPassengerTripHistory, getPassengerTripLive, getPassengerTripReceipt, listTripChatMessages, ratePassengerTrip, requestPassengerTrip, searchNearbyRiders, sendTripChatMessage, subscribeTripChatEvents } from "../lib/api";
import { isAuthOrRoleError, toApiErrorMessage } from "../lib/api-errors";
import { AppMap } from "../components/app-map";
import { NoticeBanner } from "../components/notice-banner";
import { estimateRoute, geocodeAddress } from "../lib/maps";
import { useAuth } from "../state/auth-context";

type Pin = { lat: number; lng: number };

type NearbyRider = {
  id: string;
  lat: number;
  lng: number;
  distanceKm: number;
  user: { fullName: string };
};

type PassengerHistoryItem = {
  id: string;
  status: string;
  pickupAddress: string;
  dropoffAddress: string;
  fareTotalMinor: number;
  rider?: {
    user?: {
      fullName?: string;
    };
    vehicleType?: string;
    vehiclePlate?: string;
  } | null;
};

type PassengerHomeScreenProps = {
  onRoleAuthError?: () => void;
};

export function PassengerHomeScreen({ onRoleAuthError }: PassengerHomeScreenProps) {
  const { session } = useAuth();
  const accessToken = session?.accessToken ?? "";
  const userEmail = session?.user.email ?? "";
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [pickup, setPickup] = useState<Pin | null>(null);
  const [dropoff, setDropoff] = useState<Pin | null>(null);
  const [riders, setRiders] = useState<NearbyRider[]>([]);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [durationMin, setDurationMin] = useState<number | null>(null);
  const [fareTotalMinor, setFareTotalMinor] = useState<number | null>(null);
  const [rideType, setRideType] = useState<"economy" | "premium" | "shared">("economy");
  const [cancelTripId, setCancelTripId] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [history, setHistory] = useState<PassengerHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [liveTripId, setLiveTripId] = useState("");
  const [liveSnapshot, setLiveSnapshot] = useState("");
  const [liveTracking, setLiveTracking] = useState(false);
  const [ratingTripId, setRatingTripId] = useState("");
  const [ratingValue, setRatingValue] = useState("5");
  const [ratingFeedback, setRatingFeedback] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "wallet" | "cash">("card");
  const [completedFareMinor, setCompletedFareMinor] = useState<number | null>(null);
  const [receiptId, setReceiptId] = useState("");
  const [chatTripId, setChatTripId] = useState("");
  const [chatMessages, setChatMessages] = useState<{ id: string; senderRole?: string; body?: string }[]>([]);
  const [chatMessageInput, setChatMessageInput] = useState("");
  const [chatLive, setChatLive] = useState(false);
  const [chatMode, setChatMode] = useState<"idle" | "stream" | "fallback">("idle");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const region = useMemo(() => {
    const base = pickup ?? dropoff ?? { lat: 6.5244, lng: 3.3792 };
    return {
      latitude: base.lat,
      longitude: base.lng,
      latitudeDelta: 0.08,
      longitudeDelta: 0.08
    };
  }, [dropoff, pickup]);
  const selectedVehicleMultiplier = rideType === "premium" ? 1.6 : rideType === "shared" ? 0.8 : 1;
  const adjustedFareMinor = fareTotalMinor != null ? Math.round(fareTotalMinor * selectedVehicleMultiplier) : null;
  const leadDriver = riders[0] ?? null;
  const etaText = useMemo(() => {
    if (!liveSnapshot.trim()) return "-";
    try {
      const parsed = JSON.parse(liveSnapshot) as { eta?: { toPickupMin?: number | null } };
      const eta = parsed.eta?.toPickupMin;
      return typeof eta === "number" ? `${eta} min` : "-";
    } catch {
      return "-";
    }
  }, [liveSnapshot]);

  const handleApiError = useCallback((err: unknown, fallback: string) => {
    if (isAuthOrRoleError(err)) {
      onRoleAuthError?.();
      return "Session access issue detected. Open Profile tab to switch role or log in again.";
    }
    return toApiErrorMessage(err, fallback);
  }, [onRoleAuthError]);

  async function resolvePickup() {
    setError("");
    const pin = await geocodeAddress(pickupAddress.trim());
    setPickup(pin);
  }

  async function resolveDropoff() {
    setError("");
    const pin = await geocodeAddress(dropoffAddress.trim());
    setDropoff(pin);
  }

  async function searchRidersAndEstimateFare() {
    if (!pickup || !dropoff) {
      setError("Set pickup and dropoff locations first.");
      return;
    }

    setLoading(true);
    setError("");
    setResult("");
    try {
      const [nearbyResult, route] = await Promise.all([
        searchNearbyRiders(accessToken, {
          lat: pickup.lat,
          lng: pickup.lng,
          radiusKm: 5,
          limit: 30
        }),
        estimateRoute(pickup, dropoff)
      ]);

      const fareResult = await estimatePassengerFare(accessToken, {
        estimatedDistanceKm: route.distanceKm,
        estimatedDurationMin: route.durationMin
      });

      setRiders((nearbyResult.data?.riders ?? []) as NearbyRider[]);
      setDistanceKm(route.distanceKm);
      setDurationMin(route.durationMin);
      setFareTotalMinor(fareResult.data?.fare?.totalMinor ?? null);
      setResult("Nearby drivers and fare estimate loaded.");
    } catch (err) {
      setError(handleApiError(err, "Unable to search drivers."));
    } finally {
      setLoading(false);
    }
  }

  async function onRequestTrip() {
    if (!pickup || !dropoff || !distanceKm || !durationMin) {
      setError("Search drivers and fare first.");
      return;
    }

    setLoading(true);
    setError("");
    setResult("");
    try {
      const response = await requestPassengerTrip(accessToken, {
        pickupAddress: pickupAddress.trim(),
        dropoffAddress: dropoffAddress.trim(),
        pickupLat: pickup.lat,
        pickupLng: pickup.lng,
        dropoffLat: dropoff.lat,
        dropoffLng: dropoff.lng,
        estimatedDistanceKm: distanceKm,
        estimatedDurationMin: durationMin
      });

      const tripId = response?.data?.id ?? "created";
      setResult(`Trip requested successfully (${tripId}).`);
    } catch (err) {
      setError(handleApiError(err, "Failed to request trip."));
    } finally {
      setLoading(false);
    }
  }

  async function onCancelTrip() {
    if (!cancelTripId.trim() || !cancelReason.trim()) {
      setError("Trip ID and cancellation reason are required.");
      return;
    }

    setLoading(true);
    setError("");
    setResult("");
    try {
      await cancelPassengerTrip(accessToken, cancelTripId.trim(), cancelReason.trim());
      setResult("Trip cancelled.");
    } catch (err) {
      setError(handleApiError(err, "Failed to cancel trip."));
    } finally {
      setLoading(false);
    }
  }

  async function loadHistory() {
    setHistoryLoading(true);
    setError("");
    try {
      const response = await getPassengerTripHistory(accessToken, { limit: 10 });
      const trips = ((response?.data?.trips ?? []) as PassengerHistoryItem[]);
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
      const response = await getPassengerTripLive(accessToken, liveTripId.trim());
      setLiveSnapshot(JSON.stringify(response?.data ?? response, null, 2));
    } catch (err) {
      setError(handleApiError(err, "Failed to load live trip."));
    }
  }

  useEffect(() => {
    if (!session || !liveTracking || !liveTripId.trim()) return;

    let active = true;
    const execute = async () => {
      try {
        const response = await getPassengerTripLive(accessToken, liveTripId.trim());
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
  }, [accessToken, handleApiError, liveTracking, liveTripId, session]);

  async function submitRating() {
    const numeric = Number(ratingValue);
    if (!ratingTripId.trim() || Number.isNaN(numeric) || numeric < 1 || numeric > 5) {
      setError("Provide trip ID and rating (1-5).");
      return;
    }

    setError("");
    setResult("");
    try {
      await ratePassengerTrip(accessToken, ratingTripId.trim(), {
        rating: numeric,
        feedback: ratingFeedback.trim() || undefined
      });
      setResult("Driver rating submitted.");
    } catch (err) {
      setError(handleApiError(err, "Failed to submit rating."));
    }
  }

  function completeRideAndPay() {
    if (adjustedFareMinor == null) {
      setError("Request and estimate a ride first.");
      return;
    }
    const feeMinor = Math.round(adjustedFareMinor * 0.04);
    const totalMinor = adjustedFareMinor + feeMinor;
    setCompletedFareMinor(totalMinor);
    setResult(`Payment successful via ${paymentMethod}.`);
    if (history[0]?.id) {
      void (async () => {
        try {
          const receipt = await getPassengerTripReceipt(accessToken, history[0].id);
          const paymentId = receipt?.data?.payment?.id as string | undefined;
          setReceiptId(paymentId ? `RCPT-${paymentId.slice(0, 8)}` : `RCPT-${Date.now()}`);
        } catch {
          setReceiptId(`RCPT-${Date.now()}`);
        }
      })();
    } else {
      setReceiptId(`RCPT-${Date.now()}`);
    }
  }

  const loadTripChat = useCallback(async () => {
    if (!chatTripId.trim()) {
      setError("Trip ID is required for chat.");
      return;
    }
    try {
      const response = await listTripChatMessages(accessToken, chatTripId.trim());
      const rows = (response?.data?.messages ?? []) as { id: string; senderRole?: string; body?: string }[];
      setChatMessages(rows);
    } catch (err) {
      setError(handleApiError(err, "Failed to load trip chat."));
    }
  }, [accessToken, chatTripId, handleApiError]);

  async function postTripChatMessage() {
    if (!chatTripId.trim() || !chatMessageInput.trim()) return;
    try {
      await sendTripChatMessage(accessToken, chatTripId.trim(), chatMessageInput.trim());
      setChatMessageInput("");
      await loadTripChat();
    } catch (err) {
      setError(handleApiError(err, "Failed to send trip chat message."));
    }
  }

  useEffect(() => {
    if (!session) return;
    if (!chatLive || !chatTripId.trim()) {
      setChatMode("idle");
      return;
    }

    void loadTripChat();
    const unsubscribe = subscribeTripChatEvents(accessToken, "passenger", chatTripId.trim(), {
      onRefreshRequired: () => {
        void loadTripChat();
      },
      onMode: (mode) => setChatMode(mode)
    });

    return unsubscribe;
  }, [accessToken, chatLive, chatTripId, loadTripChat, session]);

  if (!session) return null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Rider Home</Text>
      <Text style={styles.subtitle}>{userEmail}</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Where to?</Text>
        <TextInput
          style={styles.input}
          placeholder="Pickup location"
          value={pickupAddress}
          onChangeText={setPickupAddress}
        />
        <TouchableOpacity style={styles.secondaryButton} onPress={() => void resolvePickup()}>
          <Text style={styles.secondaryButtonText}>Set Pickup</Text>
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder="Destination"
          value={dropoffAddress}
          onChangeText={setDropoffAddress}
        />
        <TouchableOpacity style={styles.secondaryButton} onPress={() => void resolveDropoff()}>
          <Text style={styles.secondaryButtonText}>Set Dropoff</Text>
        </TouchableOpacity>

        <AppMap
          region={region}
          height={280}
          markers={[
            ...(pickup
              ? [{ key: "pickup", coordinate: { latitude: pickup.lat, longitude: pickup.lng }, title: "Pickup", pinColor: "green" }]
              : []),
            ...(dropoff
              ? [{ key: "dropoff", coordinate: { latitude: dropoff.lat, longitude: dropoff.lng }, title: "Dropoff", pinColor: "red" }]
              : []),
            ...riders.map((rider) => ({
              key: rider.id,
              coordinate: { latitude: rider.lat, longitude: rider.lng },
              title: rider.user.fullName,
              description: `${rider.distanceKm} km away`
            }))
          ]}
        />

        <Text style={styles.sectionTitle}>Vehicle Options</Text>
        <View style={styles.row}>
          {(["economy", "premium", "shared"] as const).map((type) => (
            <TouchableOpacity key={type} style={[styles.pill, rideType === type && styles.pillActive]} onPress={() => setRideType(type)}>
              <Text style={rideType === type ? styles.pillTextActive : styles.pillText}>{type}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.button} onPress={() => void searchRidersAndEstimateFare()} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? "Loading..." : "Search Drivers + Estimate Fare"}</Text>
        </TouchableOpacity>

        {distanceKm != null && durationMin != null ? (
          <Text style={styles.muted}>Distance: {distanceKm} km | Duration: {durationMin} min</Text>
        ) : null}
        {fareTotalMinor != null ? <Text style={styles.muted}>Base fare: {(fareTotalMinor / 100).toFixed(2)}</Text> : null}
        {adjustedFareMinor != null ? <Text style={styles.muted}>Selected ride ({rideType}): {(adjustedFareMinor / 100).toFixed(2)}</Text> : null}

        <TouchableOpacity style={styles.button} onPress={() => void onRequestTrip()} disabled={loading}>
          <Text style={styles.buttonText}>Request Trip</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Ride Request Details</Text>
        <Text style={styles.muted}>Driver: {leadDriver?.user.fullName ?? "Waiting for assignment"}</Text>
        <Text style={styles.muted}>ETA: {etaText}</Text>
        <View style={styles.row}>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => setResult("Chat will open here.")}>
            <Text style={styles.secondaryButtonText}>Chat Driver</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => setResult("Call will open here.")}>
            <Text style={styles.secondaryButtonText}>Call Driver</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => setResult("Ride details shared with trusted contact.")}>
          <Text style={styles.secondaryButtonText}>Share Ride Status</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Cancel Trip</Text>
        <TextInput style={styles.input} value={cancelTripId} onChangeText={setCancelTripId} placeholder="Trip ID" />
        <TextInput style={styles.input} value={cancelReason} onChangeText={setCancelReason} placeholder="Cancellation reason" />
        <TouchableOpacity style={styles.button} onPress={() => void onCancelTrip()} disabled={loading}>
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
            <Text style={styles.muted}>
              Driver: {trip.rider?.user?.fullName ?? "-"} {trip.rider?.vehiclePlate ? `(${trip.rider.vehiclePlate})` : ""}
            </Text>
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
        <TouchableOpacity style={styles.secondaryButton} onPress={() => void loadLiveTrip()}>
          <Text style={styles.secondaryButtonText}>Refresh Once</Text>
        </TouchableOpacity>
        {liveSnapshot ? <Text style={styles.muted}>{liveSnapshot}</Text> : null}
        <Text style={styles.muted}>{liveTracking ? "Tracking live every 4 seconds" : "Live tracking paused"}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Ride Completion & Payment</Text>
        <Text style={styles.muted}>Base Fare: {adjustedFareMinor != null ? (adjustedFareMinor / 100).toFixed(2) : "-"}</Text>
        <Text style={styles.muted}>Service Fee (4%): {adjustedFareMinor != null ? (Math.round(adjustedFareMinor * 0.04) / 100).toFixed(2) : "-"}</Text>
        <Text style={styles.muted}>Total: {completedFareMinor != null ? (completedFareMinor / 100).toFixed(2) : "-"}</Text>
        <Text style={styles.sectionTitle}>Payment Method</Text>
        <View style={styles.row}>
          {(["card", "wallet", "cash"] as const).map((method) => (
            <TouchableOpacity key={method} style={[styles.pill, paymentMethod === method && styles.pillActive]} onPress={() => setPaymentMethod(method)}>
              <Text style={paymentMethod === method ? styles.pillTextActive : styles.pillText}>{method}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={styles.button} onPress={completeRideAndPay}>
          <Text style={styles.buttonText}>Complete Ride & Pay</Text>
        </TouchableOpacity>
        {receiptId ? <Text style={styles.muted}>Receipt: {receiptId}</Text> : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Rate Driver</Text>
        <TextInput style={styles.input} value={ratingTripId} onChangeText={setRatingTripId} placeholder="Completed Trip ID" />
        <TextInput style={styles.input} value={ratingValue} onChangeText={setRatingValue} keyboardType="numeric" placeholder="Rating (1-5)" />
        <TextInput style={styles.input} value={ratingFeedback} onChangeText={setRatingFeedback} placeholder="Feedback (optional)" />
        <TouchableOpacity style={styles.button} onPress={() => void submitRating()}>
          <Text style={styles.buttonText}>Submit Rating</Text>
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
  row: {
    flexDirection: "row",
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
    color: "#0f1f33",
    textTransform: "capitalize"
  },
  pillTextActive: {
    color: "#fff",
    textTransform: "capitalize"
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
  muted: {
    color: "#5a6f8a"
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
