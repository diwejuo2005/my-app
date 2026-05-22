import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { updateUserProfile } from "../../lib/firestore";

const COUNTRIES = [
  { code: "US", name: "United States" }, { code: "GB", name: "United Kingdom" },
  { code: "NG", name: "Nigeria" }, { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" }, { code: "IN", name: "India" },
  { code: "GH", name: "Ghana" }, { code: "KE", name: "Kenya" },
  { code: "ZA", name: "South Africa" }, { code: "FR", name: "France" },
  { code: "DE", name: "Germany" }, { code: "JP", name: "Japan" },
  { code: "CN", name: "China" }, { code: "BR", name: "Brazil" },
  { code: "MX", name: "Mexico" }, { code: "IT", name: "Italy" },
  { code: "ES", name: "Spain" }, { code: "PK", name: "Pakistan" },
  { code: "ET", name: "Ethiopia" }, { code: "EG", name: "Egypt" },
  { code: "TR", name: "Turkey" }, { code: "SA", name: "Saudi Arabia" },
  { code: "AE", name: "United Arab Emirates" }, { code: "PH", name: "Philippines" },
  { code: "ID", name: "Indonesia" }, { code: "SG", name: "Singapore" },
  { code: "MY", name: "Malaysia" }, { code: "KR", name: "South Korea" },
  { code: "NZ", name: "New Zealand" }, { code: "IE", name: "Ireland" },
  { code: "SE", name: "Sweden" }, { code: "NL", name: "Netherlands" },
  { code: "NE", name: "Niger" }, { code: "CM", name: "Cameroon" },
  { code: "TZ", name: "Tanzania" }, { code: "UG", name: "Uganda" },
  { code: "RW", name: "Rwanda" }, { code: "CI", name: "Ivory Coast" },
  { code: "SN", name: "Senegal" }, { code: "CD", name: "DR Congo" },
];

export default function OnboardingLocation() {
  const { user } = useAuth();
  const router = useRouter();
  const [city, setCity] = useState("");
  const [countrySearch, setCountrySearch] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<{ code: string; name: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const filtered = COUNTRIES.filter((c) =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase())
  ).slice(0, 6);

  async function handleNext() {
    if (!city.trim()) { Alert.alert("City required", "Enter your city."); return; }
    if (!selectedCountry) { Alert.alert("Country required", "Select your country."); return; }
    if (!user) return;
    setLoading(true);
    try {
      await updateUserProfile(user.uid, {
        city: city.trim(),
        country: selectedCountry.name,
        countryCode: selectedCountry.code,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        onboardingComplete: true,
      });
      router.replace("/tabs");
    } catch {
      Alert.alert("Error", "Could not save location. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={s.progress}>
        <View style={[s.dot, s.dotDone]} />
        <View style={[s.dot, s.dotActive]} />
        <View style={s.dot} />
      </View>

      <Text style={s.heading}>Where are you?</Text>
      <Text style={s.sub}>Your location sets the local time and news your connections see for you.</Text>

      <Text style={s.label}>City</Text>
      <TextInput
        style={s.input}
        value={city}
        onChangeText={setCity}
        placeholder="e.g. Durham"
        placeholderTextColor="rgba(255,255,255,0.25)"
        autoCapitalize="words"
        returnKeyType="next"
      />

      <Text style={s.label}>Country</Text>
      {selectedCountry ? (
        <TouchableOpacity
          style={s.selectedCountry}
          onPress={() => { setSelectedCountry(null); setCountrySearch(""); }}
        >
          <Text style={s.selectedCountryTxt}>{selectedCountry.name}</Text>
          <Text style={s.changeTxt}>Change</Text>
        </TouchableOpacity>
      ) : (
        <>
          <TextInput
            style={s.input}
            value={countrySearch}
            onChangeText={setCountrySearch}
            placeholder="Search country…"
            placeholderTextColor="rgba(255,255,255,0.25)"
            autoCapitalize="words"
          />
          {countrySearch.length > 0 && (
            <View style={s.dropdown}>
              {filtered.map((c) => (
                <TouchableOpacity
                  key={c.code}
                  style={s.dropdownItem}
                  onPress={() => { setSelectedCountry(c); setCountrySearch(""); }}
                >
                  <Text style={s.dropdownTxt}>{c.name}</Text>
                </TouchableOpacity>
              ))}
              {filtered.length === 0 && (
                <Text style={s.dropdownEmpty}>No results</Text>
              )}
            </View>
          )}
        </>
      )}

      <TouchableOpacity
        style={[s.btn, loading && { opacity: 0.6 }, { marginTop: 32 }]}
        onPress={handleNext}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={s.btnTxt}>Finish setup</Text>
        )}
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#07080f", paddingHorizontal: 28, paddingTop: 80 },
  progress: { flexDirection: "row", gap: 6, marginBottom: 48 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.15)" },
  dotActive: { backgroundColor: "#a78bfa", width: 24 },
  dotDone: { backgroundColor: "rgba(167,139,250,0.5)" },
  heading: { color: "#fff", fontSize: 30, fontWeight: "800", marginBottom: 8 },
  sub: { color: "rgba(255,255,255,0.45)", fontSize: 15, marginBottom: 36, lineHeight: 22 },
  label: {
    color: "rgba(255,255,255,0.45)", fontSize: 11, fontWeight: "600",
    letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8, marginTop: 4,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 14,
    color: "#fff", fontSize: 16,
    paddingHorizontal: 18, paddingVertical: 14, marginBottom: 4,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  dropdown: {
    backgroundColor: "#0e0f1e", borderRadius: 12,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    marginBottom: 4, overflow: "hidden",
  },
  dropdownItem: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)" },
  dropdownTxt: { color: "#fff", fontSize: 15 },
  dropdownEmpty: { color: "rgba(255,255,255,0.3)", padding: 16, textAlign: "center" },
  selectedCountry: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "rgba(167,139,250,0.1)", borderRadius: 14,
    paddingHorizontal: 18, paddingVertical: 14, marginBottom: 4,
    borderWidth: 1, borderColor: "rgba(167,139,250,0.3)",
  },
  selectedCountryTxt: { color: "#fff", fontSize: 16, fontWeight: "600" },
  changeTxt: { color: "#a78bfa", fontSize: 13 },
  btn: { backgroundColor: "#a78bfa", borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  btnTxt: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
