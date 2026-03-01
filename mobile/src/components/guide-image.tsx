import React from "react";
import { Image, ImageStyle, StyleProp } from "react-native";
import { guideAssets, GuideAssetName } from "./guide-assets";

type GuideImageProps = {
  asset: GuideAssetName;
  style?: StyleProp<ImageStyle>;
  resizeMode?: "cover" | "contain" | "stretch" | "repeat" | "center";
};

export function GuideImage({ asset, style, resizeMode = "contain" }: GuideImageProps) {
  return (
    <Image
      source={guideAssets[asset]}
      style={style}
      resizeMode={resizeMode}
      accessibilityLabel=""
      alt=""
    />
  );
}
