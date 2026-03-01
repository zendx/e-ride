import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { AppMapMarker, AppMapRegion } from "./app-map.types";

type AppMapProps = {
  region: AppMapRegion;
  height: number;
  markers: AppMapMarker[];
};

export function AppMap({ region, height, markers }: AppMapProps) {
  return (
    <View style={[styles.mapFallback, { height }]}>
      <Text style={styles.title}>Map preview</Text>
      <Text style={styles.meta}>
        Center: {region.latitude.toFixed(4)}, {region.longitude.toFixed(4)}
      </Text>
      <Text style={styles.meta}>Pins: {markers.length}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  mapFallback: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d8e1ee",
    backgroundColor: "#f8fbff",
    alignItems: "center",
    justifyContent: "center",
    gap: 4
  },
  title: {
    fontWeight: "700",
    color: "#0f1f33"
  },
  meta: {
    color: "#5a6f8a"
  }
});
