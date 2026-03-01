import React, { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { registerRider } from "../lib/api";
import { useAuth } from "../state/auth-context";
import { API_BASE_URL } from "../lib/config";

export function LoginScreen() {
  const { login, loading } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tenantSlug, setTenantSlug] = useState("");
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    setError("");
    setMessage("");
    setSubmitting(true);
    try {
      if (mode === "login") {
        await login(email.trim(), password);
      } else {
        await registerRider({
          tenantSlug: tenantSlug.trim().toLowerCase(),
          fullName: fullName.trim(),
          email: email.trim(),
          password,
          phoneNumber: phoneNumber.trim() || undefined,
          licenseNumber: licenseNumber.trim(),
          vehicleType: vehicleType.trim(),
          vehiclePlate: vehiclePlate.trim()
        });
        setMode("login");
        setMessage("Registration submitted. Await tenant approval, then login.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to login.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>CarryGo Mobile</Text>
        <Text style={styles.subtitle}>
          {mode === "login" ? "Rider and passenger login" : "Rider registration"}
        </Text>

        <View style={styles.switchRow}>
          <TouchableOpacity style={[styles.switchButton, mode === "login" && styles.switchButtonActive]} onPress={() => setMode("login")}>
            <Text style={mode === "login" ? styles.switchTextActive : styles.switchText}>Login</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.switchButton, mode === "register" && styles.switchButtonActive]} onPress={() => setMode("register")}>
            <Text style={mode === "register" ? styles.switchTextActive : styles.switchText}>Register Rider</Text>
          </TouchableOpacity>
        </View>

        {mode === "register" ? (
          <>
            <TextInput
              style={styles.input}
              value={tenantSlug}
              onChangeText={setTenantSlug}
              autoCapitalize="none"
              placeholder="Tenant slug (e.g. alpha-rides)"
            />
            <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="Full name" />
            <TextInput style={styles.input} value={phoneNumber} onChangeText={setPhoneNumber} placeholder="Phone number" />
            <TextInput style={styles.input} value={licenseNumber} onChangeText={setLicenseNumber} placeholder="License number" />
            <TextInput style={styles.input} value={vehicleType} onChangeText={setVehicleType} placeholder="Vehicle type" />
            <TextInput style={styles.input} value={vehiclePlate} onChangeText={setVehiclePlate} placeholder="Vehicle plate" />
          </>
        ) : null}

        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="Email"
        />
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Password"
        />

        <TouchableOpacity style={styles.button} onPress={onSubmit} disabled={submitting}>
          <Text style={styles.buttonText}>
            {submitting ? (mode === "login" ? "Logging in..." : "Submitting...") : (mode === "login" ? "Login" : "Submit Registration")}
          </Text>
        </TouchableOpacity>

        {message ? <Text style={styles.success}>{message}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Text style={styles.muted}>API: {API_BASE_URL}</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 16
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    gap: 10
  },
  title: {
    fontSize: 22,
    fontWeight: "700"
  },
  subtitle: {
    color: "#5a6f8a",
    marginBottom: 6
  },
  switchRow: {
    flexDirection: "row",
    gap: 8
  },
  switchButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d8e1ee",
    borderRadius: 10,
    minHeight: 40,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff"
  },
  switchButtonActive: {
    backgroundColor: "#0e7490",
    borderColor: "#0e7490"
  },
  switchText: {
    color: "#0f1f33",
    fontWeight: "600"
  },
  switchTextActive: {
    color: "#fff",
    fontWeight: "700"
  },
  input: {
    borderWidth: 1,
    borderColor: "#d8e1ee",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    backgroundColor: "#fff"
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
  error: {
    color: "#8e1b1b"
  },
  success: {
    color: "#0f5132"
  },
  muted: {
    color: "#5a6f8a",
    fontSize: 12
  }
});
