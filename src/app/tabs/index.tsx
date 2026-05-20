import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { Member, useMembers } from "../../context/MembersContext";

const GRADIENTS: Record<string, [string, string]> = {
  night: ["#0d1b2a", "#1b2838"],
  dawn: ["#7b2d8b", "#c0392b"],
  morning: ["#1a6194", "#1abc9c"],
  afternoon: ["#155799", "#159957"],
  evening: ["#4a148c", "#880e4f"],
  "late-evening": ["#1a237e", "#311b92"],
};

function weatherCodeInfo(code: number) {
  if (code === 0) return { icon: "☀️", label: "Clear", severe: false };
  if (code <= 2) return { icon: "🌤️", label: "Mostly clear", severe: false };
  if (code === 3) return { icon: "☁️", label: "Overcast", severe: false };
  if ([45, 48].includes(code))
    return { icon: "🌫️", label: "Foggy", severe: false };
  if ([51, 53, 55].includes(code))
    return { icon: "🌦️", label: "Drizzle", severe: false };
  if ([61, 63].includes(code))
    return { icon: "🌧️", label: "Rain", severe: false };
  if (code === 65) return { icon: "🌧️", label: "Heavy rain", severe: true };
  if ([71, 73].includes(code))
    return { icon: "❄️", label: "Snow", severe: false };
  if (code === 75) return { icon: "❄️", label: "Heavy snow", severe: true };
  if ([80, 81].includes(code))
    return { icon: "🌦️", label: "Showers", severe: false };
  if (code === 82)
    return { icon: "⛈️", label: "Violent showers", severe: true };
  if (code === 95) return { icon: "⛈️", label: "Thunderstorm", severe: true };
  if ([96, 99].includes(code))
    return { icon: "⛈️", label: "Severe storm", severe: true };
  return { icon: "🌡️", label: "Unknown", severe: false };
}

function getTimeOfDay(timezone: string) {
  const h = parseInt(
    new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false,
    }).format(new Date()),
  );
  if (h >= 5 && h < 8) return "dawn";
  if (h >= 8 && h < 12) return "morning";
  if (h >= 12 && h < 17) return "afternoon";
  if (h >= 17 && h < 20) return "evening";
  if (h >= 20 && h < 22) return "late-evening";
  return "night";
}

function getCallStatus(timezone: string, wakeHour: number, sleepHour: number) {
  const str = new Date().toLocaleString("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  });
  const [h, m] = str.split(":").map(Number);
  const t = h + m / 60;
  if (t >= wakeHour + 1 && t < sleepHour - 1)
    return { label: "Good time to call", dot: "#22c55e" };
  if (
    (t >= wakeHour && t < wakeHour + 1) ||
    (t >= sleepHour - 1 && t < sleepHour)
  )
    return { label: "Waking / winding down", dot: "#f59e0b" };
  return { label: "Probably sleeping", dot: "#6b7280" };
}

function useWeather(member: Member) {
  const [weather, setWeather] = useState<any>(null);
  useEffect(() => {
    const unit = member.country === "US" ? "fahrenheit" : "celsius";
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${member.lat}&longitude=${member.lon}&current=temperature_2m,weather_code&temperature_unit=${unit}`,
    )
      .then((r) => r.json())
      .then((d) =>
        setWeather({
          temp: Math.round(d.current.temperature_2m),
          unit: unit === "fahrenheit" ? "°F" : "°C",
          ...weatherCodeInfo(d.current.weather_code),
        }),
      )
      .catch(() => {});
  }, [member.id]);
  return weather;
}

function FamilyCard({ member }: { member: Member }) {
  const weather = useWeather(member);
  const tod = getTimeOfDay(member.timezone);
  const call = getCallStatus(
    member.timezone,
    member.wakeHour,
    member.sleepHour,
  );
  const timeStr = new Intl.DateTimeFormat("en-US", {
    timeZone: member.timezone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date());
  const dateStr = new Intl.DateTimeFormat("en-US", {
    timeZone: member.timezone,
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(new Date());

  return (
    <LinearGradient
      colors={GRADIENTS[tod]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={s.card}
    >
      <View style={s.cardTop}>
        <Text style={s.emoji}>{member.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={s.name}>{member.name}</Text>
          <View style={s.badge}>
            <Text style={s.badgeText}>{member.relationship.toUpperCase()}</Text>
          </View>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={s.time}>{timeStr}</Text>
          <Text style={s.date}>{dateStr}</Text>
        </View>
      </View>

      <Text style={s.location}>
        📍 {member.city}, {member.country}
      </Text>

      {weather ? (
        <View style={s.weatherRow}>
          <Text style={s.wIcon}>{weather.icon}</Text>
          <Text style={s.wTemp}>
            {weather.temp}
            {weather.unit}
          </Text>
          <Text style={s.wLabel}>{weather.label}</Text>
          {weather.severe && (
            <View style={s.alertBadge}>
              <Text style={s.alertText}>⚠ ALERT</Text>
            </View>
          )}
        </View>
      ) : (
        <ActivityIndicator
          color="rgba(255,255,255,0.4)"
          style={{ marginVertical: 10 }}
        />
      )}

      <View style={s.callRow}>
        <View style={[s.dot, { backgroundColor: call.dot }]} />
        <Text style={s.callLabel}>{call.label}</Text>
      </View>
    </LinearGradient>
  );
}

export default function HomeScreen() {
  const { members } = useMembers();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const awake = members.filter((m) => {
    const str = new Date().toLocaleString("en-US", {
      timeZone: m.timezone,
      hour: "numeric",
      hour12: false,
    });
    const h = parseInt(str);
    return h >= m.wakeHour && h < m.sleepHour;
  }).length;

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={s.statRow}>
            <View style={s.statCard}>
              <Text style={s.statNum}>{members.length}</Text>
              <Text style={s.statLabel}>Connected</Text>
            </View>
            <View style={s.statCard}>
              <Text style={[s.statNum, { color: "#22c55e" }]}>{awake}</Text>
              <Text style={s.statLabel}>Awake now</Text>
            </View>
            <View style={s.statCard}>
              <Text style={[s.statNum, { color: "#6b7280" }]}>
                {members.length - awake}
              </Text>
              <Text style={s.statLabel}>Sleeping</Text>
            </View>
          </View>
          {members.map((m) => (
            <FamilyCard key={`${m.id}-${tick}`} member={m} />
          ))}
          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#07080f" },
  scroll: { padding: 16, gap: 14 },
  statRow: { flexDirection: "row", gap: 10, marginBottom: 6 },
  statCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  statNum: { fontSize: 26, fontWeight: "800", color: "#f0f0f6" },
  statLabel: { fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 },
  card: { borderRadius: 22, padding: 20 },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  emoji: { fontSize: 40 },
  name: { fontSize: 20, fontWeight: "700", color: "white" },
  badge: {
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
    marginTop: 3,
    alignSelf: "flex-start",
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "rgba(255,255,255,0.8)",
    letterSpacing: 0.5,
  },
  time: {
    fontSize: 28,
    fontWeight: "800",
    color: "white",
    letterSpacing: -1,
    textAlign: "right",
  },
  date: { fontSize: 11, color: "rgba(255,255,255,0.5)", textAlign: "right" },
  location: { fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 10 },
  weatherRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    padding: 11,
    marginBottom: 10,
  },
  wIcon: { fontSize: 26 },
  wTemp: { fontSize: 20, fontWeight: "700", color: "white" },
  wLabel: { fontSize: 12, color: "rgba(255,255,255,0.6)", flex: 1 },
  alertBadge: {
    backgroundColor: "rgba(239,68,68,0.3)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.5)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  alertText: { color: "#fca5a5", fontSize: 10, fontWeight: "700" },
  callRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 10,
    padding: 10,
  },
  dot: { width: 9, height: 9, borderRadius: 5 },
  callLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "rgba(255,255,255,0.85)",
  },
});
