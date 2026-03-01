import React from "react";
import { SafeAreaView, StatusBar, StyleSheet } from "react-native";
import { AuthProvider, useAuth } from "./src/state/auth-context";
import { LoginScreen } from "./src/screens/login-screen";
import { RiderHomeScreen } from "./src/screens/rider-home-screen";

function AppContent() {
  const { session } = useAuth();

  if (!session) return <LoginScreen />;
  return <RiderHomeScreen />;
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
  }
});
