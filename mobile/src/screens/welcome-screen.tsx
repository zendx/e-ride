import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { AppRole } from "../types/auth";
import { FlowButton, FlowSubtitle, FlowTitle, flowColors } from "../components/core-flow-ui";

type WelcomeScreenProps = {
  onContinue: (role: AppRole) => void;
};

export function WelcomeScreen({ onContinue }: WelcomeScreenProps) {
  const [selectedRole, setSelectedRole] = useState<AppRole>("passenger");

  return (
    <View style={styles.container}>
      <View style={styles.mapTint} />
      <View style={styles.topBar}>
        <Text style={styles.logo}>CarryGo</Text>
        <View style={styles.avatarDot} />
      </View>
      <View style={styles.sheet}>
        <FlowTitle>Choose User Type</FlowTitle>
        <FlowSubtitle>Rider is passenger. Driver accepts rides.</FlowSubtitle>
        <View style={styles.roleRow}>
          <RoleOption
            label="Rider"
            hint="Book trips quickly"
            iconLabel="R"
            active={selectedRole === "passenger"}
            onPress={() => setSelectedRole("passenger")}
          />
          <RoleOption
            label="Driver"
            hint="Accept and complete rides"
            iconLabel="D"
            active={selectedRole === "rider"}
            onPress={() => setSelectedRole("rider")}
          />
        </View>
        <FlowButton label="Get Started" onPress={() => onContinue(selectedRole)} />
      </View>
    </View>
  );
}

function RoleOption({
  label,
  hint,
  iconLabel,
  active,
  onPress
}: {
  label: string;
  hint: string;
  iconLabel: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={[styles.roleButton, active && styles.roleButtonActive]} onPress={onPress}>
      <View style={[styles.roleIcon, active && styles.roleIconActive]}>
        <Text style={active ? styles.roleIconTextActive : styles.roleIconText}>{iconLabel}</Text>
      </View>
      <Text style={active ? styles.roleTextActive : styles.roleText}>{label}</Text>
      <Text style={styles.roleHint}>{hint}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ebeaf2"
  },
  mapTint: {
    position: "absolute",
    inset: 0,
    backgroundColor: "rgba(138,0,255,0.06)"
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 54,
    marginHorizontal: 20
  },
  sheet: {
    marginTop: "auto",
    backgroundColor: "#f3f3f6",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 18,
    gap: 14,
    borderTopWidth: 1,
    borderColor: "#d6d6dc"
  },
  logo: {
    fontSize: 44,
    fontWeight: "800",
    color: flowColors.ink
  },
  avatarDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#e0e0e5",
    borderWidth: 2,
    borderColor: "#fff"
  },
  roleRow: {
    flexDirection: "row",
    gap: 10
  },
  roleButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: flowColors.border,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 10,
    gap: 4,
    backgroundColor: "#fff",
    alignItems: "center"
  },
  roleButtonActive: {
    borderColor: flowColors.primary,
    backgroundColor: "#efe1ff"
  },
  roleIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ececf2",
    alignItems: "center",
    justifyContent: "center"
  },
  roleIconActive: {
    backgroundColor: flowColors.primary
  },
  roleIconText: {
    color: flowColors.ink,
    fontWeight: "800"
  },
  roleIconTextActive: {
    color: "#fff",
    fontWeight: "800"
  },
  roleText: {
    fontWeight: "700",
    color: flowColors.ink
  },
  roleTextActive: {
    fontWeight: "700",
    color: flowColors.primary
  },
  roleHint: {
    color: flowColors.muted,
    fontSize: 11,
    textAlign: "center"
  }
});
