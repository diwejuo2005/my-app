import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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

export default function OnboardingProfile() {
  const { user } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function pickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow photo access to set a profile photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  }

  async function handleNext() {
    if (!name.trim()) {
      Alert.alert("Name required", "Enter your first name to continue.");
      return;
    }
    if (!user) return;
    setLoading(true);
    try {
      await updateUserProfile(user.uid, {
        name: name.trim(),
        photoUrl: photoUri,
      });
      router.push("/(onboarding)/location");
    } catch {
      Alert.alert("Error", "Could not save profile. Try again.");
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
        <View style={[s.dot, s.dotActive]} />
        <View style={s.dot} />
        <View style={s.dot} />
      </View>

      <Text style={s.heading}>What's your name?</Text>
      <Text style={s.sub}>This is how your connections will see you.</Text>

      <TouchableOpacity style={s.avatar} onPress={pickPhoto} activeOpacity={0.8}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={s.avatarImg} />
        ) : (
          <View style={s.avatarPlaceholder}>
            <Ionicons name="camera-outline" size={28} color="rgba(255,255,255,0.4)" />
            <Text style={s.avatarTxt}>Add photo</Text>
          </View>
        )}
      </TouchableOpacity>

      <TextInput
        style={s.input}
        value={name}
        onChangeText={setName}
        placeholder="Your name"
        placeholderTextColor="rgba(255,255,255,0.25)"
        autoCapitalize="words"
        autoFocus
        returnKeyType="done"
        onSubmitEditing={handleNext}
      />

      <TouchableOpacity
        style={[s.btn, loading && { opacity: 0.6 }]}
        onPress={handleNext}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={s.btnTxt}>Continue</Text>
        )}
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#07080f",
    paddingHorizontal: 28,
    paddingTop: 80,
  },
  progress: { flexDirection: "row", gap: 6, marginBottom: 48 },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  dotActive: { backgroundColor: "#a78bfa", width: 24 },
  heading: { color: "#fff", fontSize: 30, fontWeight: "800", marginBottom: 8 },
  sub: { color: "rgba(255,255,255,0.45)", fontSize: 15, marginBottom: 40, lineHeight: 22 },
  avatar: { alignSelf: "center", marginBottom: 32 },
  avatarImg: { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholder: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 2, borderColor: "rgba(255,255,255,0.1)",
    borderStyle: "dashed",
    alignItems: "center", justifyContent: "center", gap: 6,
  },
  avatarTxt: { color: "rgba(255,255,255,0.4)", fontSize: 11 },
  input: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 14,
    color: "#fff", fontSize: 18,
    paddingHorizontal: 18, paddingVertical: 16,
    marginBottom: 24,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  btn: {
    backgroundColor: "#a78bfa", borderRadius: 14,
    paddingVertical: 16, alignItems: "center",
  },
  btnTxt: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
