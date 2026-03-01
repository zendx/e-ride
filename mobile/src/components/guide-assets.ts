import { ImageSourcePropType } from "react-native";

export const guideAssets = {
  splash: require("../../app-screen-guides/splash.png"),
  homeGuide: require("../../app-screen-guides/home.png"),
  riderIcon: require("../../app-screen-guides/components/Locations.png"),
  driverIcon: require("../../app-screen-guides/components/Driver.png"),
  welcomeText: require("../../app-screen-guides/components/Welcome Text.png"),
  signupBadge: require("../../app-screen-guides/components/Sign Up.png"),
  loginGoogle: require("../../app-screen-guides/components/Login Google.png"),
  loginApple: require("../../app-screen-guides/components/Login Apple.png"),
  whereGoing: require("../../app-screen-guides/components/Where are you going today.png"),
  pinIcon: require("../../app-screen-guides/components/ic_pin.png"),
  tripIcon: require("../../app-screen-guides/components/Trip Detail.png")
} as const satisfies Record<string, ImageSourcePropType>;

export type GuideAssetName = keyof typeof guideAssets;
