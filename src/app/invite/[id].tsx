import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { acceptInvite, getInvite, Invite } from "../../lib/firestore";

const PENDING_INVITE_KEY = "pendingInviteId";

const RELATIONSHIP_OPTIONS = [
  { label: "Father", icon: "👨" },
  { label: "Mother", icon: "👩" },
  { label: "Son", icon: "👦" },
  { label: "Daughter", icon: "👧" },
  { label: "Brother", icon: "👱‍♂️" },
  { label: "Sister", icon: "👱‍♀️" },
  { label: "Grandfather", icon: "👴" },
  { label: "Grandmother", icon: "👵" },
  { label: "Grandchild", icon: "🧒" },
  { label: "Uncle", icon: "👨‍🦱" },
  { label: "Aunt", icon: "👩‍🦱" },
  { label: "Cousin", icon: "🧑" },
  { label: "Friend", icon: "🤝" },
  { label: "Partner", icon: "💑" },
];

export default function InviteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [invite, setInvite] = useState<Invite | null>(null);
  const [inviteLoading, setInviteLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!id) { setError("Invalid invite link."); setInviteLoading(false); return; }
    getInvite(id).then((inv) => {
      if (!inv) { setError("This invite link is invalid or has expired."); }
      else if (inv.status === "used") { setError("This invite has already been used."); }
      else if (user && inv.creatorUid === user.uid) { setError("You can't connect with yourself!"); }
      else { setInvite(inv); }
      setInviteLoading(false);
    });
  }, [id, user?.uid]);

  async function handleAccept() {
    if (!selectedLabel) { Alert.alert("Select a relationship", "Choose how you know this person."); return; }
    if (!invite || !user) return;
    setAccepting(true);
    try {
      await acceptInvite(id as string, invite, user.uid, selectedLabel);
      router.replace("/tabs");
    } catch {
      Alert.alert("Error", "Could not accept the invite. Try again.");
    } finally {
      setAccepting(false);
    }
  }

  // Wait for auth to resolve before showing anything
  if (authLoading) {
    return <View style={s.center}><ActivityIndicator color="#a78bfa" size="large" /></View>;
  }

  // Not logged in — show sign-in prompt and save the invite ID
  if (!user) {
    return (
      <View style={s.center}>
        {inviteLoading ? (
          <ActivityIndicator color="#a78bfa" size="large" style={{ marginBottom: 24 }} />
        ) : invite ? (
          <>
            <View style={s.avatarWrap}>
              {invite.creatorPhotoUrl ? (
                <Image source={{ uri: invite.creatorPhotoUrl }} style={s.avatar} />
              ) : (
                <View style={s.avatarFallback}>
                  <Text style={s.avatarInitial}>{invite.creatorName?.[0]?.toUpperCase()}</Text>
                </View>
              )}
            </View>
            <Text style={s.title}>
              <Text style={s.name}>{invite.creatorName}</Text> wants to connect with you
            </Text>
            {(invite.creatorCity || invite.creatorCountry) && (
              <View style={s.locationRow}>
                <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.4)" />
                <Text style={s.locationTxt}>
                  {[invite.creatorCity, invite.creatorCountry].filter(Boolean).join(", ")}
                </Text>
              </View>
            )}
          </>
        ) : (
          <Ionicons name="people-outline" size={56} color="rgba(255,255,255,0.2)" />
        )}
        <Text style={s.signInPrompt}>Sign in to accept this invite</Text>
        <TouchableOpacity
          style={s.btn}
          onPress={async () => {
            if (id) await AsyncStorage.setItem(PENDING_INVITE_KEY, id as string);
            router.replace("/(auth)/login");
          }}
        >
          <Text style={s.btnTxt}>Sign In / Create Account</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (inviteLoading) {
    return <View style={s.center}><ActivityIndicator color="#a78bfa" size="large" /></View>;
  }

  if (error) {
    return (
      <View style={s.center}>
        <Ionicons name="warning-outline" size={48} color="rgba(255,255,255,0.3)" />
        <Text style={s.errorTxt}>{error}</Text>
        <TouchableOpacity style={s.btn} onPress={() => router.replace("/tabs")}>
          <Text style={s.btnTxt}>Go to app</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      <View style={s.header}>
        <View style={s.avatarWrap}>
          {invite?.creatorPhotoUrl ? (
            <Image source={{ uri: invite.creatorPhotoUrl }} style={s.avatar} />
          ) : (
            <View style={s.avatarFallback}>
              <Text style={s.avatarInitial}>{invite?.creatorName?.[0]?.toUpperCase()}</Text>
            </View>
          )}
          <View style={s.linkBadge}>
            <Ionicons name="link" size={14} color="#a78bfa" />
          </View>
        </View>
        <Text style={s.title}>
          <Text style={s.name}>{invite?.creatorName}</Text> wants to connect with you
        </Text>
        {(invite?.creatorCity || invite?.creatorCountry) && (
          <View style={s.locationRow}>
            <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.4)" />
            <Text style={s.locationTxt}>
              {[invite?.creatorCity, invite?.creatorCountry].filter(Boolean).join(", ")}
            </Text>
          </View>
        )}
        <Text style={s.sub}>
          Once you connect, you'll both see each other's local time, weather, news, and more.
        </Text>
      </View>

      <Text style={s.sectionLabel}>They are my…</Text>
      <View style={s.grid}>
        {RELATIONSHIP_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.label}
            style={[s.option, selectedLabel === opt.label && s.optionActive]}
            onPress={() => setSelectedLabel(opt.label)}
            activeOpacity={0.75}
          >
            <Text style={s.optionIcon}>{opt.icon}</Text>
            <Text style={[s.optionTxt, selectedLabel === opt.label && s.optionTxtActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[s.btn, !selectedLabel && { opacity: 0.45 }, accepting && { opacity: 0.6 }]}
        onPress={handleAccept}
        disabled={!selectedLabel || accepting}
        activeOpacity={0.8}
      >
        {accepting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="people" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={s.btnTxt}>Connect with {invite?.creatorName?.split(" ")[0]}</Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={s.declineBtn} onPress={() => router.replace("/tabs")}>
        <Text style={s.declineTxt}>Decline</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#07080f" },
  content: { padding: 24, paddingTop: 80, paddingBottom: 60 },
  center: { flex: 1, backgroundColor: "#07080f", alignItems: "center", justifyContent: "center", padding: 32, gap: 16 },
  header: { alignItems: "center", marginBottom: 36 },
  avatarWrap: { position: "relative", marginBottom: 20 },
  avatar: { width: 88, height: 88, borderRadius: 44 },
  avatarFallback: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: "#2d3a5a", alignItems: "center", justifyContent: "center",
  },
  avatarInitial: { color: "#fff", fontSize: 36, fontWeight: "700" },
  linkBadge: {
    position: "absolute", bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "rgba(167,139,250,0.2)",
    borderWidth: 2, borderColor: "#07080f",
    alignItems: "center", justifyContent: "center",
  },
  title: { color: "#fff", fontSize: 22, fontWeight: "700", textAlign: "center", marginBottom: 10, lineHeight: 30 },
  name: { color: "#a78bfa" },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 10 },
  locationTxt: { color: "rgba(255,255,255,0.45)", fontSize: 13 },
  sub: { color: "rgba(255,255,255,0.45)", fontSize: 14, textAlign: "center", lineHeight: 21 },
  sectionLabel: {
    color: "rgba(255,255,255,0.45)", fontSize: 11, fontWeight: "700",
    letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 14,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 32 },
  option: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  optionActive: { borderColor: "#a78bfa", backgroundColor: "rgba(167,139,250,0.12)" },
  optionIcon: { fontSize: 18 },
  optionTxt: { color: "rgba(255,255,255,0.7)", fontSize: 14, fontWeight: "600" },
  optionTxtActive: { color: "#fff" },
  btn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "#a78bfa", borderRadius: 14, paddingVertical: 16,
    marginBottom: 12, width: "100%",
  },
  btnTxt: { color: "#fff", fontSize: 16, fontWeight: "700" },
  errorTxt: { color: "rgba(255,255,255,0.5)", fontSize: 15, textAlign: "center", lineHeight: 22 },
  signInPrompt: { color: "rgba(255,255,255,0.6)", fontSize: 16, fontWeight: "600", textAlign: "center" },
  declineBtn: { alignItems: "center", paddingVertical: 12 },
  declineTxt: { color: "rgba(255,255,255,0.3)", fontSize: 14 },
});
