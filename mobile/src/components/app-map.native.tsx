import React from "react";
import { StyleSheet } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { AppMapMarker, AppMapRegion } from "./app-map.types";

type AppMapProps = {
  region: AppMapRegion;
  height: number;
  markers: AppMapMarker[];
};

export function AppMap({ region, height, markers }: AppMapProps) {
  return (
    <MapView style={[styles.map, { height }]} initialRegion={region} region={region}>
      {markers.map((marker) => (
        <Marker
          key={marker.key}
          coordinate={marker.coordinate}
          title={marker.title}
          description={marker.description}
          pinColor={marker.pinColor}
        />
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    borderRadius: 12
  }
});
