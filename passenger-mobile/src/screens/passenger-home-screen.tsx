import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { estimatePassengerFare, requestPassengerTrip, searchNearbyRiders } from "../lib/api";
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

export function PassengerHomeScreen() {
  const { session, logout } = useAuth();
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [pickup, setPickup] = useState<Pin | null>(null);
  const [dropoff, setDropoff] = useState<Pin | null>(null);
  const [riders, setRiders] = useState<NearbyRider[]>([]);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [durationMin, setDurationMin] = useState<number | null>(null);
  const [fareTotalMinor, setFareTotalMinor] = useState<number | null>(null);
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

  if (!session) return null;

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
        searchNearbyRiders(session.accessToken, {
          lat: pickup.lat,
          lng: pickup.lng,
          radiusKm: 5,
          limit: 30
        }),
        estimateRoute(pickup, dropoff)
      ]);

      const fareResult = await estimatePassengerFare(session.accessToken, {
        estimatedDistanceKm: route.distanceKm,
        estimatedDurationMin: route.durationMin
      });

      setRiders((nearbyResult.data?.riders ?? []) as NearbyRider[]);
      setDistanceKm(route.distanceKm);
      setDurationMin(route.durationMin);
      setFareTotalMinor(fareResult.data?.fare?.totalMinor ?? null);
      setResult("Nearby riders and fare estimate loaded.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to search riders.");
    } finally {
      setLoading(false);
    }
  }

  async function onRequestTrip() {
    if (!pickup || !dropoff || !distanceKm || !durationMin) {
      setError("Search riders and fare first.");
      return;
    }

    setLoading(true);
    setError("");
    setResult("");
    try {
      const response = await requestPassengerTrip(session.accessToken, {
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
      setError(err instanceof Error ? err.message : "Failed to request trip.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Passenger App</Text>
      <Text style={styles.subtitle}>{session.user.email}</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Trip Planner</Text>
        <TextInput
          style={styles.input}
          placeholder="Pickup address"
          value={pickupAddress}
          onChangeText={setPickupAddress}
        />
        <TouchableOpacity style={styles.secondaryButton} onPress={() => void resolvePickup()}>
          <Text style={styles.secondaryButtonText}>Set Pickup</Text>
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder="Dropoff address"
          value={dropoffAddress}
          onChangeText={setDropoffAddress}
        />
        <TouchableOpacity style={styles.secondaryButton} onPress={() => void resolveDropoff()}>
          <Text style={styles.secondaryButtonText}>Set Dropoff</Text>
        </TouchableOpacity>

        <MapView style={styles.map} initialRegion={region} region={region}>
          {pickup ? <Marker coordinate={{ latitude: pickup.lat, longitude: pickup.lng }} title="Pickup" pinColor="green" /> : null}
          {dropoff ? <Marker coordinate={{ latitude: dropoff.lat, longitude: dropoff.lng }} title="Dropoff" pinColor="red" /> : null}
          {riders.map((rider) => (
            <Marker
              key={rider.id}
              coordinate={{ latitude: rider.lat, longitude: rider.lng }}
              title={rider.user.fullName}
              description={`${rider.distanceKm} km away`}
            />
          ))}
        </MapView>

        <TouchableOpacity style={styles.button} onPress={() => void searchRidersAndEstimateFare()} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? "Loading..." : "Search Riders + Estimate Fare"}</Text>
        </TouchableOpacity>

        {distanceKm != null && durationMin != null ? (
          <Text style={styles.muted}>Distance: {distanceKm} km | Duration: {durationMin} min</Text>
        ) : null}
        {fareTotalMinor != null ? <Text style={styles.muted}>Estimated fare: {(fareTotalMinor / 100).toFixed(2)}</Text> : null}

        <TouchableOpacity style={styles.button} onPress={() => void onRequestTrip()} disabled={loading}>
          <Text style={styles.buttonText}>Request Trip</Text>
        </TouchableOpacity>
      </View>

      {result ? <Text style={styles.success}>{result}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={styles.ghostButton} onPress={() => void logout()}>
        <Text style={styles.ghostButtonText}>Logout</Text>
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
    height: 280,
    borderRadius: 12
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
  success: {
    color: "#0f5132"
  },
  error: {
    color: "#8e1b1b"
  }
});
