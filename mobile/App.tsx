import React, { useEffect, useMemo, useState } from "react";
import { SafeAreaView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useFonts } from "expo-font";
import { Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from "@expo-google-fonts/poppins";
import { Ionicons } from "@expo/vector-icons";
import { AuthProvider, useAuth } from "./src/state/auth-context";
import { LoginScreen } from "./src/screens/login-screen";
import { RiderHomeScreen } from "./src/screens/rider-home-screen";
import { PassengerHomeScreen } from "./src/screens/passenger-home-screen";
import { WelcomeScreen } from "./src/screens/welcome-screen";
import { SplashScreen } from "./src/screens/splash-screen";
import { HelpCenterScreen } from "./src/screens/help-center-screen";
import { ReceiptsScreen } from "./src/screens/receipts-screen";
import { ProfileSettingsScreen } from "./src/screens/profile-settings-screen";
import { AppRole } from "./src/types/auth";
import { flowColors } from "./src/components/core-flow-ui";

type AppTab = "home" | "help" | "receipts" | "profile";

function AppContent() {
  const { session, logout } = useAuth();
  const [started, setStarted] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [selectedRole, setSelectedRole] = useState<AppRole>("passenger");
  const [activeTab, setActiveTab] = useState<AppTab>("home");
  const [profileNotice, setProfileNotice] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  const role = session?.user.role;
  const tabContent = useMemo(() => {
    if (!session || !role) return null;
    if (activeTab === "home") {
      if (role === "rider") {
        return (
          <RiderHomeScreen
            onRoleAuthError={() => {
              setProfileNotice("Your session cannot access this driver action. Log in with a driver account.");
              setActiveTab("profile");
            }}
          />
        );
      }
      if (role === "passenger") {
        return (
          <PassengerHomeScreen
            onRoleAuthError={() => {
              setProfileNotice("Your session cannot access this rider action. Log in with a rider account.");
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
          role={role}
          onBack={() => setActiveTab("home")}
          onAuthError={() => {
            setProfileNotice("Your session cannot access this support action. Log in with the correct account.");
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
        userEmail={session.user.email}
        onLogout={logout}
        notice={profileNotice}
      />
    );
  }, [activeTab, logout, profileNotice, role, session]);

  if (!session) {
    if (showSplash) return <SplashScreen />;
    if (!started) {
      return (
        <WelcomeScreen
          onContinue={(nextRole) => {
            setSelectedRole(nextRole);
            setStarted(true);
          }}
        />
      );
    }

    return <LoginScreen initialRole={selectedRole} />;
  }

  return (
    <View style={styles.appContainer}>
      <View style={styles.content}>{tabContent}</View>
      <View style={styles.tabBar}>
        <TabButton icon="home" active={activeTab === "home"} onPress={() => setActiveTab("home")} />
        <TabButton icon="help-circle" active={activeTab === "help"} onPress={() => setActiveTab("help")} />
        <TabButton icon="receipt" active={activeTab === "receipts"} onPress={() => setActiveTab("receipts")} />
        <TabButton icon="person" active={activeTab === "profile"} onPress={() => setActiveTab("profile")} />
      </View>
    </View>
  );
}

function TabButton({
  icon,
  active,
  onPress
}: {
  icon: "home" | "help-circle" | "receipt" | "person";
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={[styles.tabButton, active && styles.tabButtonActive]} onPress={onPress}>
      <Ionicons name={active ? icon : `${icon}-outline`} size={22} color={active ? "#fff" : flowColors.ink} />
    </TouchableOpacity>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold
  });

  useEffect(() => {
    if (!fontsLoaded) return;
    Text.defaultProps = Text.defaultProps || {};
    Text.defaultProps.style = [{ fontFamily: "Poppins_400Regular" }, Text.defaultProps.style];
    TextInput.defaultProps = TextInput.defaultProps || {};
    TextInput.defaultProps.style = [{ fontFamily: "Poppins_400Regular" }, TextInput.defaultProps.style];
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingWrap} />
      </SafeAreaView>
    );
  }

  return (
    <AuthProvider>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar
          barStyle="dark-content"
          translucent={false}
          backgroundColor={flowColors.page}
        />
        <AppContent />
      </SafeAreaView>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: flowColors.page
  },
  appContainer: {
    flex: 1
  },
  content: {
    flex: 1
  },
  loadingWrap: {
    flex: 1
  },
  tabBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: flowColors.border,
    backgroundColor: "#fff",
    paddingVertical: 10,
    paddingHorizontal: 8,
    gap: 8
  },
  tabButton: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: flowColors.border,
    alignItems: "center"
    ,
    justifyContent: "center"
  },
  tabButtonActive: {
    backgroundColor: flowColors.primary,
    borderColor: flowColors.primary
  }
});
