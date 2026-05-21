import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

type UserProfile = {
  name: string;
  photoUri?: string;
  bio: string;
  city: string;
  birthday: string;
};

const STORAGE_KEY = "ensemble_user_profile";

export default function ProfileScreen() {
  const [name, setName] = useState("");
  const [photoUri, setPhotoUri] = useState<string | undefined>(undefined);
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [birthday, setBirthday] = useState("");
  const [showBirthdayPicker, setShowBirthdayPicker] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        const p: UserProfile = JSON.parse(raw);
        setName(p.name || "");
        setPhotoUri(p.photoUri);
        setBio(p.bio || "");
        setCity(p.city || "");
        setBirthday(p.birthday || "");
      }
    });
  }, []);

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets.length > 0) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  async function save() {
    if (!name.trim()) {
      Alert.alert("Please enter your name");
      return;
    }
    const profile: UserProfile = {
      name: name.trim(),
      photoUri,
      bio: bio.trim(),
      city: city.trim(),
      birthday,
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    Alert.alert("Profile saved");
  }

  const initials = name.trim() ? name.trim()[0].toUpperCase() : "?";

  return (
    <>
      <Stack.Screen
        options={{
          title: "My Profile",
          headerShown: true,
          headerStyle: { backgroundColor: "#07080f" },
          headerTintColor: "#f0f0f6",
        }}
      />
      <StatusBar barStyle="light-content" />
      <ScrollView
        style={s.root}
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar */}
        <TouchableOpacity style={s.avatarWrap} onPress={pickPhoto}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={s.avatar} />
          ) : (
            <View style={[s.avatar, s.avatarPlaceholder]}>
              <Text style={s.avatarInitial}>{initials}</Text>
            </View>
          )}
          <View style={s.cameraIcon}>
            <Ionicons name="camera" size={16} color="#f0f0f6" />
          </View>
        </TouchableOpacity>
        <Text style={s.avatarHint}>Tap to change photo</Text>

        {/* Form */}
        <View style={s.card}>
          <Text style={s.label}>DISPLAY NAME</Text>
          <TextInput
            style={s.input}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor="rgba(255,255,255,0.3)"
          />

          <Text style={s.label}>BIO / TAGLINE</Text>
          <TextInput
            style={s.input}
            value={bio}
            onChangeText={setBio}
            placeholder="A short bio or tagline"
            placeholderTextColor="rgba(255,255,255,0.3)"
          />

          <Text style={s.label}>CITY</Text>
          <TextInput
            style={s.input}
            value={city}
            onChangeText={setCity}
            placeholder="Where are you based?"
            placeholderTextColor="rgba(255,255,255,0.3)"
          />

          <Text style={s.label}>BIRTHDAY</Text>
          <TouchableOpacity
            style={s.dateBtn}
            onPress={() => setShowBirthdayPicker(true)}
          >
            <Text style={s.dateBtnText}>
              {birthday ? birthday : "Tap to set birthday"}
            </Text>
          </TouchableOpacity>
          {showBirthdayPicker && (
            <DateTimePicker
              value={birthday ? new Date(birthday) : new Date(1990, 0, 1)}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              maximumDate={new Date()}
              onChange={(_, d) => {
                setShowBirthdayPicker(false);
                if (d) setBirthday(d.toISOString().split("T")[0]);
              }}
            />
          )}
        </View>

        {/* Save */}
        <TouchableOpacity style={s.saveBtn} onPress={save}>
          <Text style={s.saveBtnText}>Save Profile</Text>
        </TouchableOpacity>

        <View style={{ height: 60 }} />
      </ScrollView>
    </>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#07080f" },
  scroll: { alignItems: "center", padding: 24 },

  avatarWrap: { position: "relative", marginBottom: 8 },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: "hidden",
  },
  avatarPlaceholder: {
    backgroundColor: "#2d3a5a",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: { color: "white", fontSize: 38, fontWeight: "800" },
  cameraIcon: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#7c6af7",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#07080f",
  },
  avatarHint: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 12,
    marginBottom: 24,
  },

  card: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginBottom: 20,
  },
  label: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#f0f0f6",
    fontSize: 15,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  dateBtn: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  dateBtnText: {
    color: "#f0f0f6",
    fontSize: 15,
  },

  saveBtn: {
    width: "100%",
    backgroundColor: "#7c6af7",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  saveBtnText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
});
