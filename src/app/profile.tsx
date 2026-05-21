import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { Stack } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Member, useMembers } from "../context/MembersContext";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
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
  phone: string;
  email: string;
  hometown: string;
  pronouns: string;
  wakeHour: number;  // 0–23
  sleepHour: number; // 0–23
};

type UpcomingDate = { name: string; type: string; date: Date; daysAway: number };

function getUpcomingDates(members: Member[]): UpcomingDate[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const results: UpcomingDate[] = [];
  for (const m of members) {
    const fields: Array<[string | undefined, string]> = [
      [m.birthday, 'Birthday'],
      [m.anniversary, 'Anniversary'],
    ];
    for (const [raw, type] of fields) {
      if (!raw) continue;
      const parts = raw.split('-').map(Number);
      const occurrence = new Date(today.getFullYear(), parts[1] - 1, parts[2]);
      if (occurrence < today) occurrence.setFullYear(today.getFullYear() + 1);
      const daysAway = Math.round((occurrence.getTime() - today.getTime()) / 86400000);
      if (daysAway <= 60) results.push({ name: m.name, type, date: occurrence, daysAway });
    }
    if (m.importantDates) {
      for (const d of m.importantDates) {
        const parts = d.date.split('-').map(Number);
        const occurrence = new Date(today.getFullYear(), parts[1] - 1, parts[2]);
        if (occurrence < today) occurrence.setFullYear(today.getFullYear() + 1);
        const daysAway = Math.round((occurrence.getTime() - today.getTime()) / 86400000);
        if (daysAway <= 60) results.push({ name: m.name, type: d.label, date: occurrence, daysAway });
      }
    }
  }
  return results.sort((a, b) => a.daysAway - b.daysAway);
}

const STORAGE_KEY = "ensemble_user_profile";

function fmt12(h24: number): string {
  const isPM = h24 >= 12;
  const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
  return `${h12}:00 ${isPM ? "PM" : "AM"}`;
}

function HourPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (h: number) => void;
}) {
  const isPM = value >= 12;
  const h12 = value === 0 ? 12 : value > 12 ? value - 12 : value;

  function step(delta: number) {
    let next = value + delta;
    if (next < 0) next = 23;
    if (next > 23) next = 0;
    onChange(next);
  }

  function toggleAMPM() {
    if (isPM) onChange(value === 12 ? 0 : value - 12);
    else onChange(value === 0 ? 12 : value + 12 > 23 ? 23 : value + 12);
  }

  return (
    <View style={s.hourRow}>
      <Text style={s.hourLabel}>{label}</Text>
      <View style={s.hourControls}>
        <TouchableOpacity style={s.hourBtn} onPress={() => step(-1)}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
          <Ionicons name="remove" size={16} color="#fff" />
        </TouchableOpacity>
        <Text style={s.hourVal}>{String(h12).padStart(2, "0")}</Text>
        <Text style={s.hourColon}>:00</Text>
        <TouchableOpacity style={s.hourBtn} onPress={() => step(1)}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
          <Ionicons name="add" size={16} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={[s.ampmBtn, isPM && s.ampmBtnPM]} onPress={toggleAMPM}>
          <Text style={s.ampmTxt}>{isPM ? "PM" : "AM"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const { members } = useMembers();
  const [name, setName] = useState("");
  const [photoUri, setPhotoUri] = useState<string | undefined>(undefined);
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [birthday, setBirthday] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [hometown, setHometown] = useState("");
  const [pronouns, setPronouns] = useState("");
  const [wakeHour, setWakeHour] = useState(7);
  const [sleepHour, setSleepHour] = useState(23);
  const [showBirthdayPicker, setShowBirthdayPicker] = useState(false);

  const upcomingDates = useMemo(() => getUpcomingDates(members), [members]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        const p: UserProfile = JSON.parse(raw);
        setName(p.name || "");
        setPhotoUri(p.photoUri);
        setBio(p.bio || "");
        setCity(p.city || "");
        setBirthday(p.birthday || "");
        setPhone(p.phone || "");
        setEmail(p.email || "");
        setHometown(p.hometown || "");
        setPronouns(p.pronouns || "");
        setWakeHour(typeof p.wakeHour === "number" ? p.wakeHour : 7);
        setSleepHour(typeof p.sleepHour === "number" ? p.sleepHour : 23);
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
      phone: phone.trim(),
      email: email.trim(),
      hometown: hometown.trim(),
      pronouns: pronouns.trim(),
      wakeHour,
      sleepHour,
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
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
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

          {/* Basic info */}
          <View style={s.card}>
            <Text style={s.sectionTitle}>Basic Info</Text>

            <Text style={s.label}>DISPLAY NAME</Text>
            <TextInput
              style={s.input}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor="rgba(255,255,255,0.3)"
            />

            <Text style={s.label}>PRONOUNS</Text>
            <TextInput
              style={s.input}
              value={pronouns}
              onChangeText={setPronouns}
              placeholder="e.g. she/her, he/him, they/them"
              placeholderTextColor="rgba(255,255,255,0.3)"
            />

            <Text style={s.label}>DATE OF BIRTH</Text>
            <TouchableOpacity
              style={s.dateBtn}
              onPress={() => setShowBirthdayPicker(true)}
            >
              <Text style={birthday ? s.dateBtnText : s.dateBtnPlaceholder}>
                {birthday ? birthday : "Tap to set birthday"}
              </Text>
            </TouchableOpacity>
            {showBirthdayPicker && (
              <DateTimePicker
                value={birthday ? new Date(birthday) : new Date(1995, 0, 1)}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                maximumDate={new Date()}
                onChange={(_, d) => {
                  setShowBirthdayPicker(false);
                  if (d) setBirthday(d.toISOString().split("T")[0]);
                }}
              />
            )}

            <Text style={s.label}>BIO</Text>
            <TextInput
              style={[s.input, { minHeight: 72 }]}
              value={bio}
              onChangeText={setBio}
              placeholder="A short bio or tagline"
              placeholderTextColor="rgba(255,255,255,0.3)"
              multiline
            />
          </View>

          {/* Contact */}
          <View style={s.card}>
            <Text style={s.sectionTitle}>Contact</Text>

            <Text style={s.label}>PHONE</Text>
            <TextInput
              style={s.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="Your phone number"
              placeholderTextColor="rgba(255,255,255,0.3)"
              keyboardType="phone-pad"
            />

            <Text style={s.label}>EMAIL</Text>
            <TextInput
              style={s.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Your email address"
              placeholderTextColor="rgba(255,255,255,0.3)"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Location & work */}
          <View style={s.card}>
            <Text style={s.sectionTitle}>Location & Work</Text>

            <Text style={s.label}>CURRENT CITY</Text>
            <TextInput
              style={s.input}
              value={city}
              onChangeText={setCity}
              placeholder="Where are you based?"
              placeholderTextColor="rgba(255,255,255,0.3)"
            />

            <Text style={s.label}>HOMETOWN</Text>
            <TextInput
              style={s.input}
              value={hometown}
              onChangeText={setHometown}
              placeholder="Where you grew up"
              placeholderTextColor="rgba(255,255,255,0.3)"
            />

          </View>

          {/* Daily Routine */}
          <View style={s.card}>
            <Text style={s.sectionTitle}>Daily Routine</Text>
            <Text style={s.routineHint}>
              Let your family know when you're typically awake
            </Text>
            <View style={s.routineRow}>
              <Ionicons name="sunny-outline" size={18} color="#fbbf24" style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={s.label}>WAKE UP</Text>
                <HourPicker
                  label=""
                  value={wakeHour}
                  onChange={setWakeHour}
                />
              </View>
            </View>
            <View style={[s.routineRow, { marginTop: 4 }]}>
              <Ionicons name="moon-outline" size={18} color="#a78bfa" style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={s.label}>BEDTIME</Text>
                <HourPicker
                  label=""
                  value={sleepHour}
                  onChange={setSleepHour}
                />
              </View>
            </View>
          </View>

          {/* Coming Up */}
          {upcomingDates.length > 0 && (
            <View style={s.card}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <Ionicons name="calendar-outline" size={18} color="#a78bfa" />
                <Text style={s.sectionTitle}>Coming Up</Text>
              </View>
              {upcomingDates.map((item, i) => (
                <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: i < upcomingDates.length - 1 ? 1 : 0, borderBottomColor: "rgba(255,255,255,0.06)" }}>
                  <View style={{ width: 46, height: 46, borderRadius: 12, backgroundColor: "rgba(167,139,250,0.12)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(167,139,250,0.25)" }}>
                    <Text style={{ color: "#a78bfa", fontSize: 15, fontWeight: "800" }}>
                      {item.daysAway === 0 ? "🎉" : String(item.daysAway)}
                    </Text>
                    {item.daysAway > 0 && <Text style={{ color: "rgba(167,139,250,0.6)", fontSize: 9, fontWeight: "600" }}>days</Text>}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: "#f0f0f6", fontSize: 15, fontWeight: "700" }}>{item.name}'s {item.type}</Text>
                    <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 2 }}>
                      {item.date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Save */}
          <TouchableOpacity style={s.saveBtn} onPress={save}>
            <Text style={s.saveBtnText}>Save Profile</Text>
          </TouchableOpacity>

          <View style={{ height: 60 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#07080f" },
  scroll: { alignItems: "center", padding: 24 },

  avatarWrap: { position: "relative", marginBottom: 8 },
  avatar: { width: 100, height: 100, borderRadius: 50, overflow: "hidden" },
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
    marginBottom: 16,
  },
  sectionTitle: {
    color: "#f0f0f6",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
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
  dateBtnText: { color: "#f0f0f6", fontSize: 15 },
  dateBtnPlaceholder: { color: "rgba(255,255,255,0.3)", fontSize: 15 },

  routineHint: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 12,
    marginBottom: 4,
  },
  routineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  hourRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 2,
  },
  hourLabel: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 13,
    width: 0,
  },
  hourControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  hourBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  hourVal: {
    color: "#f0f0f6",
    fontSize: 22,
    fontWeight: "800",
    width: 28,
    textAlign: "center",
  },
  hourColon: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 16,
    fontWeight: "600",
  },
  ampmBtn: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  ampmBtnPM: {
    backgroundColor: "rgba(167,139,250,0.25)",
    borderColor: "rgba(167,139,250,0.5)",
  },
  ampmTxt: {
    color: "#f0f0f6",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  saveBtn: {
    width: "100%",
    backgroundColor: "#7c6af7",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  saveBtnText: { color: "white", fontSize: 16, fontWeight: "700" },
});
