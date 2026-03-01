import React, { useMemo, useState } from "react";
import { SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { AuthProvider, useAuth } from "./src/state/auth-context";
import { LoginScreen } from "./src/screens/login-screen";
import { RiderHomeScreen } from "./src/screens/rider-home-screen";
import { PassengerHomeScreen } from "./src/screens/passenger-home-screen";
import { WelcomeScreen } from "./src/screens/welcome-screen";
import { HelpCenterScreen } from "./src/screens/help-center-screen";
import { ReceiptsScreen } from "./src/screens/receipts-screen";
import { ProfileSettingsScreen } from "./src/screens/profile-settings-screen";
import { AppRole } from "./src/types/auth";

type AppTab = "home" | "help" | "receipts" | "profile";

function AppContent() {
  const { session, logout } = useAuth();
  const [started, setStarted] = useState(false);
  const [selectedRole, setSelectedRole] = useState<AppRole>("passenger");
  const [activeTab, setActiveTab] = useState<AppTab>("home");
  const [profileNotice, setProfileNotice] = useState("");

  if (!session) {
    if (!started) {
      return (
        <WelcomeScreen
          onContinue={(role) => {
            setSelectedRole(role);
            setStarted(true);
          }}
        />
      );
    }

    return <LoginScreen initialRole={selectedRole} />;
  }

  const role = session.user.role;
  const tabContent = useMemo(() => {
    if (activeTab === "home") {
      if (role === "rider") {
        return (
          <RiderHomeScreen
            onRoleAuthError={() => {
              setProfileNotice("Your session cannot access this rider action. Switch role or log in again.");
              setActiveTab("profile");
            }}
          />
        );
      }
      if (role === "passenger") {
        return (
          <PassengerHomeScreen
            onRoleAuthError={() => {
              setProfileNotice("Your session cannot access this passenger action. Switch role or log in again.");
              setActiveTab("profile");
            }}
          />
        );
      }
      return <LoginScreen />;
    }
    if (activeTab === "help") {
      return (
        <HelpCenterScreen
          accessToken={session.accessToken}
          onBack={() => setActiveTab("home")}
          onAuthError={() => {
            setProfileNotice("Your session cannot access this support action. Switch role or log in again.");
            setActiveTab("profile");
          }}
        />
      );
    }
    if (activeTab === "receipts") {
      return <ReceiptsScreen accessToken={session.accessToken} role={role} />;
    }
    return (
      <ProfileSettingsScreen
        accessToken={session.accessToken}
        role={role}
        onLogout={logout}
        notice={profileNotice}
        onSwitchRole={async (nextRole) => {
          setSelectedRole(nextRole);
          setActiveTab("home");
          setStarted(true);
          setProfileNotice("");
          await logout();
        }}
      />
    );
  }, [activeTab, logout, profileNotice, role, session.accessToken]);

  return (
    <View style={styles.appContainer}>
      <View style={styles.content}>{tabContent}</View>
      <View style={styles.tabBar}>
        <TabButton label="Home" active={activeTab === "home"} onPress={() => setActiveTab("home")} />
        <TabButton label="Help" active={activeTab === "help"} onPress={() => setActiveTab("help")} />
        <TabButton label="Receipts" active={activeTab === "receipts"} onPress={() => setActiveTab("receipts")} />
        <TabButton label="Profile" active={activeTab === "profile"} onPress={() => setActiveTab("profile")} />
      </View>
    </View>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.tabButton, active && styles.tabButtonActive]} onPress={onPress}>
      <Text style={active ? styles.tabTextActive : styles.tabText}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />
        <AppContent />
      </SafeAreaView>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f4f7fb"
  },
  appContainer: {
    flex: 1
  },
  content: {
    flex: 1
  },
  tabBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#d8e1ee",
    backgroundColor: "#fff",
    paddingVertical: 10,
    paddingHorizontal: 8,
    gap: 8
  },
  tabButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#d8e1ee",
    paddingVertical: 10,
    alignItems: "center"
  },
  tabButtonActive: {
    backgroundColor: "#0e7490",
    borderColor: "#0e7490"
  },
  tabText: {
    color: "#0f1f33",
    fontWeight: "600"
  },
  tabTextActive: {
    color: "#fff",
    fontWeight: "700"
  }
});
