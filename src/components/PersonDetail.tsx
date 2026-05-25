import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import {
  ChatMessage,
  PulseEntry,
  ScheduleEvent,
  deleteChatMessage,
  editChatMessage,
  sendChatMessage,
  uploadChatMedia,
  watchChatMessages,
  watchPulseWeek,
  watchSchedule,
} from "../lib/firestore";

export type Member = {
  id: number;
  uid: string;
  name: string;
  relationship: string;
  photoUri?: string;
  city: string;
  country: string;
  timezone: string;
  lat: number;
  lon: number;
  wakeHour: number;
  sleepHour: number;
  birthday?: string;
  anniversary?: string;
  hometown?: string;
  occupation?: string;
  importantDates?: Array<{ label: string; date: string }>;
};

type Props = {
  member: Member;
  visible: boolean;
  onClose: () => void;
  onUpdate: (m: Member) => void;
  onDelete: (id: number) => void;
};

type Tab = "overview" | "chat" | "news" | "pulse" | "schedule";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeTimezone(tz: string | undefined): string {
  if (!tz) return "UTC";
  try { Intl.DateTimeFormat(undefined, { timeZone: tz }); return tz; } catch { return "UTC"; }
}

function localTime(timezone: string) {
  const tz = safeTimezone(timezone);
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true }).format(new Date());
}

function getCallStatus(timezone: string, wakeHour: number, sleepHour: number) {
  const tz = safeTimezone(timezone);
  const h = parseInt(new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "2-digit", hour12: false }).format(new Date())) % 24;
  const m = parseInt(new Intl.DateTimeFormat("en-US", { timeZone: tz, minute: "2-digit" }).format(new Date()));
  const t = h + m / 60;
  if (t >= wakeHour + 1 && t < sleepHour - 1) return { label: "Good time to call", color: "#22c55e" };
  if ((t >= wakeHour && t < wakeHour + 1) || (t >= sleepHour - 1 && t < sleepHour))
    return { label: "Waking / winding down", color: "#f59e0b" };
  return { label: "Probably sleeping", color: "#6b7280" };
}

function pulseEmoji(score: number) {
  if (score >= 9) return "🤩";
  if (score >= 7) return "😊";
  if (score >= 5) return "🙂";
  if (score >= 3) return "😐";
  return "😔";
}

function pulseColor(score: number) {
  if (score >= 8) return "#22c55e";
  if (score >= 6) return "#84cc16";
  if (score >= 4) return "#f59e0b";
  return "#ef4444";
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function shortDay(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ member }: { member: Member }) {
  const call = getCallStatus(member.timezone, member.wakeHour, member.sleepHour);
  const [time, setTime] = useState(localTime(member.timezone));

  useEffect(() => {
    const id = setInterval(() => setTime(localTime(member.timezone)), 1000);
    return () => clearInterval(id);
  }, [member.timezone]);

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 40 }}>
      <View style={ov.card}>
        <Text style={ov.timeLabel}>Local Time</Text>
        <Text style={ov.time}>{time}</Text>
        <Text style={ov.city}>{member.city}, {member.country}</Text>
      </View>

      <View style={ov.card}>
        <View style={[ov.dot, { backgroundColor: call.color }]} />
        <Text style={[ov.callTxt, { color: call.color }]}>{call.label}</Text>
      </View>

      {(member.birthday || member.anniversary) && (
        <View style={ov.infoCard}>
          {member.birthday && (
            <View style={ov.infoRow}>
              <Text style={ov.infoIcon}>🎂</Text>
              <View>
                <Text style={ov.infoLabel}>Birthday</Text>
                <Text style={ov.infoVal}>{formatDate(member.birthday)}</Text>
              </View>
            </View>
          )}
          {member.anniversary && (
            <View style={ov.infoRow}>
              <Text style={ov.infoIcon}>💍</Text>
              <View>
                <Text style={ov.infoLabel}>Anniversary</Text>
                <Text style={ov.infoVal}>{formatDate(member.anniversary)}</Text>
              </View>
            </View>
          )}
        </View>
      )}

      {(member.hometown || member.occupation) && (
        <View style={ov.infoCard}>
          {member.hometown && (
            <View style={ov.infoRow}>
              <Text style={ov.infoIcon}>🏡</Text>
              <View>
                <Text style={ov.infoLabel}>Hometown</Text>
                <Text style={ov.infoVal}>{member.hometown}</Text>
              </View>
            </View>
          )}
          {member.occupation && (
            <View style={ov.infoRow}>
              <Text style={ov.infoIcon}>💼</Text>
              <View>
                <Text style={ov.infoLabel}>Occupation</Text>
                <Text style={ov.infoVal}>{member.occupation}</Text>
              </View>
            </View>
          )}
        </View>
      )}

      {member.importantDates && member.importantDates.length > 0 && (
        <View style={ov.infoCard}>
          <Text style={ov.sectionTitle}>Important Dates</Text>
          {member.importantDates.map((d, i) => (
            <View key={i} style={ov.infoRow}>
              <Text style={ov.infoIcon}>📅</Text>
              <View>
                <Text style={ov.infoLabel}>{d.label}</Text>
                <Text style={ov.infoVal}>{formatDate(d.date)}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const ov = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", alignItems: "center",
  },
  timeLabel: { color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: "600", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 4 },
  time: { color: "#fff", fontSize: 42, fontWeight: "800", letterSpacing: -1 },
  city: { color: "rgba(255,255,255,0.4)", fontSize: 13, marginTop: 4 },
  dot: { width: 10, height: 10, borderRadius: 5, marginBottom: 6 },
  callTxt: { fontSize: 14, fontWeight: "600" },
  infoCard: { backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 16, padding: 16, gap: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  infoIcon: { fontSize: 22, width: 28, textAlign: "center" },
  infoLabel: { color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: "600", letterSpacing: 0.6, textTransform: "uppercase" },
  infoVal: { color: "#fff", fontSize: 14, fontWeight: "600", marginTop: 1 },
  sectionTitle: { color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 4 },
});

// ─── Chat Tab ─────────────────────────────────────────────────────────────────

function ChatTab({ member }: { member: Member }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [editingMsg, setEditingMsg] = useState<ChatMessage | null>(null);
  const [editText, setEditText] = useState("");
  const flatRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!user || !member.uid) return;
    return watchChatMessages(user.uid, member.uid, (msgs) => {
      setMessages(msgs);
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    });
  }, [user?.uid, member.uid]);

  async function handleSend() {
    if (!text.trim() || !user || sending) return;
    const t = text.trim();
    setText("");
    setSending(true);
    try {
      await sendChatMessage(user.uid, member.uid, t);
    } catch {
      Alert.alert("Error", "Could not send message.");
      setText(t);
    } finally {
      setSending(false);
    }
  }

  async function handlePickImage() {
    if (!user) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (result.canceled || !result.assets[0]) return;
    setUploadingImg(true);
    try {
      const url = await uploadChatMedia(user.uid, member.uid, result.assets[0].uri);
      await sendChatMessage(user.uid, member.uid, "", url);
    } catch {
      Alert.alert("Error", "Could not send image.");
    } finally {
      setUploadingImg(false);
    }
  }

  function handleLongPress(msg: ChatMessage) {
    if (!user || msg.senderUid !== user.uid) return;
    Alert.alert("Message options", undefined, [
      {
        text: "Edit",
        onPress: () => { setEditingMsg(msg); setEditText(msg.text ?? ""); },
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          Alert.alert("Delete message?", undefined, [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete",
              style: "destructive",
              onPress: async () => {
                try {
                  await deleteChatMessage(user.uid, member.uid, msg.id);
                } catch {
                  Alert.alert("Error", "Could not delete message.");
                }
              },
            },
          ]);
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  async function handleSaveEdit() {
    if (!editingMsg || !user || !editText.trim()) return;
    try {
      await editChatMessage(user.uid, member.uid, editingMsg.id, editText.trim());
    } catch {
      Alert.alert("Error", "Could not edit message.");
    } finally {
      setEditingMsg(null);
      setEditText("");
    }
  }

  function renderMsg({ item }: { item: ChatMessage }) {
    const isMine = item.senderUid === user?.uid;
    const ts = item.sentAt?.toDate ? item.sentAt.toDate() : new Date();
    const timeStr = ts.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

    return (
      <TouchableOpacity
        onLongPress={() => handleLongPress(item)}
        activeOpacity={0.85}
        style={[ch.msgRow, isMine ? ch.msgRowMine : ch.msgRowTheirs]}
      >
        <View style={[ch.bubble, isMine ? ch.bubbleMine : ch.bubbleTheirs]}>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={ch.msgImage} resizeMode="cover" />
          ) : null}
          {item.text ? (
            <Text style={[ch.msgText, isMine ? ch.msgTextMine : ch.msgTextTheirs]}>
              {item.text}
            </Text>
          ) : null}
          <Text style={[ch.msgTime, isMine ? ch.msgTimeMine : ch.msgTimeTheirs]}>
            {timeStr}{item.editedAt ? " · edited" : ""}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={120}
    >
      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={renderMsg}
        contentContainerStyle={{ padding: 12, gap: 6, paddingBottom: 8 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingTop: 40, gap: 10 }}>
            <Ionicons name="chatbubbles-outline" size={40} color="rgba(255,255,255,0.15)" />
            <Text style={{ color: "rgba(255,255,255,0.3)", fontSize: 14 }}>No messages yet</Text>
            <Text style={{ color: "rgba(255,255,255,0.2)", fontSize: 12, textAlign: "center" }}>
              Send a message — {member.name} will see it instantly
            </Text>
          </View>
        }
      />

      {/* Edit message overlay */}
      {editingMsg && (
        <View style={ch.editBar}>
          <Ionicons name="pencil-outline" size={16} color="#a78bfa" />
          <TextInput
            style={ch.editInput}
            value={editText}
            onChangeText={setEditText}
            autoFocus
            multiline
            placeholderTextColor="rgba(255,255,255,0.3)"
          />
          <TouchableOpacity onPress={handleSaveEdit} style={ch.editSaveBtn}>
            <Text style={{ color: "#a78bfa", fontWeight: "700" }}>Save</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setEditingMsg(null); setEditText(""); }}>
            <Ionicons name="close" size={20} color="rgba(255,255,255,0.4)" />
          </TouchableOpacity>
        </View>
      )}

      <View style={ch.inputRow}>
        <TouchableOpacity
          style={ch.imgBtn}
          onPress={handlePickImage}
          disabled={uploadingImg}
        >
          {uploadingImg
            ? <ActivityIndicator size="small" color="#a78bfa" />
            : <Ionicons name="image-outline" size={22} color="rgba(255,255,255,0.5)" />}
        </TouchableOpacity>
        <TextInput
          style={ch.input}
          value={text}
          onChangeText={setText}
          placeholder={`Message ${member.name.split(" ")[0]}…`}
          placeholderTextColor="rgba(255,255,255,0.3)"
          multiline
          returnKeyType="send"
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[ch.sendBtn, (!text.trim() || sending) && { opacity: 0.4 }]}
          onPress={handleSend}
          disabled={!text.trim() || sending}
        >
          {sending
            ? <ActivityIndicator size="small" color="#fff" />
            : <Ionicons name="send" size={18} color="#fff" />}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const ch = StyleSheet.create({
  msgRow: { marginBottom: 4 },
  msgRowMine: { alignItems: "flex-end" },
  msgRowTheirs: { alignItems: "flex-start" },
  bubble: { maxWidth: "78%", borderRadius: 18, overflow: "hidden" },
  bubbleMine: { backgroundColor: "#7c6af7", borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: "rgba(255,255,255,0.1)", borderBottomLeftRadius: 4 },
  msgImage: { width: 220, height: 180 },
  msgText: { fontSize: 15, paddingHorizontal: 14, paddingVertical: 10, lineHeight: 21 },
  msgTextMine: { color: "#fff" },
  msgTextTheirs: { color: "rgba(255,255,255,0.9)" },
  msgTime: { fontSize: 10, paddingHorizontal: 12, paddingBottom: 6 },
  msgTimeMine: { color: "rgba(255,255,255,0.5)", textAlign: "right" },
  msgTimeTheirs: { color: "rgba(255,255,255,0.35)" },
  inputRow: {
    flexDirection: "row", alignItems: "flex-end", gap: 8,
    paddingHorizontal: 12, paddingVertical: 8,
    borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.07)",
    backgroundColor: "#07080f",
  },
  imgBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  input: {
    flex: 1, backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 22,
    color: "#fff", fontSize: 15, paddingHorizontal: 16, paddingVertical: 10,
    maxHeight: 120, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "#7c6af7", alignItems: "center", justifyContent: "center",
  },
  editBar: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(124,106,247,0.12)", paddingHorizontal: 14, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: "rgba(124,106,247,0.25)",
  },
  editInput: {
    flex: 1, color: "#fff", fontSize: 15,
  },
  editSaveBtn: {
    paddingHorizontal: 12, paddingVertical: 4,
    backgroundColor: "rgba(124,106,247,0.2)", borderRadius: 8,
  },
});

// ─── News Tab ─────────────────────────────────────────────────────────────────

type NewsItem = { id: string; title: string; url: string; section?: string; thumbnail?: string; trail?: string };

function NewsTab({ member }: { member: Member }) {
  const [articles, setArticles] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    const query = member.city && member.city !== member.country
      ? `${member.city} OR ${member.country}`
      : member.country;
    fetch(
      `https://content.guardianapis.com/search?q=${encodeURIComponent(query)}&api-key=test&show-fields=thumbnail,trailText&page-size=12&order-by=newest`
    )
      .then((r) => r.json())
      .then((d) => {
        const results = d?.response?.results ?? [];
        setArticles(
          results.map((a: any) => ({
            id: a.id,
            title: a.webTitle,
            url: a.webUrl,
            section: a.sectionName,
            thumbnail: a.fields?.thumbnail,
            trail: a.fields?.trailText,
          }))
        );
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [member.city, member.country]);

  if (loading) {
    return <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color="#a78bfa" /></View>;
  }

  if (error || articles.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 10 }}>
        <Ionicons name="newspaper-outline" size={40} color="rgba(255,255,255,0.15)" />
        <Text style={{ color: "rgba(255,255,255,0.3)", fontSize: 14 }}>
          {error ? "Could not load news" : `No news found for ${member.city}`}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 40 }}>
      {articles.map((a) => (
        <View key={a.id} style={nw.card}>
          {a.thumbnail ? (
            <Image source={{ uri: a.thumbnail }} style={nw.thumb} resizeMode="cover" />
          ) : null}
          <View style={{ flex: 1, gap: 4 }}>
            {a.section ? <Text style={nw.section}>{a.section.toUpperCase()}</Text> : null}
            <Text style={nw.title} numberOfLines={3}>{a.title}</Text>
            {a.trail ? <Text style={nw.trail} numberOfLines={2}>{a.trail.replace(/<[^>]+>/g, "")}</Text> : null}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const nw = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 14, overflow: "hidden",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", flexDirection: "row", gap: 12, padding: 12,
  },
  thumb: { width: 80, height: 80, borderRadius: 10, flexShrink: 0 },
  section: { color: "#a78bfa", fontSize: 10, fontWeight: "700", letterSpacing: 0.8 },
  title: { color: "#f0f0f6", fontSize: 14, fontWeight: "600", lineHeight: 20 },
  trail: { color: "rgba(255,255,255,0.4)", fontSize: 12, lineHeight: 17 },
});

// ─── Pulse Tab ────────────────────────────────────────────────────────────────

function PulseTab({ member }: { member: Member }) {
  const [entries, setEntries] = useState<PulseEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!member.uid) { setLoading(false); return; }
    return watchPulseWeek(member.uid, (e) => {
      setEntries(e);
      setLoading(false);
    });
  }, [member.uid]);

  if (loading) {
    return <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color="#a78bfa" /></View>;
  }

  if (entries.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 10 }}>
        <Text style={{ fontSize: 40 }}>💙</Text>
        <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 16, fontWeight: "600" }}>
          No pulse data yet
        </Text>
        <Text style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, textAlign: "center", lineHeight: 19 }}>
          {member.name.split(" ")[0]} hasn't logged their mood this week yet.
        </Text>
      </View>
    );
  }

  const avg = entries.reduce((s, e) => s + e.score, 0) / entries.length;

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 40 }}>
      <View style={pu.summaryCard}>
        <Text style={pu.avgLabel}>7-Day Average</Text>
        <Text style={[pu.avgScore, { color: pulseColor(avg) }]}>{avg.toFixed(1)}</Text>
        <Text style={pu.avgEmoji}>{pulseEmoji(Math.round(avg))}</Text>
      </View>

      <Text style={pu.sectionLabel}>This Week</Text>
      {entries.map((e) => (
        <View key={e.id} style={pu.entryCard}>
          <View style={pu.entryLeft}>
            <Text style={pu.entryDay}>{shortDay(e.date)}</Text>
            <Text style={pu.entryDate}>{formatDate(e.date)}</Text>
          </View>
          <View style={pu.barWrap}>
            <View style={[pu.bar, { width: `${e.score * 10}%` as any, backgroundColor: pulseColor(e.score) }]} />
          </View>
          <Text style={pu.scoreEmoji}>{pulseEmoji(e.score)}</Text>
          <Text style={[pu.scoreNum, { color: pulseColor(e.score) }]}>{e.score}</Text>
        </View>
      ))}

      {entries.some((e) => e.notes) && (
        <>
          <Text style={pu.sectionLabel}>Notes</Text>
          {entries.filter((e) => e.notes).map((e) => (
            <View key={`note-${e.id}`} style={pu.noteCard}>
              <Text style={pu.noteDay}>{shortDay(e.date)}</Text>
              <Text style={pu.noteText}>{e.notes}</Text>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const pu = StyleSheet.create({
  summaryCard: {
    backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 16, padding: 20,
    alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", gap: 4,
  },
  avgLabel: { color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase" },
  avgScore: { fontSize: 48, fontWeight: "800", letterSpacing: -1 },
  avgEmoji: { fontSize: 30 },
  sectionLabel: { color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase" },
  entryCard: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
  },
  entryLeft: { width: 44 },
  entryDay: { color: "#fff", fontSize: 12, fontWeight: "700" },
  entryDate: { color: "rgba(255,255,255,0.3)", fontSize: 10 },
  barWrap: { flex: 1, height: 8, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 4, overflow: "hidden" },
  bar: { height: 8, borderRadius: 4 },
  scoreEmoji: { fontSize: 18, width: 24, textAlign: "center" },
  scoreNum: { fontSize: 16, fontWeight: "800", width: 20, textAlign: "center" },
  noteCard: {
    backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", gap: 4,
  },
  noteDay: { color: "#a78bfa", fontSize: 11, fontWeight: "700", letterSpacing: 0.6 },
  noteText: { color: "rgba(255,255,255,0.7)", fontSize: 14, lineHeight: 20 },
});

// ─── Schedule Tab ─────────────────────────────────────────────────────────────

function ScheduleTab({ member }: { member: Member }) {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!member.uid) { setLoading(false); return; }
    return watchSchedule(member.uid, (evs) => {
      setEvents(evs);
      setLoading(false);
    });
  }, [member.uid]);

  if (loading) {
    return <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color="#a78bfa" /></View>;
  }

  if (events.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 10 }}>
        <Ionicons name="calendar-outline" size={40} color="rgba(255,255,255,0.15)" />
        <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 16, fontWeight: "600" }}>
          Nothing coming up
        </Text>
        <Text style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, textAlign: "center", lineHeight: 19 }}>
          {member.name.split(" ")[0]} hasn't added any upcoming events.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 40 }}>
      {events.map((ev) => (
        <View key={ev.id} style={sc.card}>
          <View style={sc.dateBadge}>
            <Text style={sc.dateMonth}>
              {new Date(ev.date + "T12:00:00").toLocaleDateString("en-US", { month: "short" }).toUpperCase()}
            </Text>
            <Text style={sc.dateDay}>
              {new Date(ev.date + "T12:00:00").getDate()}
            </Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={sc.title}>{ev.title}</Text>
            <Text style={sc.time}>
              {ev.allDay ? "All day" : ev.time ?? ""}
              {" · "}
              {formatDate(ev.date)}
            </Text>
            {ev.notes ? <Text style={sc.notes} numberOfLines={2}>{ev.notes}</Text> : null}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const sc = StyleSheet.create({
  card: {
    flexDirection: "row", gap: 14, alignItems: "flex-start",
    backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
  },
  dateBadge: {
    width: 48, alignItems: "center", backgroundColor: "rgba(167,139,250,0.12)",
    borderRadius: 10, paddingVertical: 6, borderWidth: 1, borderColor: "rgba(167,139,250,0.2)",
  },
  dateMonth: { color: "#a78bfa", fontSize: 9, fontWeight: "800", letterSpacing: 0.5 },
  dateDay: { color: "#fff", fontSize: 22, fontWeight: "800", lineHeight: 26 },
  title: { color: "#f0f0f6", fontSize: 15, fontWeight: "700" },
  time: { color: "rgba(255,255,255,0.4)", fontSize: 12 },
  notes: { color: "rgba(255,255,255,0.35)", fontSize: 12, lineHeight: 17, marginTop: 2 },
});

// ─── Main PersonDetail Component ──────────────────────────────────────────────

const TABS: { key: Tab; icon: string; label: string }[] = [
  { key: "overview", icon: "person-outline", label: "Overview" },
  { key: "chat", icon: "chatbubble-outline", label: "Chat" },
  { key: "news", icon: "newspaper-outline", label: "News" },
  { key: "pulse", icon: "heart-outline", label: "Pulse" },
  { key: "schedule", icon: "calendar-outline", label: "Schedule" },
];

export default function PersonDetail({ member, visible, onClose, onUpdate, onDelete }: Props) {
  const [tab, setTab] = useState<Tab>("overview");
  const [zoomPhoto, setZoomPhoto] = useState(false);

  const initials = member.name[0]?.toUpperCase() ?? "?";

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={pd.root}>
        {/* Header */}
        <View style={pd.header}>
          <TouchableOpacity onPress={onClose} style={pd.backBtn}>
            <Ionicons name="chevron-down" size={24} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => member.photoUri && setZoomPhoto(true)} activeOpacity={0.9}>
            {member.photoUri ? (
              <Image source={{ uri: member.photoUri }} style={pd.avatar} />
            ) : (
              <View style={[pd.avatar, pd.avatarFallback]}>
                <Text style={pd.avatarInitial}>{initials}</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={pd.name}>{member.name}</Text>
            <Text style={pd.relationship}>{member.relationship}</Text>
            <Text style={pd.location}>{member.city}, {member.country}</Text>
          </View>
        </View>

        {/* Tab bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={pd.tabBar}
          contentContainerStyle={pd.tabBarContent}
        >
          {TABS.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[pd.tabBtn, tab === t.key && pd.tabBtnActive]}
              onPress={() => setTab(t.key)}
            >
              <Ionicons
                name={t.icon as any}
                size={16}
                color={tab === t.key ? "#a78bfa" : "rgba(255,255,255,0.4)"}
              />
              <Text style={[pd.tabLabel, tab === t.key && pd.tabLabelActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Tab content */}
        <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 12 }}>
          {tab === "overview" && <OverviewTab member={member} />}
          {tab === "chat" && <ChatTab member={member} />}
          {tab === "news" && <NewsTab member={member} />}
          {tab === "pulse" && <PulseTab member={member} />}
          {tab === "schedule" && <ScheduleTab member={member} />}
        </View>
      </View>

      {/* Photo zoom */}
      <Modal visible={zoomPhoto} transparent animationType="fade">
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.92)", justifyContent: "center", alignItems: "center" }}
          activeOpacity={1}
          onPress={() => setZoomPhoto(false)}
        >
          {member.photoUri && (
            <Image source={{ uri: member.photoUri }} style={{ width: "90%", aspectRatio: 1, borderRadius: 16 }} resizeMode="cover" />
          )}
        </TouchableOpacity>
      </Modal>
    </Modal>
  );
}

const pd = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#07080f" },
  header: {
    flexDirection: "row", alignItems: "center", gap: 14,
    paddingHorizontal: 16, paddingTop: 20, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.07)",
  },
  backBtn: { padding: 4, marginRight: 2 },
  avatar: { width: 52, height: 52, borderRadius: 26, overflow: "hidden" },
  avatarFallback: { backgroundColor: "#2d3a5a", alignItems: "center", justifyContent: "center" },
  avatarInitial: { color: "#fff", fontSize: 22, fontWeight: "700" },
  name: { color: "#fff", fontSize: 18, fontWeight: "800" },
  relationship: { color: "#a78bfa", fontSize: 12, fontWeight: "600", marginTop: 1 },
  location: { color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 1 },
  tabBar: { borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.07)", flexGrow: 0 },
  tabBarContent: { paddingHorizontal: 12, gap: 4, paddingVertical: 8 },
  tabBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
  },
  tabBtnActive: { backgroundColor: "rgba(167,139,250,0.12)" },
  tabLabel: { color: "rgba(255,255,255,0.4)", fontSize: 13, fontWeight: "600" },
  tabLabelActive: { color: "#a78bfa" },
});
