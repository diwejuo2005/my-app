import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useMembers } from "../../context/MembersContext";
import { notifyCritical } from "../../lib/notifications";
import { getSafetyFeed, SafetyItem, Severity } from "../../lib/safety";

const AVATAR_COLORS = [
  "#2d3a5a",
  "#2d4a3e",
  "#3a2d4a",
  "#4a3a2d",
  "#2d4a4a",
];

function getAvatarColor(id: number) {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return `${Math.round(diff / 86400)}d ago`;
}

export default function NewsScreen() {
  const { members } = useMembers();
  const [active, setActive] = useState(0);
  const [news, setNews] = useState<SafetyItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!members[active]) return;
    const member = members[active];
    let cancelled = false;
    setLoading(true);
    setNews([]);

    const load = async () => {
      const items = await getSafetyFeed(member);
      if (cancelled) return;
      setNews(items);
      // notifyCritical dedupes by item id and ignores non-urgent items.
      for (const item of items) notifyCritical(member, item).catch(() => {});
    };

    load().catch(() => {}).finally(() => { if (!cancelled) setLoading(false); });
    // Sources update every few minutes at most; refreshing faster just burns battery.
    const t = setInterval(() => { load().catch(() => {}); }, 5 * 60 * 1000);
    return () => { cancelled = true; clearInterval(t); };
  }, [active, members[active]?.id, members[active]?.city]);

  const cardBorderColor = (severity: Severity) => (severity === "urgent" ? "#ef4444" : "#f59e0b");
  const titleColor = (severity: Severity) => (severity === "urgent" ? "#fca5a5" : "#fde68a");

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.tabs}
        contentContainerStyle={{
          paddingHorizontal: 16,
          gap: 8,
          paddingVertical: 12,
        }}
      >
        {members.map((m, i) => (
          <TouchableOpacity
            key={m.id}
            onPress={() => setActive(i)}
            style={[s.tab, active === i && s.tabActive]}
          >
            {m.photoUri ? (
              <Image source={{ uri: m.photoUri }} style={s.tabAvatar} />
            ) : (
              <View style={[s.tabAvatar, { backgroundColor: getAvatarColor(m.id) }]}>
                <Text style={s.tabAvatarInitial}>{m.name[0].toUpperCase()}</Text>
              </View>
            )}
            <Text style={[s.tabName, active === i && s.tabNameActive]}>
              {m.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {members[active] && (
        <View style={s.liveBadge}>
          <View style={s.liveDot} />
          <Text style={s.liveText}>LIVE · {members[active].city}</Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {loading && (
          <ActivityIndicator color="#a78bfa" style={{ marginTop: 40 }} />
        )}
        {!loading && news.length === 0 && (
          <Text style={s.empty}>Nothing concerning near {members[active]?.city || "them"} right now ✓</Text>
        )}
        {news.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[s.card, { borderColor: cardBorderColor(item.severity), borderWidth: 2 }]}
            onPress={() => Linking.openURL(item.url)}
          >
            <Text style={[s.section, { color: cardBorderColor(item.severity) }]}>
              {item.severity === "urgent" ? "Urgent" : "Heads up"} · {item.category}
              {item.kind === "alert" ? " · Official alert" : ""}
            </Text>
            <Text style={[s.title, { color: titleColor(item.severity) }]}>{item.title}</Text>
            <View style={s.meta}>
              <Text style={s.source}>
                {item.source}{item.extraSources > 0 ? ` +${item.extraSources} more` : ""}
              </Text>
              <Text style={s.metaDot}>·</Text>
              <Text style={s.ago}>{timeAgo(item.publishedAt)}</Text>
            </View>
          </TouchableOpacity>
        ))}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#07080f" },
  tabs: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
    flexGrow: 0,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  tabActive: {
    backgroundColor: "rgba(124,106,247,0.25)",
    borderWidth: 1,
    borderColor: "rgba(124,106,247,0.4)",
  },
  tabAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  tabAvatarInitial: {
    color: "white",
    fontWeight: "700",
    fontSize: 11,
  },
  tabName: { fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.45)" },
  tabNameActive: { color: "#c4b5fd" },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#ef4444" },
  liveText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#ef4444",
    letterSpacing: 1,
  },
  scroll: { padding: 16, gap: 12 },
  card: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 14,
    padding: 14,
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  section: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255,255,255,0.35)",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 5,
  },
  title: { fontSize: 14, fontWeight: "600", lineHeight: 20, marginBottom: 6 },
  meta: { flexDirection: "row", alignItems: "center", gap: 5 },
  source: { fontSize: 11, fontWeight: "700", color: "#a78bfa" },
  metaDot: { color: "rgba(255,255,255,0.25)", fontSize: 10 },
  ago: { fontSize: 11, color: "rgba(255,255,255,0.35)" },
  empty: {
    textAlign: "center",
    color: "rgba(255,255,255,0.3)",
    marginTop: 60,
    fontSize: 14,
  },
});
