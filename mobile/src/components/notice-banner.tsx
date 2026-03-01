import React from "react";
import { useEffect, useState } from "react";
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type NoticeTone = "success" | "error" | "warning";

type NoticeBannerProps = {
  message?: string;
  tone: NoticeTone;
  autoDismissMs?: number;
};

export function NoticeBanner({ message, tone, autoDismissMs = 3200 }: NoticeBannerProps) {
  const [visibleMessage, setVisibleMessage] = useState(message ?? "");
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const opacity = useState(new Animated.Value(message ? 1 : 0))[0];
  const translateY = useState(new Animated.Value(message ? 0 : -6))[0];

  useEffect(() => {
    const next = message ?? "";
    setVisibleMessage(next);
    setIsAnimatingOut(false);
    if (next) {
      opacity.setValue(0);
      translateY.setValue(-6);
    }
  }, [message]);

  useEffect(() => {
    if (!visibleMessage || isAnimatingOut) return;
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      })
    ]).start();
  }, [isAnimatingOut, opacity, translateY, visibleMessage]);

  function dismissBanner() {
    if (!visibleMessage || isAnimatingOut) return;
    setIsAnimatingOut(true);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.timing(translateY, {
        toValue: -6,
        duration: 180,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true
      })
    ]).start(() => {
      setVisibleMessage("");
      setIsAnimatingOut(false);
    });
  }

  useEffect(() => {
    if (tone !== "success" || !visibleMessage) return;
    const timer = setTimeout(() => {
      dismissBanner();
    }, autoDismissMs);
    return () => clearTimeout(timer);
  }, [autoDismissMs, tone, visibleMessage]);

  if (!visibleMessage) return null;
  const isPersistent = tone === "error" || tone === "warning";
  return (
    <Animated.View
      style={[
        styles.base,
        tone === "success" && styles.success,
        tone === "error" && styles.error,
        tone === "warning" && styles.warning,
        { opacity, transform: [{ translateY }] }
      ]}
    >
      <View style={styles.row}>
        <Text style={[styles.text, tone === "success" && styles.successText, tone === "error" && styles.errorText, tone === "warning" && styles.warningText]}>
          {visibleMessage}
        </Text>
        {isPersistent ? (
          <TouchableOpacity style={styles.closeBtn} onPress={dismissBanner} accessibilityLabel="Dismiss notice">
            <Text style={[styles.closeText, tone === "error" && styles.errorText, tone === "warning" && styles.warningText]}>x</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  text: {
    flex: 1,
    fontWeight: "500"
  },
  closeBtn: {
    paddingHorizontal: 4,
    paddingVertical: 2
  },
  closeText: {
    fontWeight: "700",
    color: "#0f1f33"
  },
  success: {
    borderColor: "#bde5d0",
    backgroundColor: "#ebfff3"
  },
  successText: {
    color: "#0f5132"
  },
  error: {
    borderColor: "#f0c2c2",
    backgroundColor: "#fff1f1"
  },
  errorText: {
    color: "#8e1b1b"
  },
  warning: {
    borderColor: "#f3d4a7",
    backgroundColor: "#fff7e6"
  },
  warningText: {
    color: "#8a5a0f"
  }
});
