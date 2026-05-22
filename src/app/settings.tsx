import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type Settings = {
  notificationsEnabled: boolean;
  accentColor: string;
  quietStart: number;
  quietEnd: number;
  userName: string;
  analyticsEnabled: boolean;
};

const DEFAULT_SETTINGS: Settings = {
  notificationsEnabled: true,
  accentColor: "#7c6af7",
  quietStart: 22,
  quietEnd: 7,
  userName: "",
  analyticsEnabled: false,
};

function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem("ensemble_settings").then((raw: string | null) => {
      if (raw) {
        try {
          setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
        } catch {
          // ignore parse errors
        }
      }
      setLoaded(true);
    });
  }, []);

  const update = (patch: Partial<Settings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    AsyncStorage.setItem("ensemble_settings", JSON.stringify(next));
  };

  return { settings, update, loaded };
}

function formatHour(h: number) {
  if (h === 0) return "12am";
  if (h < 12) return `${h}am`;
  if (h === 12) return "12pm";
  return `${h - 12}pm`;
}

const ACCENT_COLORS = [
  { label: "Purple", value: "#7c6af7" },
  { label: "Blue", value: "#3b82f6" },
  { label: "Teal", value: "#14b8a6" },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { settings, update, loaded } = useSettings();

  const [notifModal, setNotifModal] = useState(false);
  const [appearModal, setAppearModal] = useState(false);
  const [quietModal, setQuietModal] = useState(false);
  const [privacyModal, setPrivacyModal] = useState(false);

  const [quietStartInput, setQuietStartInput] = useState(String(settings.quietStart));
  const [quietEndInput, setQuietEndInput] = useState(String(settings.quietEnd));

  useEffect(() => {
    if (loaded) {
      setQuietStartInput(String(settings.quietStart));
      setQuietEndInput(String(settings.quietEnd));
    }
  }, [loaded]);

  function handleSignOut() {
    Alert.alert(
      "Sign out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign out",
          style: "destructive",
          onPress: async () => {
            const { auth } = await import("../config/firebase");
            const { signOut } = await import("firebase/auth");
            await signOut(auth);
          },
        },
      ],
    );
  }

  const accent = settings.accentColor;

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Settings",
          headerStyle: { backgroundColor: "#07080f" },
          headerTintColor: "#f0f0f6",
          headerTitleStyle: { fontWeight: "700", fontSize: 18 },
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ marginLeft: 16 }}
            >
              <Ionicons name="chevron-back" size={24} color={accent} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backRow} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={16} color={accent} />
          <Text style={[styles.backText, { color: accent }]}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Preferences</Text>

        <View style={styles.card}>
          <TouchableOpacity style={styles.row} onPress={() => setNotifModal(true)}>
            <Ionicons name="notifications-outline" size={20} color={accent} />
            <Text style={styles.rowLabel}>Notifications</Text>
            <Text style={styles.rowSub}>
              {settings.notificationsEnabled ? "On" : "Off"}
            </Text>
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.3)" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.row} onPress={() => setAppearModal(true)}>
            <Ionicons name="moon-outline" size={20} color={accent} />
            <Text style={styles.rowLabel}>Appearance</Text>
            <View style={[styles.colorDot, { backgroundColor: settings.accentColor }]} />
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.3)" />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.row, styles.rowLast]} onPress={() => setQuietModal(true)}>
            <Ionicons name="time-outline" size={20} color={accent} />
            <Text style={styles.rowLabel}>Quiet hours</Text>
            <Text style={styles.rowSub}>
              {formatHour(settings.quietStart)} – {formatHour(settings.quietEnd)}
            </Text>
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.3)" />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Account</Text>

        <View style={styles.card}>
          <TouchableOpacity style={styles.row} onPress={() => router.push('/profile')}>
            <Ionicons name="person-outline" size={20} color={accent} />
            <Text style={styles.rowLabel}>Profile</Text>
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.3)" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.row} onPress={() => setPrivacyModal(true)}>
            <Ionicons name="lock-closed-outline" size={20} color={accent} />
            <Text style={styles.rowLabel}>Privacy</Text>
            <Text style={styles.rowSub}>
              {settings.analyticsEnabled ? "Sharing" : "Private"}
            </Text>
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.3)" />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.row, styles.rowLast]} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={20} color="#f87171" />
            <Text style={[styles.rowLabel, { color: "#f87171" }]}>Sign out</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>Ensemble · v0.1</Text>
      </ScrollView>

      {/* Notifications Modal */}
      <Modal visible={notifModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Notifications</Text>
            <TouchableOpacity onPress={() => setNotifModal(false)}>
              <Ionicons name="close" size={24} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>
          <View style={styles.modalRow}>
            <Text style={styles.modalRowLabel}>Enable notifications</Text>
            <Switch
              value={settings.notificationsEnabled}
              onValueChange={(v) => update({ notificationsEnabled: v })}
              trackColor={{ false: "rgba(255,255,255,0.15)", true: accent }}
              thumbColor="#ffffff"
            />
          </View>
          <Text style={styles.modalHint}>
            Receive alerts when a family member is in severe weather or a crisis event is detected.
          </Text>
          <TouchableOpacity
            style={[styles.modalDoneBtn, { backgroundColor: accent }]}
            onPress={() => setNotifModal(false)}
          >
            <Text style={styles.modalDoneText}>Done</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Appearance Modal */}
      <Modal visible={appearModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Appearance</Text>
            <TouchableOpacity onPress={() => setAppearModal(false)}>
              <Ionicons name="close" size={24} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>
          <Text style={styles.modalSectionLabel}>ACCENT COLOR</Text>
          {ACCENT_COLORS.map((c) => (
            <TouchableOpacity
              key={c.value}
              style={styles.colorRow}
              onPress={() => update({ accentColor: c.value })}
            >
              <View style={[styles.colorSwatch, { backgroundColor: c.value }]} />
              <Text style={styles.colorLabel}>{c.label}</Text>
              {settings.accentColor === c.value && (
                <Ionicons name="checkmark" size={20} color={c.value} />
              )}
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.modalDoneBtn, { backgroundColor: accent }]}
            onPress={() => setAppearModal(false)}
          >
            <Text style={styles.modalDoneText}>Done</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Quiet Hours Modal */}
      <Modal visible={quietModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Quiet Hours</Text>
            <TouchableOpacity onPress={() => setQuietModal(false)}>
              <Ionicons name="close" size={24} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>
          <Text style={styles.modalHint}>Enter hours in 24-hour format (0–23).</Text>
          <Text style={styles.modalSectionLabel}>START HOUR</Text>
          <TextInput
            style={styles.modalInput}
            value={quietStartInput}
            onChangeText={setQuietStartInput}
            keyboardType="number-pad"
            maxLength={2}
            placeholderTextColor="rgba(255,255,255,0.3)"
            placeholder="22"
          />
          <Text style={styles.modalSectionLabel}>END HOUR</Text>
          <TextInput
            style={styles.modalInput}
            value={quietEndInput}
            onChangeText={setQuietEndInput}
            keyboardType="number-pad"
            maxLength={2}
            placeholderTextColor="rgba(255,255,255,0.3)"
            placeholder="7"
          />
          <TouchableOpacity
            style={[styles.modalDoneBtn, { backgroundColor: accent }]}
            onPress={() => {
              const s = parseInt(quietStartInput, 10);
              const e = parseInt(quietEndInput, 10);
              if (!isNaN(s) && s >= 0 && s <= 23) update({ quietStart: s });
              if (!isNaN(e) && e >= 0 && e <= 23) update({ quietEnd: e });
              setQuietModal(false);
            }}
          >
            <Text style={styles.modalDoneText}>Save</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Privacy Modal */}
      <Modal visible={privacyModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Privacy</Text>
            <TouchableOpacity onPress={() => setPrivacyModal(false)}>
              <Ionicons name="close" size={24} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>
          <View style={styles.modalRow}>
            <Text style={styles.modalRowLabel}>Share anonymous usage data</Text>
            <Switch
              value={settings.analyticsEnabled}
              onValueChange={(v) => update({ analyticsEnabled: v })}
              trackColor={{ false: "rgba(255,255,255,0.15)", true: accent }}
              thumbColor="#ffffff"
            />
          </View>
          <Text style={styles.modalHint}>
            Helps us improve Ensemble. No personal data is ever shared.
          </Text>
          <TouchableOpacity
            style={[styles.modalDoneBtn, { backgroundColor: accent }]}
            onPress={() => setPrivacyModal(false)}
          >
            <Text style={styles.modalDoneText}>Done</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#07080f" },
  content: { padding: 20, paddingBottom: 100 },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
  },
  backText: {
    fontSize: 15,
    fontWeight: "600",
  },
  sectionTitle: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 16,
    marginBottom: 10,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 16,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
    gap: 12,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowLabel: {
    flex: 1,
    color: "#f0f0f6",
    fontSize: 15,
    fontWeight: "500",
  },
  rowSub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.4)",
    marginRight: 4,
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 4,
  },
  footer: {
    textAlign: "center",
    color: "rgba(255,255,255,0.25)",
    fontSize: 12,
    marginTop: 32,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: "#07080f",
    padding: 24,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 28,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#f0f0f6",
  },
  modalSectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255,255,255,0.4)",
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 4,
  },
  modalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  modalRowLabel: {
    fontSize: 15,
    color: "#f0f0f6",
    fontWeight: "500",
    flex: 1,
    marginRight: 12,
  },
  modalHint: {
    fontSize: 13,
    color: "rgba(255,255,255,0.4)",
    lineHeight: 19,
    marginBottom: 24,
  },
  modalInput: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    color: "#f0f0f6",
    fontSize: 15,
    padding: 13,
    marginBottom: 16,
  },
  modalDoneBtn: {
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  modalDoneText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
  },
  colorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    marginBottom: 8,
  },
  colorSwatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  colorLabel: {
    flex: 1,
    fontSize: 15,
    color: "#f0f0f6",
    fontWeight: "500",
  },
});
