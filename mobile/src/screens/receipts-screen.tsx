import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { getPassengerReceipts, getRiderReceipts } from "../lib/api";
import { NoticeBanner } from "../components/notice-banner";
import { AppRole } from "../types/auth";

type ReceiptsScreenProps = {
  accessToken: string;
  role: AppRole;
};

type PassengerReceipt = {
  id: string;
  fareTotalMinor: number;
  completedAt: string | null;
  downloadUrl?: string;
};

type RiderReceipt = {
  id: string;
  riderEarningsMinor: number;
  completedAt: string | null;
  downloadUrl?: string;
};

export function ReceiptsScreen({ accessToken, role }: ReceiptsScreenProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [passengerReceipts, setPassengerReceipts] = useState<PassengerReceipt[]>([]);
  const [riderReceipts, setRiderReceipts] = useState<RiderReceipt[]>([]);

  async function loadReceipts() {
    setLoading(true);
    setError("");
    try {
      if (role === "passenger") {
        const response = await getPassengerReceipts(accessToken);
        setPassengerReceipts((response?.data?.receipts ?? []) as PassengerReceipt[]);
      } else {
        const response = await getRiderReceipts(accessToken);
        setRiderReceipts((response?.data?.receipts ?? []) as RiderReceipt[]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load receipts.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadReceipts();
  }, [role]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{role === "passenger" ? "Trip Receipts" : "Earnings Receipts"}</Text>
      <TouchableOpacity style={styles.button} onPress={() => void loadReceipts()}>
        <Text style={styles.buttonText}>{loading ? "Refreshing..." : "Refresh"}</Text>
      </TouchableOpacity>
      <NoticeBanner tone="error" message={error} />

      {role === "passenger"
        ? passengerReceipts.map((receipt) => (
          <View key={receipt.id} style={styles.card}>
            <Text style={styles.heading}>Trip {receipt.id.slice(0, 8)}</Text>
            <Text style={styles.muted}>Total: {(receipt.fareTotalMinor / 100).toFixed(2)}</Text>
            {receipt.downloadUrl ? <Text style={styles.muted}>Download: {receipt.downloadUrl}</Text> : null}
          </View>
        ))
        : riderReceipts.map((receipt) => (
          <View key={receipt.id} style={styles.card}>
            <Text style={styles.heading}>Trip {receipt.id.slice(0, 8)}</Text>
            <Text style={styles.muted}>Earnings: {(receipt.riderEarningsMinor / 100).toFixed(2)}</Text>
            {receipt.downloadUrl ? <Text style={styles.muted}>Download: {receipt.downloadUrl}</Text> : null}
          </View>
        ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 10
  },
  title: {
    fontSize: 22,
    fontWeight: "700"
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
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d8e1ee",
    padding: 12,
    gap: 4
  },
  heading: {
    fontWeight: "700",
    color: "#0f1f33"
  },
  muted: {
    color: "#5a6f8a"
  }
});
