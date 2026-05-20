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
import { Member, useMembers } from "../../context/MembersContext";

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

const COUNTRY_TAG: Record<string, string> = {
  US: "world/united-states",
  GB: "world/uk",
  IN: "world/india",
  AU: "world/australia",
  CA: "world/canada",
  FR: "world/france",
  DE: "world/germany",
  JP: "world/japan",
  CN: "world/china",
  BR: "world/brazil",
  MX: "world/mexico",
  NG: "world/nigeria",
  ZA: "world/south-africa",
  IT: "world/italy",
  ES: "world/spain",
  PK: "world/pakistan",
  GH: "world/ghana",
};

const CRITICAL = [
  "earthquake",
  "flood",
  "hurricane",
  "tornado",
  "explosion",
  "attack",
  "shooting",
  "terrorism",
  "disaster",
  "emergency",
  "evacuation",
  "outbreak",
  "pandemic",
  "riot",
  "coup",
  "curfew",
  "wildfire",
  "tsunami",
  "volcano",
];
const IMPORTANT = [
  "election",
  "protest",
  "strike",
  "war",
  "conflict",
  "recession",
  "scandal",
  "arrested",
  "indicted",
  "sanctions",
  "crisis",
];

function classify(title: string, desc: string) {
  const t = (title + " " + desc).toLowerCase();
  if (CRITICAL.some((k) => t.includes(k))) return "critical";
  if (IMPORTANT.some((k) => t.includes(k))) return "important";
  return "normal";
}

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return `${Math.round(diff / 86400)}d ago`;
}

async function fetchNews(member: Member) {
  const tag = COUNTRY_TAG[member.country];
  const url = tag
    ? `https://content.guardianapis.com/search?tag=${tag}&api-key=test&show-fields=trailText&page-size=10&order-by=newest`
    : `https://content.guardianapis.com/search?q=${encodeURIComponent(member.country)}&api-key=test&show-fields=trailText&page-size=10&order-by=newest`;
  const res = await fetch(url);
  const data = await res.json();
  return (data.response?.results || []).map((item: any) => ({
    title: item.webTitle,
    section: item.sectionName,
    link: item.webUrl,
    pubDate: item.webPublicationDate,
    desc: item.fields?.trailText?.replace(/<[^>]+>/g, "") || "",
    level: classify(item.webTitle, item.fields?.trailText || ""),
  }));
}

export default function NewsScreen() {
  const { members } = useMembers();
  const [active, setActive] = useState(0);
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!members[active]) return;
    setLoading(true);
    setNews([]);
    fetchNews(members[active])
      .then((items) => {
        setNews(
          items.sort(
            (a: any, b: any) =>
              ({ critical: 0, important: 1, normal: 2 })[a.level as string]! -
              { critical: 0, important: 1, normal: 2 }[b.level as string]!,
          ),
        );
      })
      .finally(() => setLoading(false));
    const t = setInterval(
      () => fetchNews(members[active]).then(setNews),
      90000,
    );
    return () => clearInterval(t);
  }, [active, members.length]);

  const borderColor = (level: string) =>
    level === "critical"
      ? "#ef4444"
      : level === "important"
        ? "#f59e0b"
        : "rgba(255,255,255,0.12)";
  const titleColor = (level: string) =>
    level === "critical"
      ? "#fca5a5"
      : level === "important"
        ? "#fde68a"
        : "rgba(255,255,255,0.9)";

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
          <Text style={s.empty}>No recent headlines found</Text>
        )}
        {news.map((article, i) => (
          <TouchableOpacity
            key={i}
            style={[s.card, { borderLeftColor: borderColor(article.level) }]}
            onPress={() => Linking.openURL(article.link)}
          >
            <Text style={s.section}>{article.section}</Text>
            <Text style={[s.title, { color: titleColor(article.level) }]}>
              {article.title}
            </Text>
            {article.desc ? (
              <Text style={s.desc} numberOfLines={2}>
                {article.desc}
              </Text>
            ) : null}
            <View style={s.meta}>
              <Text style={s.source}>The Guardian</Text>
              <Text style={s.metaDot}>·</Text>
              <Text style={s.ago}>{timeAgo(article.pubDate)}</Text>
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
  desc: {
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
    lineHeight: 17,
    marginBottom: 8,
  },
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
