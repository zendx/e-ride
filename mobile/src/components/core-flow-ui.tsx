import React from "react";
import { GestureResponderEvent, StyleSheet, Text, TouchableOpacity, View, ViewProps } from "react-native";

export const flowColors = {
  page: "#f2f2f4",
  card: "#f3f3f6",
  ink: "#0a0f2f",
  muted: "#666a80",
  border: "#d9d9de",
  primary: "#8a00ff",
  primarySoft: "#f0ddff",
  darkAction: "#0b0b0f"
} as const;

export function FlowPage({ style, ...props }: ViewProps) {
  return <View style={[styles.page, style]} {...props} />;
}

export function FlowCard({ style, ...props }: ViewProps) {
  return <View style={[styles.card, style]} {...props} />;
}

export function FlowTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function FlowSubtitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.subtitle}>{children}</Text>;
}

export function FlowButton({
  label,
  onPress,
  variant = "primary",
  disabled
}: {
  label: string;
  onPress: (event: GestureResponderEvent) => void;
  variant?: "primary" | "secondary";
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        variant === "secondary" && styles.buttonSecondary,
        disabled && styles.buttonDisabled
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.buttonText, variant === "secondary" && styles.buttonTextSecondary]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: flowColors.page,
    padding: 16
  },
  card: {
    backgroundColor: flowColors.card,
    borderRadius: 24,
    padding: 16,
    gap: 10
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: flowColors.ink
  },
  subtitle: {
    fontSize: 14,
    color: flowColors.muted
  },
  button: {
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: flowColors.primary
  },
  buttonSecondary: {
    backgroundColor: flowColors.primarySoft,
    borderWidth: 1,
    borderColor: flowColors.primary
  },
  buttonDisabled: {
    opacity: 0.6
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700"
  },
  buttonTextSecondary: {
    color: flowColors.primary
  }
});
