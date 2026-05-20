import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function SettingsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: "Settings",
          headerStyle: { backgroundColor: "#07080f" },
          headerTintColor: "#f0f0f6",
          headerTitleStyle: { fontWeight: "700", fontSize: 18 },
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ marginLeft: 16 }}
            >
              <Ionicons name="chevron-back" size={24} color="#a78bfa" />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Preferences</Text>

        <View style={styles.card}>
          <Row icon="notifications-outline" label="Notifications" />
          <Row icon="moon-outline" label="Appearance" />
          <Row icon="time-outline" label="Quiet hours" />
        </View>

        <Text style={styles.sectionTitle}>Account</Text>

        <View style={styles.card}>
          <Row icon="person-outline" label="Profile" />
          <Row icon="lock-closed-outline" label="Privacy" />
          <Row icon="log-out-outline" label="Sign out" />
        </View>

        <Text style={styles.footer}>Ensemble · v0.1</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ icon, label }: { icon: any; label: string }) {
  return (
    <TouchableOpacity style={styles.row}>
      <Ionicons name={icon} size={20} color="#a78bfa" />
      <Text style={styles.rowLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.3)" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#07080f" },
  content: { padding: 20, paddingBottom: 100 },
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
  },
  rowLabel: {
    flex: 1,
    color: "#f0f0f6",
    fontSize: 15,
    fontWeight: "500",
    marginLeft: 12,
  },
  footer: {
    textAlign: "center",
    color: "rgba(255,255,255,0.25)",
    fontSize: 12,
    marginTop: 32,
  },
});
