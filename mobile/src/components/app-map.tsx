import { Platform } from "react-native";
import { AppMap as NativeAppMap } from "./app-map.native";
import { AppMap as WebAppMap } from "./app-map.web";

export const AppMap = Platform.OS === "web" ? WebAppMap : NativeAppMap;
