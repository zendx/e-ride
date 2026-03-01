import React from "react";
import { StyleSheet, Text, View } from "react-native";

export function SplashScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.circle} />
      <Text style={styles.headline}>Find a best</Text>
      <Text style={styles.title}>Taxi ride</Text>
      <Text style={styles.subtitle}>Book and track your trip instantly</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 26,
    backgroundColor: "#8a00ff"
  },
  circle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#eae9ee",
    marginBottom: 34
  },
  headline: {
    fontSize: 46,
    fontWeight: "300",
    color: "#ffffff",
    lineHeight: 52
  },
  title: {
    fontSize: 52,
    fontWeight: "800",
    color: "#ffffff",
    lineHeight: 58
  },
  subtitle: {
    marginTop: 8,
    color: "#efe9ff",
    fontSize: 16
  }
});
