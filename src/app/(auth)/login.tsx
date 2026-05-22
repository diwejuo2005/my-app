import { Ionicons } from "@expo/vector-icons";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth } from "../../config/firebase";

export default function LoginScreen() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    const e = email.trim().toLowerCase();
    const p = password;
    if (!e || !p) {
      Alert.alert("Missing fields", "Enter your email and password.");
      return;
    }
    if (p.length < 6) {
      Alert.alert("Weak password", "Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        await createUserWithEmailAndPassword(auth, e, p);
      } else {
        await signInWithEmailAndPassword(auth, e, p);
      }
      // AuthContext picks up the new user → root layout redirects automatically
    } catch (err: any) {
      const msg =
        err.code === "auth/user-not-found" || err.code === "auth/wrong-password"
          ? "Incorrect email or password."
          : err.code === "auth/email-already-in-use"
            ? "An account with this email already exists."
            : err.code === "auth/invalid-email"
              ? "Enter a valid email address."
              : "Something went wrong: " + (err.code ?? err.message);
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar barStyle="light-content" />

      <View style={s.top}>
        <Text style={s.wordmark}>Ensemble</Text>
        <Text style={s.tagline}>Stay close, no matter the distance.</Text>
      </View>

      <View style={s.card}>
        <View style={s.toggle}>
          <TouchableOpacity
            style={[s.toggleBtn, mode === "signin" && s.toggleActive]}
            onPress={() => setMode("signin")}
          >
            <Text style={[s.toggleTxt, mode === "signin" && s.toggleTxtActive]}>
              Sign in
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.toggleBtn, mode === "signup" && s.toggleActive]}
            onPress={() => setMode("signup")}
          >
            <Text style={[s.toggleTxt, mode === "signup" && s.toggleTxtActive]}>
              Create account
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={s.label}>Email</Text>
        <TextInput
          style={s.input}
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor="rgba(255,255,255,0.25)"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
        />

        <Text style={s.label}>Password</Text>
        <View style={s.passwordRow}>
          <TextInput
            style={[s.input, { flex: 1, marginBottom: 0 }]}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor="rgba(255,255,255,0.25)"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />
          <Pressable style={s.eyeBtn} onPress={() => setShowPassword((v) => !v)}>
            <Ionicons
              name={showPassword ? "eye-off-outline" : "eye-outline"}
              size={20}
              color="rgba(255,255,255,0.4)"
            />
          </Pressable>
        </View>

        <TouchableOpacity
          style={[s.submitBtn, loading && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.submitTxt}>
              {mode === "signup" ? "Create account" : "Sign in"}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <Text style={s.footer}>
        By continuing you agree to Ensemble's Terms & Privacy Policy.
      </Text>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#07080f",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  top: { alignItems: "center", marginBottom: 40 },
  wordmark: {
    fontFamily: "serif",
    fontSize: 42,
    color: "#fff",
    fontWeight: "300",
    letterSpacing: 1,
    marginBottom: 8,
  },
  tagline: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 14,
    letterSpacing: 0.3,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  toggle: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    padding: 3,
    marginBottom: 24,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: "center",
  },
  toggleActive: { backgroundColor: "#a78bfa" },
  toggleTxt: { color: "rgba(255,255,255,0.45)", fontSize: 14, fontWeight: "600" },
  toggleTxtActive: { color: "#fff" },
  label: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 12,
    color: "#fff",
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  eyeBtn: { padding: 8 },
  submitBtn: {
    backgroundColor: "#a78bfa",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 24,
  },
  submitTxt: { color: "#fff", fontSize: 16, fontWeight: "700" },
  footer: {
    color: "rgba(255,255,255,0.2)",
    fontSize: 11,
    textAlign: "center",
    marginTop: 24,
    lineHeight: 16,
  },
});
