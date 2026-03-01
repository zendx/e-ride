import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { AppRole } from "../types/auth";

type WelcomeScreenProps = {
  onContinue: (role: AppRole) => void;
};

export function WelcomeScreen({ onContinue }: WelcomeScreenProps) {
  const [selectedRole, setSelectedRole] = useState<AppRole>("passenger");

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.logo}>CarryGo</Text>
        <Text style={styles.title}>Welcome</Text>
        <Text style={styles.subtitle}>Choose how you want to use the app</Text>

        <View style={styles.roleRow}>
          <TouchableOpacity
            style={[styles.roleButton, selectedRole === "passenger" && styles.roleButtonActive]}
            onPress={() => setSelectedRole("passenger")}
          >
            <Text style={selectedRole === "passenger" ? styles.roleTextActive : styles.roleText}>Rider</Text>
            <Text style={styles.roleHint}>Book trips</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleButton, selectedRole === "rider" && styles.roleButtonActive]}
            onPress={() => setSelectedRole("rider")}
          >
            <Text style={selectedRole === "rider" ? styles.roleTextActive : styles.roleText}>Driver</Text>
            <Text style={styles.roleHint}>Accept trips</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.cta} onPress={() => onContinue(selectedRole)}>
          <Text style={styles.ctaText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 16
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    gap: 10
  },
  logo: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0f1f33"
  },
  title: {
    fontSize: 22,
    fontWeight: "700"
  },
  subtitle: {
    color: "#5a6f8a"
  },
  roleRow: {
    flexDirection: "row",
    gap: 10
  },
  roleButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d8e1ee",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 10,
    gap: 4,
    backgroundColor: "#fff"
  },
  roleButtonActive: {
    borderColor: "#0e7490",
    backgroundColor: "#ecfeff"
  },
  roleText: {
    fontWeight: "700",
    color: "#0f1f33"
  },
  roleTextActive: {
    fontWeight: "700",
    color: "#0e7490"
  },
  roleHint: {
    color: "#5a6f8a",
    fontSize: 12
  },
  cta: {
    backgroundColor: "#0e7490",
    borderRadius: 10,
    height: 46,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8
  },
  ctaText: {
    color: "#fff",
    fontWeight: "700"
  }
});
