import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import {
  Connection,
  createInvite,
  getConnectionsWithProfiles,
  getUserProfile,
  labelConnection,
  UserProfile,
} from "../lib/firestore";

const RELATIONSHIP_OPTIONS = [
  "Father", "Mother", "Son", "Daughter",
  "Brother", "Sister", "Grandfather", "Grandmother",
  "Grandchild", "Uncle", "Aunt", "Cousin", "Friend", "Partner",
];

function LabelPicker({
  connectionId,
  uid,
  name,
  onDone,
}: {
  connectionId: string;
  uid: string;
  name: string;
  onDone: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!selected) return;
    setSaving(true);
    try {
      await labelConnection(connectionId, uid, selected);
      onDone();
    } catch {
      Alert.alert("Error", "Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={lp.wrap}>
      <Text style={lp.prompt}>{name} is my…</Text>
      <View style={lp.grid}>
        {RELATIONSHIP_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[lp.chip, selected === opt && lp.chipActive]}
            onPress={() => setSelected(opt)}
          >
            <Text style={[lp.chipTxt, selected === opt && lp.chipTxtActive]}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity
        style={[lp.saveBtn, !selected && { opacity: 0.4 }]}
        onPress={save}
        disabled={!selected || saving}
      >
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={lp.saveTxt}>Save</Text>}
      </TouchableOpacity>
    </View>
  );
}

const lp = StyleSheet.create({
  wrap: {
    backgroundColor: "rgba(167,139,250,0.08)",
    borderRadius: 16, padding: 16, marginTop: 10,
    borderWidth: 1, borderColor: "rgba(167,139,250,0.2)",
  },
  prompt: { color: "#fff", fontSize: 14, fontWeight: "700", marginBottom: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
  },
  chipActive: { backgroundColor: "#a78bfa", borderColor: "#a78bfa" },
  chipTxt: { color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: "600" },
  chipTxtActive: { color: "#fff" },
  saveBtn: {
    backgroundColor: "#a78bfa", borderRadius: 12,
    paddingVertical: 12, alignItems: "center",
  },
  saveTxt: { color: "#fff", fontSize: 14, fontWeight: "700" },
});

type ConnWithProfile = { connection: Connection; profile: UserProfile };

export default function ConnectionsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [connections, setConnections] = useState<ConnWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [labelingId, setLabelingId] = useState<string | null>(null);

  async function load() {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getConnectionsWithProfiles(user.uid);
      setConnections(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [user?.uid]);

  async function handleInvite() {
    if (!user) return;
    setInviting(true);
    try {
      const profile = await getUserProfile(user.uid);
      const inviteId = await createInvite(
        user.uid,
        profile?.name || "Someone",
        profile?.photoUrl || null,
        profile?.city || "",
        profile?.country || ""
      );
      const url = Linking.createURL(`invite/${inviteId}`);
      await Share.share({
        message: `Join me on Ensemble! Tap this link to connect: ${url}`,
        url,
      });
    } catch (err: any) {
      if (err?.message !== "The user did not share") {
        Alert.alert("Error", String(err?.message ?? err));
      }
    } finally {
      setInviting(false);
    }
  }

  const needsLabel = connections.filter(
    ({ connection }) =>
      connection.status === "pending_label" && !connection.labels?.[user!.uid]
  );
  const accepted = connections.filter(
    ({ connection }) => connection.status === "accepted"
  );
  const pendingTheirLabel = connections.filter(
    ({ connection }) =>
      connection.status === "pending_label" && !!connection.labels?.[user!.uid]
  );

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={s.title}>Connections</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Invite button */}
        <TouchableOpacity style={s.inviteBtn} onPress={handleInvite} disabled={inviting} activeOpacity={0.8}>
          {inviting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <View style={s.inviteIcon}>
                <Ionicons name="person-add" size={20} color="#a78bfa" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.inviteTxt}>Invite someone</Text>
                <Text style={s.inviteSub}>Share a link to connect</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.3)" />
            </>
          )}
        </TouchableOpacity>

        {/* Needs your label */}
        {needsLabel.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>Label your new connections</Text>
            {needsLabel.map(({ connection, profile }) => (
              <View key={connection.id} style={s.card}>
                <View style={s.cardTop}>
                  {profile.photoUrl ? (
                    <Image source={{ uri: profile.photoUrl }} style={s.avatar} />
                  ) : (
                    <View style={[s.avatar, s.avatarFallback]}>
                      <Text style={s.avatarInitial}>{profile.name[0]?.toUpperCase()}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardName}>{profile.name}</Text>
                    <Text style={s.cardSub}>{profile.city}, {profile.country}</Text>
                  </View>
                  <View style={s.newBadge}><Text style={s.newBadgeTxt}>NEW</Text></View>
                </View>
                {labelingId === connection.id ? (
                  <LabelPicker
                    connectionId={connection.id}
                    uid={user!.uid}
                    name={profile.name.split(" ")[0]}
                    onDone={() => { setLabelingId(null); load(); }}
                  />
                ) : (
                  <TouchableOpacity
                    style={s.labelBtn}
                    onPress={() => setLabelingId(connection.id)}
                  >
                    <Text style={s.labelBtnTxt}>Who is this person to you?</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Waiting on their label */}
        {pendingTheirLabel.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>Waiting for them to label you</Text>
            {pendingTheirLabel.map(({ connection, profile }) => (
              <View key={connection.id} style={[s.card, { opacity: 0.7 }]}>
                <View style={s.cardTop}>
                  {profile.photoUrl ? (
                    <Image source={{ uri: profile.photoUrl }} style={s.avatar} />
                  ) : (
                    <View style={[s.avatar, s.avatarFallback]}>
                      <Text style={s.avatarInitial}>{profile.name[0]?.toUpperCase()}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardName}>{profile.name}</Text>
                    <Text style={s.cardSub}>You labeled them: {connection.labels?.[user!.uid]}</Text>
                  </View>
                  <ActivityIndicator color="#a78bfa" size="small" />
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Accepted connections */}
        {accepted.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>Your connections</Text>
            {accepted.map(({ connection, profile }) => {
              const myLabel = connection.labels?.[user!.uid] ?? "Connection";
              const theirLabel = connection.labels?.[profile.uid] ?? "";
              return (
                <View key={connection.id} style={s.card}>
                  <View style={s.cardTop}>
                    {profile.photoUrl ? (
                      <Image source={{ uri: profile.photoUrl }} style={s.avatar} />
                    ) : (
                      <View style={[s.avatar, s.avatarFallback]}>
                        <Text style={s.avatarInitial}>{profile.name[0]?.toUpperCase()}</Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={s.cardName}>{profile.name}</Text>
                      <Text style={s.cardSub}>
                        Your {myLabel} · {profile.city}
                      </Text>
                    </View>
                    <View style={s.connectedBadge}>
                      <Ionicons name="checkmark-circle" size={18} color="#34d399" />
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {!loading && connections.length === 0 && (
          <View style={s.empty}>
            <Ionicons name="people-outline" size={52} color="rgba(255,255,255,0.15)" />
            <Text style={s.emptyTxt}>No connections yet</Text>
            <Text style={s.emptySub}>Tap "Invite someone" to send your first invite link.</Text>
          </View>
        )}

        {loading && <ActivityIndicator color="#a78bfa" style={{ marginTop: 40 }} />}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#07080f" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)",
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.07)",
    alignItems: "center", justifyContent: "center",
  },
  title: { color: "#fff", fontSize: 17, fontWeight: "700" },
  content: { padding: 16, gap: 8, paddingBottom: 60 },
  inviteBtn: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: "rgba(167,139,250,0.08)",
    borderRadius: 18, padding: 18,
    borderWidth: 1, borderColor: "rgba(167,139,250,0.25)",
    marginBottom: 8,
  },
  inviteIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "rgba(167,139,250,0.12)",
    alignItems: "center", justifyContent: "center",
  },
  inviteTxt: { color: "#fff", fontSize: 15, fontWeight: "700" },
  inviteSub: { color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 2 },
  section: { gap: 10, marginTop: 8 },
  sectionLabel: {
    color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: "700",
    letterSpacing: 0.8, textTransform: "uppercase",
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.07)",
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: { width: 48, height: 48, borderRadius: 24, overflow: "hidden" },
  avatarFallback: { backgroundColor: "#2d3a5a", alignItems: "center", justifyContent: "center" },
  avatarInitial: { color: "#fff", fontSize: 20, fontWeight: "700" },
  cardName: { color: "#fff", fontSize: 15, fontWeight: "700" },
  cardSub: { color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 2 },
  newBadge: {
    backgroundColor: "rgba(167,139,250,0.15)", borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: "rgba(167,139,250,0.3)",
  },
  newBadgeTxt: { color: "#a78bfa", fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  connectedBadge: { padding: 4 },
  labelBtn: {
    marginTop: 12, paddingVertical: 12,
    backgroundColor: "rgba(167,139,250,0.1)",
    borderRadius: 12, alignItems: "center",
    borderWidth: 1, borderColor: "rgba(167,139,250,0.2)",
  },
  labelBtnTxt: { color: "#a78bfa", fontSize: 13, fontWeight: "600" },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyTxt: { color: "rgba(255,255,255,0.5)", fontSize: 17, fontWeight: "600" },
  emptySub: { color: "rgba(255,255,255,0.25)", fontSize: 13, textAlign: "center", lineHeight: 19 },
});
