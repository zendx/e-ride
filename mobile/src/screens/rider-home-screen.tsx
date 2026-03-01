import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { updateRiderStatus, updateRiderTripStatus } from "../lib/api";
import { useAuth } from "../state/auth-context";

export function RiderHomeScreen() {
  const { session, logout } = useAuth();
  const [availability, setAvailability] = useState<"online" | "offline">("online");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [tripId, setTripId] = useState("");
  const [tripStatus, setTripStatus] = useState<"accepted" | "arrived" | "in_progress" | "completed" | "cancelled">("accepted");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  if (!session) return null;

  async function onUpdateAvailability() {
    setError("");
    setResult("");
    try {
      await updateRiderStatus(session.accessToken, {
        availability,
        lat: lat ? Number(lat) : undefined,
        lng: lng ? Number(lng) : undefined
      });
      setResult("Availability updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update availability.");
    }
  }

  async function onUpdateTripStatus() {
    setError("");
    setResult("");
    try {
      await updateRiderTripStatus(session.accessToken, tripId.trim(), tripStatus);
      setResult("Trip status updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update trip status.");
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Rider App</Text>
      <Text style={styles.subtitle}>{session.user.email}</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Availability</Text>
        <View style={styles.row}>
          <TouchableOpacity style={[styles.pill, availability === "online" && styles.pillActive]} onPress={() => setAvailability("online")}>
            <Text style={availability === "online" ? styles.pillTextActive : styles.pillText}>Online</Text>
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
        <Text style={styles.sectionTitle}>Trip Status</Text>
        <TextInput style={styles.input} value={tripId} onChangeText={setTripId} placeholder="Trip ID" />
        <View style={styles.rowWrap}>
          {(["accepted", "arrived", "in_progress", "completed", "cancelled"] as const).map((status) => (
            <TouchableOpacity key={status} style={[styles.pill, tripStatus === status && styles.pillActive]} onPress={() => setTripStatus(status)}>
              <Text style={tripStatus === status ? styles.pillTextActive : styles.pillText}>{status}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={styles.button} onPress={onUpdateTripStatus}>
          <Text style={styles.buttonText}>Update Trip Status</Text>
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
  success: {
    color: "#0f5132"
  },
  error: {
    color: "#8e1b1b"
  }
});
