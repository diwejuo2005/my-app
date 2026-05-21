import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Member, useMembers } from "../../context/MembersContext";

type Message = {
  id: string;
  text: string;
  timestamp: string;
  sent: boolean;
};

const AVATAR_COLORS = ["#2d3a5a", "#2d4a3e", "#3a2d4a", "#4a3a2d", "#2d4a4a"];
function getAvatarColor(id: number) {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

function Avatar({ member, size = 44 }: { member: Member; size?: number }) {
  const r = size / 2;
  const style = { width: size, height: size, borderRadius: r, overflow: "hidden" as const, alignItems: "center" as const, justifyContent: "center" as const };
  if (member.photoUri) return <Image source={{ uri: member.photoUri }} style={style} />;
  return (
    <View style={[style, { backgroundColor: getAvatarColor(member.id) }]}>
      <Text style={{ color: "white", fontWeight: "700", fontSize: size * 0.4 }}>{member.name[0]?.toUpperCase()}</Text>
    </View>
  );
}

function timeLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function storageKey(id: number) {
  return `ensemble_chat_${id}`;
}

async function loadMessages(id: number): Promise<Message[]> {
  const raw = await AsyncStorage.getItem(storageKey(id));
  return raw ? JSON.parse(raw) : [];
}

async function saveMessages(id: number, msgs: Message[]) {
  await AsyncStorage.setItem(storageKey(id), JSON.stringify(msgs));
}

// ─── Conversation screen ──────────────────────────────────────────────────────

function ConversationScreen({ member, onBack }: { member: Member; onBack: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    loadMessages(member.id).then(setMessages);
  }, [member.id]);

  async function send() {
    const text = draft.trim();
    if (!text) return;
    const msg: Message = { id: Date.now().toString(), text, timestamp: new Date().toISOString(), sent: true };
    const updated = [...messages, msg];
    setMessages(updated);
    await saveMessages(member.id, updated);
    setDraft("");
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
  }

  return (
    <SafeAreaView style={cs.root}>
      <View style={cs.header}>
        <TouchableOpacity onPress={onBack} style={{ padding: 8 }}>
          <Ionicons name="chevron-back" size={24} color="#a78bfa" />
        </TouchableOpacity>
        <Avatar member={member} size={36} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={cs.headerName}>{member.name}</Text>
          <Text style={cs.headerSub}>{member.relationship} · {member.city}</Text>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={0}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 16 }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={cs.emptyBox}>
              <Text style={cs.emptyText}>No messages yet. Say something to {member.name}.</Text>
              <Text style={cs.emptyNote}>Messages are stored on your device.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[cs.bubble, item.sent ? cs.bubbleSent : cs.bubbleReceived]}>
              <Text style={[cs.bubbleText, item.sent ? cs.bubbleTextSent : cs.bubbleTextReceived]}>{item.text}</Text>
              <Text style={cs.bubbleTime}>{timeLabel(item.timestamp)}</Text>
            </View>
          )}
        />

        <View style={cs.inputRow}>
          <TextInput
            style={cs.input}
            value={draft}
            onChangeText={setDraft}
            placeholder={`Message ${member.name}…`}
            placeholderTextColor="rgba(255,255,255,0.3)"
            multiline
            returnKeyType="send"
            onSubmitEditing={send}
          />
          <TouchableOpacity style={cs.sendBtn} onPress={send} activeOpacity={0.7}>
            <Ionicons name="send" size={18} color="white" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Conversation list ────────────────────────────────────────────────────────

export default function ChatScreen() {
  const { members } = useMembers();
  const [previews, setPreviews] = useState<Record<number, Message | null>>({});
  const [openMember, setOpenMember] = useState<Member | null>(null);

  useEffect(() => {
    async function load() {
      const map: Record<number, Message | null> = {};
      await Promise.all(members.map(async (m) => {
        const msgs = await loadMessages(m.id);
        map[m.id] = msgs.length ? msgs[msgs.length - 1] : null;
      }));
      setPreviews(map);
    }
    load();
  }, [members, openMember]);

  if (openMember) {
    return <ConversationScreen member={openMember} onBack={() => setOpenMember(null)} />;
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={{ flex: 1 }}>
        {members.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="chatbubbles-outline" size={48} color="rgba(255,255,255,0.15)" />
            <Text style={s.emptyText}>Add people in the People tab to start chatting.</Text>
          </View>
        ) : (
          <FlatList
            data={members}
            keyExtractor={(m) => m.id.toString()}
            contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 100 }}
            renderItem={({ item: m }) => {
              const last = previews[m.id];
              return (
                <TouchableOpacity style={s.card} onPress={() => setOpenMember(m)} activeOpacity={0.75}>
                  <Avatar member={m} size={52} />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={s.name}>{m.name}</Text>
                      {last && <Text style={s.time}>{timeLabel(last.timestamp)}</Text>}
                    </View>
                    <Text style={s.preview} numberOfLines={1}>
                      {last ? (last.sent ? "You: " : "") + last.text : `Start a conversation with ${m.name}`}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#07080f" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  name: { fontSize: 16, fontWeight: "700", color: "#f0f0f6" },
  preview: { fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 2 },
  time: { fontSize: 11, color: "rgba(255,255,255,0.3)" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 40 },
  emptyText: { color: "rgba(255,255,255,0.35)", fontSize: 15, textAlign: "center", lineHeight: 22 },
});

const cs = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#07080f" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  headerName: { fontSize: 16, fontWeight: "700", color: "#f0f0f6" },
  headerSub: { fontSize: 11, color: "rgba(255,255,255,0.4)" },
  bubble: {
    maxWidth: "80%",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleSent: { alignSelf: "flex-end", backgroundColor: "#7c6af7" },
  bubbleReceived: { alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.08)" },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  bubbleTextSent: { color: "white" },
  bubbleTextReceived: { color: "#f0f0f6" },
  bubbleTime: { fontSize: 10, color: "rgba(255,255,255,0.45)", marginTop: 4, textAlign: "right" },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
    paddingBottom: 90,
  },
  input: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: "#f0f0f6",
    fontSize: 15,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#7c6af7",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyBox: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, marginTop: 80 },
  emptyText: { color: "rgba(255,255,255,0.5)", fontSize: 15, textAlign: "center" },
  emptyNote: { color: "rgba(255,255,255,0.25)", fontSize: 12, textAlign: "center" },
});
