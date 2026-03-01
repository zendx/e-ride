import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { getMobilePreferences, saveMobilePreferences } from "../lib/api";
import { isAuthOrRoleError, toApiErrorMessage } from "../lib/api-errors";
import { NoticeBanner } from "../components/notice-banner";
import { loadMobileSettings, saveMobileSettings } from "../lib/storage";
import { AppRole } from "../types/auth";

type ProfileSettingsScreenProps = {
  accessToken: string;
  role: AppRole;
  userEmail: string;
  onLogout: () => Promise<void>;
  notice?: string;
};

export function ProfileSettingsScreen({ accessToken, role, userEmail, onLogout, notice }: ProfileSettingsScreenProps) {
  const [activePanel, setActivePanel] = useState<"profile" | "settings">("profile");
  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "wallet" | "cash">("card");
  const [rideRequests, setRideRequests] = useState(true);
  const [rideUpdates, setRideUpdates] = useState(true);
  const [promotions, setPromotions] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  function handleApiError(err: unknown, fallback: string) {
    if (isAuthOrRoleError(err)) {
      return "Session access issue detected. Switch role or log in again.";
    }
    return toApiErrorMessage(err, fallback);
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const local = await loadMobileSettings();
        if (mounted && local) {
          setProfileName(local.profileName ?? "");
          setProfilePhone(local.profilePhone ?? "");
          setPaymentMethod(local.preferredPaymentMethod ?? "card");
          setRideRequests(local.notifications?.rideRequests ?? true);
          setRideUpdates(local.notifications?.rideUpdates ?? true);
          setPromotions(local.notifications?.promotions ?? false);
        }

        const remote = await getMobilePreferences(accessToken);
        const pref = (remote?.data?.preferences ?? {}) as {
          profileName?: string;
          profilePhone?: string;
          preferredPaymentMethod?: "card" | "wallet" | "cash";
          notifications?: { rideRequests?: boolean; rideUpdates?: boolean; promotions?: boolean };
        };
        if (!mounted) return;
        if (pref.profileName) setProfileName(pref.profileName);
        if (pref.profilePhone) setProfilePhone(pref.profilePhone);
        if (pref.preferredPaymentMethod) setPaymentMethod(pref.preferredPaymentMethod);
        if (pref.notifications) {
          setRideRequests(pref.notifications.rideRequests ?? true);
          setRideUpdates(pref.notifications.rideUpdates ?? true);
          setPromotions(pref.notifications.promotions ?? false);
        }
      } catch (err) {
        if (mounted) {
          setError(handleApiError(err, "Failed to load saved profile settings."));
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [accessToken]);

  async function saveSettings() {
    setError("");
    setResult("");
    const payload = {
      profileName: profileName.trim() || undefined,
      profilePhone: profilePhone.trim() || undefined,
      preferredPaymentMethod: paymentMethod,
      notifications: {
        rideRequests,
        rideUpdates,
        promotions
      }
    };
    try {
      await saveMobileSettings(payload);
      await saveMobilePreferences(accessToken, payload);
      setResult("Settings saved.");
    } catch (err) {
      setError(handleApiError(err, "Failed to save settings."));
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Account</Text>
      <Text style={styles.subtitle}>Role: {role === "rider" ? "Driver" : "Rider"}</Text>
      <NoticeBanner tone="warning" message={notice} />
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.button, activePanel === "profile" ? styles.button : styles.ghostButton]}
          onPress={() => setActivePanel("profile")}
        >
          <Text style={activePanel === "profile" ? styles.buttonText : styles.ghostButtonText}>Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, activePanel === "settings" ? styles.button : styles.ghostButton]}
          onPress={() => setActivePanel("settings")}
        >
          <Text style={activePanel === "settings" ? styles.buttonText : styles.ghostButtonText}>Settings</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.card}>
        {activePanel === "profile" ? (
          <>
            <TextInput style={styles.input} value={profileName} onChangeText={setProfileName} placeholder="Full name" />
            <TextInput style={styles.input} value={profilePhone} onChangeText={setProfilePhone} placeholder="Phone number" />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{userEmail}</Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.row}>
              {(["card", "wallet", "cash"] as const).map((method) => (
                <TouchableOpacity key={method} style={[styles.pill, paymentMethod === method && styles.pillActive]} onPress={() => setPaymentMethod(method)}>
                  <Text style={paymentMethod === method ? styles.pillTextActive : styles.pillText}>{method}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.row}>
              <TouchableOpacity style={[styles.pill, rideRequests && styles.pillActive]} onPress={() => setRideRequests((current) => !current)}>
                <Text style={rideRequests ? styles.pillTextActive : styles.pillText}>Ride Requests</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.pill, rideUpdates && styles.pillActive]} onPress={() => setRideUpdates((current) => !current)}>
                <Text style={rideUpdates ? styles.pillTextActive : styles.pillText}>Ride Updates</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.pill, promotions && styles.pillActive]} onPress={() => setPromotions((current) => !current)}>
                <Text style={promotions ? styles.pillTextActive : styles.pillText}>Promotions</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
        <TouchableOpacity style={styles.button} onPress={() => void saveSettings()}>
          <Text style={styles.buttonText}>{activePanel === "profile" ? "Save Profile" : "Save Settings"}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.ghostButton} onPress={() => void onLogout()}>
          <Text style={styles.ghostButtonText}>Logout</Text>
        </TouchableOpacity>
        <NoticeBanner tone="success" message={result} />
        <NoticeBanner tone="error" message={error} />
      </View>
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
  subtitle: {
    color: "#5a6f8a"
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    gap: 10
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
    flexWrap: "wrap",
    gap: 8
  },
  sectionLabel: {
    fontWeight: "700",
    color: "#0f1f33"
  },
  infoRow: {
    borderWidth: 1,
    borderColor: "#d8e1ee",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4
  },
  infoLabel: {
    color: "#5a6f8a",
    fontSize: 12
  },
  infoValue: {
    color: "#0f1f33",
    fontWeight: "600"
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
});
