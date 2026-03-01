import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { registerPassenger, registerRider } from "../lib/api";
import { NoticeBanner } from "../components/notice-banner";
import { useAuth } from "../state/auth-context";
import { API_BASE_URL } from "../lib/config";
import { AppRole } from "../types/auth";
import { FlowButton, FlowCard, FlowPage, FlowSubtitle, FlowTitle, flowColors } from "../components/core-flow-ui";

export function LoginScreen({ initialRole = "passenger" }: { initialRole?: AppRole }) {
  const { login, loading } = useAuth();
  const selectedRole = initialRole;
  const roleLabel = selectedRole === "rider" ? "Driver" : "Rider";
  const configuredTenantSlug = (process.env.EXPO_PUBLIC_TENANT_SLUG ?? "").trim().toLowerCase();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [registrationSubmitted, setRegistrationSubmitted] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [address, setAddress] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [identificationType, setIdentificationType] = useState<"international_passport" | "nin" | "voters_card">("nin");
  const [identificationImageUrl, setIdentificationImageUrl] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [mothersMaidenName, setMothersMaidenName] = useState("");
  const [carName, setCarName] = useState("");
  const [carModel, setCarModel] = useState("");
  const [carYear, setCarYear] = useState("");
  const [carCondition, setCarCondition] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setMode("login");
    setRegistrationSubmitted(false);
  }, [selectedRole]);

  const passwordChecks = getPasswordChecks(password);
  const isStrongPassword = Object.values(passwordChecks).every(Boolean);

  async function onSubmit() {
    setError("");
    setMessage("");
    setSubmitting(true);
    try {
      if (mode === "login") {
        await login(email.trim(), password, selectedRole);
      } else {
        if (!isStrongPassword) {
          throw new Error("Password must be at least 8 characters, include one uppercase letter, and one symbol.");
        }
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match.");
        }
        const effectiveTenantSlug = configuredTenantSlug;
        if (!effectiveTenantSlug) {
          throw new Error("Tenant slug configuration is missing. Set EXPO_PUBLIC_TENANT_SLUG.");
        }

        if (selectedRole === "rider") {
          if (!identificationImageUrl.trim()) throw new Error("Capture or upload an identification image.");
          const year = Number(carYear);
          if (!Number.isFinite(year)) throw new Error("Car year must be a valid number.");
          await registerRider({
            tenantSlug: effectiveTenantSlug,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            middleName: middleName.trim() || undefined,
            email: email.trim(),
            password,
            address: address.trim(),
            phoneNumber: phoneNumber.trim(),
            whatsappNumber: whatsappNumber.trim(),
            identificationType,
            identificationImageUrl: identificationImageUrl.trim(),
            dateOfBirth: dateOfBirth.trim(),
            mothersMaidenName: mothersMaidenName.trim(),
            carName: carName.trim(),
            carModel: carModel.trim(),
            carYear: year,
            carCondition: carCondition.trim(),
            vehiclePlate: vehiclePlate.trim(),
            livenessConfirmed: true
          });
        } else {
          await registerPassenger({
            tenantSlug: effectiveTenantSlug,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            middleName: middleName.trim() || undefined,
            email: email.trim(),
            password,
            phoneNumber: phoneNumber.trim() || undefined
          });
        }
        setRegistrationSubmitted(true);
        setMessage("Enrollment submitted.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to continue.");
    } finally {
      setSubmitting(false);
    }
  }

  async function captureOrUploadId(source: "camera" | "upload") {
    try {
      if (source === "camera") {
        const camera = await ImagePicker.requestCameraPermissionsAsync();
        if (!camera.granted) {
          setError("Camera permission is required.");
          return;
        }
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          quality: 0.7
        });
        if (!result.canceled && result.assets[0]?.uri) {
          setIdentificationImageUrl(result.assets[0].uri);
          setError("");
        }
        return;
      }

      const media = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!media.granted) {
        setError("Media library permission is required.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.7
      });
      if (!result.canceled && result.assets[0]?.uri) {
        setIdentificationImageUrl(result.assets[0].uri);
        setError("");
      }
    } catch {
      setError("Unable to capture or upload identification image.");
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <FlowPage style={styles.page}>
      <View style={styles.orbOne} />
      <View style={styles.orbTwo} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.keyboard}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.brand}>CarryGo</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>{roleLabel}</Text>
            </View>
            <Text style={styles.headerTitle}>{mode === "login" ? "Welcome back" : "Create your account"}</Text>
            <Text style={styles.headerSubtitle}>
              {mode === "login" ? "Sign in to continue your trip flow" : `Complete your ${roleLabel.toLowerCase()} onboarding`}
            </Text>
          </View>

          <FlowCard style={styles.card}>
            {registrationSubmitted ? (
              <>
                <FlowTitle>Thank You for Enrollment</FlowTitle>
                <FlowSubtitle>
                  {selectedRole === "rider"
                    ? "Your driver details were submitted. The tenant will verify your profile and invite you for vehicle inspection via email or SMS."
                    : "Your rider account was created successfully. You can now log in."}
                </FlowSubtitle>
                <FlowButton
                  label="Back to Login"
                  onPress={() => {
                    setRegistrationSubmitted(false);
                    setMode("login");
                    setMessage("");
                  }}
                />
                <NoticeBanner tone="success" message={message} />
                <NoticeBanner tone="error" message={error} />
              </>
            ) : (
              <>
                <View style={styles.modeRail}>
                  <View style={styles.modeRow}>
                  <ModePill label="Login" active={mode === "login"} onPress={() => setMode("login")} />
                  <ModePill label="Register" active={mode === "register"} onPress={() => setMode("register")} />
                  </View>
                </View>

                {mode === "register" ? (
                  <>
                    <SectionCard
                      title={selectedRole === "rider" ? "1. User Details" : "User Details"}
                      subtitle={selectedRole === "rider" ? "Enter your personal profile exactly as it appears on official documents." : "Enter your basic rider profile details."}
                    >
                      <Field label="First Name" value={firstName} onChangeText={setFirstName} />
                      <Field label="Last Name" value={lastName} onChangeText={setLastName} />
                      <Field label="Middle Name (Optional)" value={middleName} onChangeText={setMiddleName} />
                      <Field label="Phone Number" value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" />
                      {selectedRole === "rider" ? (
                        <>
                          <Field label="Address" value={address} onChangeText={setAddress} />
                          <Field label="WhatsApp Number" value={whatsappNumber} onChangeText={setWhatsappNumber} keyboardType="phone-pad" />
                          <Field label="Date of Birth (YYYY-MM-DD)" value={dateOfBirth} onChangeText={setDateOfBirth} />
                          <Field label="Mother's Maiden Name" value={mothersMaidenName} onChangeText={setMothersMaidenName} />
                        </>
                      ) : null}
                    </SectionCard>

                    {selectedRole === "rider" ? (
                      <>
                        <SectionCard
                          title="2. Means of Identification"
                          subtitle="Select one ID type, then capture or upload a clear image."
                        >
                          <View style={styles.modeRow}>
                            <ModePill label="Passport" active={identificationType === "international_passport"} onPress={() => setIdentificationType("international_passport")} />
                          <ModePill label="NIN" active={identificationType === "nin"} onPress={() => setIdentificationType("nin")} />
                          <ModePill label="Voter's" active={identificationType === "voters_card"} onPress={() => setIdentificationType("voters_card")} />
                        </View>

                        <View style={styles.idActionRow}>
                          <TouchableOpacity style={styles.idActionButton} onPress={() => void captureOrUploadId("camera")}>
                            <Text style={styles.idActionTitle}>Take Photo</Text>
                            <Text style={styles.idActionMeta}>Use camera</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.idActionButton} onPress={() => void captureOrUploadId("upload")}>
                            <Text style={styles.idActionTitle}>Choose File</Text>
                            <Text style={styles.idActionMeta}>From gallery</Text>
                          </TouchableOpacity>
                          </View>

                          {identificationImageUrl ? <Text style={styles.successText}>ID image selected and ready for submission.</Text> : <Text style={styles.hintText}>No ID image selected yet.</Text>}
                        </SectionCard>

                        <SectionCard
                          title="3. Car Information"
                          subtitle="Provide current vehicle details for verification and inspection."
                        >
                          <Field label="Car Name" value={carName} onChangeText={setCarName} />
                          <Field label="Car Model" value={carModel} onChangeText={setCarModel} />
                          <Field label="Car Year" value={carYear} onChangeText={setCarYear} keyboardType="numeric" />
                          <Field label="Car Condition" value={carCondition} onChangeText={setCarCondition} />
                          <Field label="Vehicle Plate" value={vehiclePlate} onChangeText={setVehiclePlate} />
                        </SectionCard>

                      </>
                    ) : null}
                  </>
                ) : null}

                <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
                <PasswordField
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  onToggleVisibility={() => setShowPassword((current) => !current)}
                  visible={showPassword}
                />
                {mode === "register" ? (
                  <>
                    <PasswordField
                      label="Confirm Password"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showConfirmPassword}
                      onToggleVisibility={() => setShowConfirmPassword((current) => !current)}
                      visible={showConfirmPassword}
                    />
                    <View style={styles.ruleCard}>
                      <PasswordRuleItem ok={passwordChecks.minLength} text="At least 8 characters" />
                      <PasswordRuleItem ok={passwordChecks.uppercase} text="At least one uppercase letter" />
                      <PasswordRuleItem ok={passwordChecks.symbol} text="At least one symbol" />
                      <PasswordRuleItem ok={confirmPassword.length > 0 && confirmPassword === password} text="Passwords match" />
                    </View>
                  </>
                ) : null}

                <FlowButton
                  label={submitting ? (mode === "login" ? "Logging in..." : "Submitting...") : mode === "login" ? "Login" : "Submit Registration"}
                  onPress={onSubmit}
                  disabled={submitting}
                />

                <NoticeBanner tone="success" message={message} />
                <NoticeBanner tone="error" message={error} />

                {mode === "login" ? (
                  <View style={styles.socialRow}>
                    <TouchableOpacity style={styles.socialBtn} onPress={() => {}}>
                      <Text style={styles.socialText}>Login with Google</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.socialBtn, styles.socialBtnDark]} onPress={() => {}}>
                      <Text style={[styles.socialText, styles.socialTextDark]}>Login with Apple</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </>
            )}

            <Text style={styles.apiText}>API: {API_BASE_URL}</Text>
          </FlowCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </FlowPage>
  );
}

function Field({ label, ...props }: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput style={styles.input} placeholder={label} placeholderTextColor="#90a0b7" {...props} />
    </View>
  );
}

function PasswordField({
  label,
  onToggleVisibility,
  visible,
  ...props
}: {
  label: string;
  onToggleVisibility: () => void;
  visible: boolean;
} & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.passwordWrap}>
        <TextInput
          style={styles.passwordInput}
          placeholder={label}
          placeholderTextColor="#90a0b7"
          autoCapitalize="none"
          {...props}
        />
        <TouchableOpacity style={styles.eyeButton} onPress={onToggleVisibility}>
          <Ionicons name={visible ? "eye-off-outline" : "eye-outline"} size={20} color="#6b6182" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function PasswordRuleItem({ ok, text }: { ok: boolean; text: string }) {
  return (
    <View style={styles.ruleRow}>
      <Ionicons name={ok ? "checkmark-circle" : "ellipse-outline"} size={16} color={ok ? "#0f766e" : "#8e7fb6"} />
      <Text style={ok ? styles.ruleTextOk : styles.ruleText}>{text}</Text>
    </View>
  );
}

function ModePill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.modePill, active && styles.modePillActive]} onPress={onPress}>
      <Text style={active ? styles.modePillTextActive : styles.modePillText}>{label}</Text>
    </TouchableOpacity>
  );
}

function SectionCard({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 0,
    backgroundColor: flowColors.primary
  },
  orbOne: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(255,255,255,0.13)",
    top: -90,
    right: -60
  },
  orbTwo: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.10)",
    top: 120,
    left: -70
  },
  keyboard: {
    flex: 1
  },
  scroll: {
    paddingTop: 64,
    paddingBottom: 28,
    gap: 12
  },
  header: {
    gap: 6,
    paddingHorizontal: 10
  },
  brand: {
    fontSize: 44,
    fontWeight: "900",
    color: "#fff"
  },
  roleBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderColor: "rgba(255,255,255,0.45)",
    borderWidth: 1,
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 4
  },
  roleBadgeText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12
  },
  headerTitle: {
    color: "#fff",
    fontSize: 30,
    fontWeight: "700"
  },
  headerSubtitle: {
    color: "#f2dcff",
    fontSize: 14
  },
  card: {
    gap: 14,
    marginTop: 14,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#ece9f2",
    shadowColor: "#1d0f36",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: {
      width: 0,
      height: 10
    },
    elevation: 8
  },
  modeRail: {
    backgroundColor: "#f3effa",
    borderRadius: 24,
    padding: 5
  },
  modeRow: {
    flexDirection: "row",
    gap: 8
  },
  idActionRow: {
    flexDirection: "row",
    gap: 8
  },
  idActionButton: {
    flex: 1,
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ded3f7",
    backgroundColor: "#fdfbff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: "center"
  },
  idActionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#3f2d6b"
  },
  idActionMeta: {
    fontSize: 11,
    color: "#8270ac",
    marginTop: 2
  },
  modePill: {
    flex: 1,
    minHeight: 44,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    paddingHorizontal: 8
  },
  modePillActive: {
    backgroundColor: flowColors.primary
  },
  modePillText: {
    color: "#6b6182",
    fontWeight: "600",
    fontSize: 13
  },
  modePillTextActive: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13
  },
  groupLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: flowColors.muted
  },
  sectionCard: {
    backgroundColor: "#f8f5ff",
    borderWidth: 1,
    borderColor: "#e7dcfa",
    borderRadius: 18,
    padding: 12,
    gap: 8
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#35265b"
  },
  sectionSubtitle: {
    fontSize: 11,
    color: "#685a8f"
  },
  sectionBody: {
    gap: 8
  },
  fieldWrap: {
    gap: 5
  },
  fieldLabel: {
    fontSize: 12,
    color: "#3b3f55",
    fontWeight: "700"
  },
  input: {
    borderWidth: 1,
    borderColor: "#e4dfec",
    borderRadius: 24,
    paddingHorizontal: 14,
    height: 50,
    backgroundColor: "#fbfaff",
    color: flowColors.ink
  },
  passwordWrap: {
    borderWidth: 1,
    borderColor: "#e4dfec",
    borderRadius: 24,
    height: 50,
    backgroundColor: "#fbfaff",
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 14,
    paddingRight: 8
  },
  passwordInput: {
    flex: 1,
    color: flowColors.ink,
    height: "100%"
  },
  eyeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center"
  },
  ruleCard: {
    backgroundColor: "#f8f5ff",
    borderWidth: 1,
    borderColor: "#e7dcfa",
    borderRadius: 14,
    padding: 10,
    gap: 6
  },
  ruleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  ruleText: {
    fontSize: 12,
    color: "#6f6292"
  },
  ruleTextOk: {
    fontSize: 12,
    color: "#0f766e",
    fontWeight: "600"
  },
  socialRow: {
    flexDirection: "row",
    gap: 8
  },
  socialBtn: {
    flex: 1,
    height: 46,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: flowColors.border
  },
  socialBtnDark: {
    backgroundColor: flowColors.darkAction,
    borderColor: flowColors.darkAction
  },
  socialText: {
    color: "#11131d",
    fontSize: 13,
    fontWeight: "700"
  },
  socialTextDark: {
    color: "#fff"
  },
  successText: {
    color: "#0f766e",
    fontSize: 12,
    fontWeight: "600"
  },
  hintText: {
    color: "#7c6da6",
    fontSize: 12
  },
  apiText: {
    color: flowColors.muted,
    fontSize: 11,
    textAlign: "center"
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  }
});

function getPasswordChecks(value: string) {
  return {
    minLength: value.length >= 8,
    uppercase: /[A-Z]/.test(value),
    symbol: /[^A-Za-z0-9]/.test(value)
  };
}
