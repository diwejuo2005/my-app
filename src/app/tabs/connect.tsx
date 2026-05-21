import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Member, useMembers } from "../../context/MembersContext";

// ─── Storage keys ─────────────────────────────────────────────────────────────

const CHECKINS_KEY = "ensemble_checkins";
const PULSE_KEY = "ensemble_pulse";

// memberId.toString() → ISO date string
type CheckinsMap = Record<string, string>;

// memberId.toString() → { "YYYY-MM-DD": 1-5 }
type PulseMap = Record<string, Record<string, number>>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function daysBetweenToday(isoStr: string): number {
  const then = new Date(isoStr);
  const now = new Date();
  const diff =
    new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() -
    new Date(then.getFullYear(), then.getMonth(), then.getDate()).getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

function last7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split("T")[0]);
  }
  return days;
}

function shortDayLabel(isoStr: string): string {
  const d = new Date(isoStr + "T12:00:00");
  return d.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 3);
}

function dotColor(score: number | undefined): string {
  if (!score) return "rgba(255,255,255,0.15)";
  if (score <= 2) return "#f87171";
  if (score === 3) return "#fbbf24";
  return "#34d399";
}

const SCORE_LABELS: Record<number, string> = {
  1: "Worried",
  2: "Concerned",
  3: "OK",
  4: "Good",
  5: "Great",
};

// ─── Avatar component ────────────────────────────────────────────────────────

function MemberAvatar({ member, size = 44 }: { member: Member; size?: number }) {
  const radius = size / 2;
  const style = {
    width: size,
    height: size,
    borderRadius: radius,
    overflow: "hidden" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  };
  if (member.photoUri) {
    return <Image source={{ uri: member.photoUri }} style={style} />;
  }
  return (
    <View style={[style, { backgroundColor: getAvatarColor(member.id) }]}>
      <Text style={{ color: "white", fontWeight: "700", fontSize: size * 0.4 }}>
        {member.name[0]?.toUpperCase() ?? "?"}
      </Text>
    </View>
  );
}

// ─── Check-Ins tab ────────────────────────────────────────────────────────────

function CheckInCard({
  member,
  lastDate,
  onConnect,
  logged,
}: {
  member: Member;
  lastDate: string | undefined;
  onConnect: () => void;
  logged: boolean;
}) {
  let daysAgo: number | null = null;
  if (lastDate) daysAgo = daysBetweenToday(lastDate);

  let contactColor = "rgba(255,255,255,0.35)";
  let contactLabel = "Never connected";

  if (daysAgo !== null) {
    if (daysAgo <= 7) contactColor = "#34d399";
    else if (daysAgo <= 14) contactColor = "#fbbf24";
    else contactColor = "#f87171";
    contactLabel =
      daysAgo === 0 ? "Today" : daysAgo === 1 ? "1 day ago" : `${daysAgo} days ago`;
  }

  return (
    <View style={ci.card}>
      <MemberAvatar member={member} size={48} />
      <View style={{ flex: 1 }}>
        <Text style={ci.name}>{member.name}</Text>
        <Text style={ci.rel}>{member.relationship}</Text>
        <Text style={[ci.contact, { color: contactColor }]}>
          {daysAgo !== null ? `Last contact: ${contactLabel}` : contactLabel}
        </Text>
      </View>
      <TouchableOpacity
        style={[ci.connectBtn, logged && ci.loggedBtn]}
        onPress={onConnect}
        activeOpacity={0.7}
      >
        <Text style={[ci.connectText, logged && ci.loggedText]}>
          {logged ? "Logged!" : "Connect"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Pulse tab ────────────────────────────────────────────────────────────────

function PulseCard({
  member,
  scores,
  onScore,
}: {
  member: Member;
  scores: Record<string, number>;
  onScore: (score: number) => void;
}) {
  const today = todayStr();
  const todayScore = scores[today];
  const days = last7Days();

  return (
    <View style={pu.card}>
      <View style={pu.topRow}>
        <MemberAvatar member={member} size={40} />
        <Text style={pu.name}>{member.name}</Text>
      </View>

      {/* Score buttons */}
      <View style={pu.scoreRow}>
        {[1, 2, 3, 4, 5].map((n) => {
          const active = todayScore === n;
          return (
            <TouchableOpacity
              key={n}
              style={[pu.scoreBtn, active && pu.scoreBtnActive]}
              onPress={() => onScore(n)}
              activeOpacity={0.7}
            >
              <Text style={[pu.scoreNum, active && pu.scoreNumActive]}>{n}</Text>
              <Text style={[pu.scoreLabel, active && pu.scoreLabelActive]}>
                {SCORE_LABELS[n]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 7-day dots */}
      <View style={pu.dotsRow}>
        {days.map((d) => {
          const score = scores[d];
          const isToday = d === today;
          return (
            <View key={d} style={pu.dotCol}>
              <View
                style={[
                  pu.dot,
                  {
                    backgroundColor: dotColor(score),
                    borderWidth: isToday ? 2 : 0,
                    borderColor: "#a78bfa",
                  },
                ]}
              />
              <Text style={pu.dotLabel}>{shortDayLabel(d)}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function ConnectScreen() {
  const { members } = useMembers();
  const [activeTab, setActiveTab] = useState<"checkin" | "pulse">("checkin");
  const [checkinsMap, setCheckinsMap] = useState<CheckinsMap>({});
  const [pulseMap, setPulseMap] = useState<PulseMap>({});
  const [loggedIds, setLoggedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    AsyncStorage.multiGet([CHECKINS_KEY, PULSE_KEY]).then(([[, ci], [, pu]]) => {
      if (ci) {
        try { setCheckinsMap(JSON.parse(ci)); } catch {}
      }
      if (pu) {
        try { setPulseMap(JSON.parse(pu)); } catch {}
      }
    });
  }, []);

  async function handleConnect(member: Member) {
    const newMap: CheckinsMap = { ...checkinsMap, [member.id.toString()]: todayStr() };
    setCheckinsMap(newMap);
    await AsyncStorage.setItem(CHECKINS_KEY, JSON.stringify(newMap));
    setLoggedIds((prev) => new Set([...prev, member.id]));
    setTimeout(() => {
      setLoggedIds((prev) => {
        const next = new Set(prev);
        next.delete(member.id);
        return next;
      });
    }, 2000);
  }

  async function handlePulse(member: Member, score: number) {
    const key = member.id.toString();
    const today = todayStr();
    const existing = pulseMap[key] || {};
    const newEntry = { ...existing, [today]: score };
    const newMap: PulseMap = { ...pulseMap, [key]: newEntry };
    setPulseMap(newMap);
    await AsyncStorage.setItem(PULSE_KEY, JSON.stringify(newMap));
  }

  // Sort members for check-ins: never-contacted first, then most overdue
  const sortedForCheckins = [...members].sort((a, b) => {
    const aDate = checkinsMap[a.id.toString()];
    const bDate = checkinsMap[b.id.toString()];
    if (!aDate && !bDate) return 0;
    if (!aDate) return -1;
    if (!bDate) return 1;
    const aDays = daysBetweenToday(aDate);
    const bDays = daysBetweenToday(bDate);
    return bDays - aDays;
  });

  const tabBtn = {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center" as const,
    borderRadius: 18,
  };
  const activeTabBtn = {
    backgroundColor: "#7c6af7",
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />

      {/* Top toggle */}
      <View style={s.toggle}>
        <TouchableOpacity
          onPress={() => setActiveTab("checkin")}
          style={[tabBtn, activeTab === "checkin" && activeTabBtn]}
          activeOpacity={0.8}
        >
          <Text
            style={[
              s.toggleText,
              activeTab === "checkin" && s.toggleTextActive,
            ]}
          >
            Check-Ins
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab("pulse")}
          style={[tabBtn, activeTab === "pulse" && activeTabBtn]}
          activeOpacity={0.8}
        >
          <Text
            style={[
              s.toggleText,
              activeTab === "pulse" && s.toggleTextActive,
            ]}
          >
            Pulse
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === "checkin" &&
          sortedForCheckins.map((m) => (
            <CheckInCard
              key={m.id}
              member={m}
              lastDate={checkinsMap[m.id.toString()]}
              onConnect={() => { handleConnect(m); }}
              logged={loggedIds.has(m.id)}
            />
          ))}

        {activeTab === "pulse" &&
          members.map((m) => (
            <PulseCard
              key={m.id}
              member={m}
              scores={pulseMap[m.id.toString()] || {}}
              onScore={(score) => { handlePulse(m, score); }}
            />
          ))}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#07080f" },
  toggle: {
    flexDirection: "row",
    margin: 16,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 20,
    padding: 3,
  },
  toggleText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
    fontWeight: "600",
  },
  toggleTextActive: {
    color: "white",
  },
  scroll: {
    padding: 16,
    paddingTop: 0,
  },
});

const ci = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  name: {
    color: "#f0f0f6",
    fontSize: 16,
    fontWeight: "700",
  },
  rel: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
    marginTop: 2,
  },
  contact: {
    fontSize: 12,
    marginTop: 3,
    fontWeight: "600",
  },
  connectBtn: {
    backgroundColor: "rgba(124,106,247,0.2)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(124,106,247,0.4)",
  },
  loggedBtn: {
    backgroundColor: "rgba(52,211,153,0.2)",
    borderColor: "rgba(52,211,153,0.4)",
  },
  connectText: {
    color: "#a78bfa",
    fontSize: 13,
    fontWeight: "700",
  },
  loggedText: {
    color: "#34d399",
  },
});

const pu = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    gap: 14,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  name: {
    color: "#f0f0f6",
    fontSize: 16,
    fontWeight: "700",
  },
  scoreRow: {
    flexDirection: "row",
    gap: 6,
  },
  scoreBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.04)",
    gap: 3,
  },
  scoreBtnActive: {
    backgroundColor: "#7c6af7",
    borderColor: "#a78bfa",
  },
  scoreNum: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 16,
    fontWeight: "700",
  },
  scoreNumActive: {
    color: "white",
  },
  scoreLabel: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 9,
    fontWeight: "600",
    textAlign: "center",
  },
  scoreLabelActive: {
    color: "rgba(255,255,255,0.9)",
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dotCol: {
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotLabel: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 9,
    fontWeight: "500",
  },
});
