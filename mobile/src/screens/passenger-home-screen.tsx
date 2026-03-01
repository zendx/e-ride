import React, { useCallback, useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { estimatePassengerFare, requestPassengerTrip, searchNearbyRiders } from "../lib/api";
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

type PassengerHomeScreenProps = {
  onRoleAuthError?: () => void;
};

export function PassengerHomeScreen({ onRoleAuthError }: PassengerHomeScreenProps) {
  const { session } = useAuth();
  const accessToken = session?.accessToken ?? "";

  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [pickup, setPickup] = useState<Pin | null>(null);
  const [dropoff, setDropoff] = useState<Pin | null>(null);
  const [riders, setRiders] = useState<NearbyRider[]>([]);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [durationMin, setDurationMin] = useState<number | null>(null);
  const [fareTotalMinor, setFareTotalMinor] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  const region = useMemo(() => {
    const base = pickup ?? dropoff ?? { lat: 6.5244, lng: 3.3792 };
    return {
      latitude: base.lat,
      longitude: base.lng,
      latitudeDelta: 0.08,
      longitudeDelta: 0.08
    };
  }, [dropoff, pickup]);

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

  async function onRequestTrip() {
    if (!pickupAddress.trim() || !dropoffAddress.trim()) {
      setError("Set pickup and destination first.");
      return;
    }

    setLoading(true);
    setError("");
    setResult("");
    try {
      const pickupPin = pickup ?? await geocodeAddress(pickupAddress.trim());
      const dropoffPin = dropoff ?? await geocodeAddress(dropoffAddress.trim());
      setPickup(pickupPin);
      setDropoff(dropoffPin);

      const [nearbyResult, route] = await Promise.all([
        searchNearbyRiders(accessToken, {
          lat: pickupPin.lat,
          lng: pickupPin.lng,
          radiusKm: 5,
          limit: 30
        }),
        estimateRoute(pickupPin, dropoffPin)
      ]);

      const fareResult = await estimatePassengerFare(accessToken, {
        estimatedDistanceKm: route.distanceKm,
        estimatedDurationMin: route.durationMin
      });

      setRiders((nearbyResult.data?.riders ?? []) as NearbyRider[]);
      setDistanceKm(route.distanceKm);
      setDurationMin(route.durationMin);
      setFareTotalMinor(fareResult.data?.fare?.totalMinor ?? null);

      const response = await requestPassengerTrip(accessToken, {
        pickupAddress: pickupAddress.trim(),
        dropoffAddress: dropoffAddress.trim(),
        pickupLat: pickupPin.lat,
        pickupLng: pickupPin.lng,
        dropoffLat: dropoffPin.lat,
        dropoffLng: dropoffPin.lng,
        estimatedDistanceKm: route.distanceKm,
        estimatedDurationMin: route.durationMin
      });

      const tripId = response?.data?.id ?? "created";
      setResult(`Ride requested successfully (${tripId}).`);
    } catch (err) {
      setError(handleApiError(err, "Failed to request ride."));
    } finally {
      setLoading(false);
    }
  }

  if (!session) return null;

  return (
    <View style={styles.container}>
      <View style={styles.heroWrap}>
        <AppMap
          region={region}
          height={430}
          markers={[
            ...(pickup
              ? [{ key: "pickup", coordinate: { latitude: pickup.lat, longitude: pickup.lng }, title: "Pickup", pinColor: "#7c3aed" }]
              : []),
            ...(dropoff
              ? [{ key: "dropoff", coordinate: { latitude: dropoff.lat, longitude: dropoff.lng }, title: "Dropoff", pinColor: "#ef4444" }]
              : []),
            ...riders.map((rider) => ({
              key: rider.id,
              coordinate: { latitude: rider.lat, longitude: rider.lng },
              title: rider.user.fullName,
              description: `${rider.distanceKm} km away`
            }))
          ]}
        />

        <View style={styles.mapTopRow}>
          <View style={styles.sideSpacer} />
          <Text style={styles.mapBrand}>Cyber Rydes</Text>
          <View style={styles.avatarDot}>
            <Ionicons name="person" size={16} color="#7c3aed" />
          </View>
        </View>

        <View style={styles.mapCenterPulse}>
          <View style={styles.mapCenterInner}>
            <Ionicons name="navigate" size={16} color="#ffffff" />
          </View>
        </View>

        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Where are you going today?</Text>
          <View style={styles.routeRow}>
            <View style={[styles.routeDot, styles.routeDotPickup]} />
            <TextInput
              style={styles.routeInput}
              placeholder="Choose pick up point"
              value={pickupAddress}
              onChangeText={setPickupAddress}
              placeholderTextColor="#8f95a3"
            />
            <TouchableOpacity onPress={() => void resolvePickup()}>
              <Ionicons name="chevron-forward" size={16} color="#7b8190" />
            </TouchableOpacity>
          </View>
          <View style={styles.routeRow}>
            <View style={[styles.routeDot, styles.routeDotDropoff]} />
            <TextInput
              style={styles.routeInput}
              placeholder="Choose your destination"
              value={dropoffAddress}
              onChangeText={setDropoffAddress}
              placeholderTextColor="#8f95a3"
            />
            <TouchableOpacity onPress={() => void resolveDropoff()}>
              <Ionicons name="chevron-forward" size={16} color="#7b8190" />
            </TouchableOpacity>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.requestRideBtn} onPress={() => void onRequestTrip()} disabled={loading}>
              <Ionicons name="car-sport" size={18} color="#fff" />
              <Text style={styles.requestRideBtnText}>{loading ? "Requesting..." : "Request Ride"}</Text>
            </TouchableOpacity>
          </View>

          {fareTotalMinor != null ? (
            <Text style={styles.tripMeta}>Estimated fare: {(fareTotalMinor / 100).toFixed(2)}</Text>
          ) : null}
          {distanceKm != null && durationMin != null ? (
            <Text style={styles.tripMeta}>Distance: {distanceKm} km | ETA: {durationMin} min</Text>
          ) : null}
        </View>
      </View>

      <NoticeBanner tone="success" message={result} />
      <NoticeBanner tone="error" message={error} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    gap: 10
  },
  heroWrap: {
    borderRadius: 26,
    overflow: "hidden",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb"
  },
  mapTopRow: {
    position: "absolute",
    top: 18,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  sideSpacer: {
    width: 36,
    height: 36
  },
  mapBrand: {
    fontSize: 20,
    fontWeight: "800",
    color: "#25113d"
  },
  avatarDot: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#ececf2"
  },
  mapCenterPulse: {
    position: "absolute",
    top: 122,
    left: "50%",
    marginLeft: -44,
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "rgba(124,58,237,0.22)",
    alignItems: "center",
    justifyContent: "center"
  },
  mapCenterInner: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#7c3aed",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#ffffff"
  },
  sheet: {
    backgroundColor: "#f8f8fb",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 14,
    gap: 10
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#161a28"
  },
  routeRow: {
    height: 48,
    backgroundColor: "#efeff3",
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 10
  },
  routeDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 5
  },
  routeDotPickup: {
    borderColor: "#7c3aed"
  },
  routeDotDropoff: {
    borderColor: "#f43f5e"
  },
  routeInput: {
    flex: 1,
    color: "#1f2432"
  },
  actionRow: {
    flexDirection: "row"
  },
  requestRideBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#7c3aed",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8
  },
  requestRideBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16
  },
  tripMeta: {
    color: "#5b6375",
    fontSize: 12
  }
});
