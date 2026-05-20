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

const MEMBERS = [
  {
    id: 1,
    name: "Mom",
    relationship: "Mother",
    emoji: "👩",
    city: "New York",
    country: "US",
    timezone: "America/New_York",
    lat: 40.7128,
    lon: -74.006,
    wakeHour: 7,
    sleepHour: 22,
  },
  {
    id: 2,
    name: "Dad",
    relationship: "Father",
    emoji: "👨",
    city: "Chicago",
    country: "US",
    timezone: "America/Chicago",
    lat: 41.8781,
    lon: -87.6298,
    wakeHour: 6,
    sleepHour: 21,
  },
  {
    id: 3,
    name: "Nani",
    relationship: "Grandmother",
    emoji: "👵",
    city: "Mumbai",
    country: "IN",
    timezone: "Asia/Kolkata",
    lat: 19.076,
    lon: 72.8777,
    wakeHour: 5,
    sleepHour: 21,
  },
  {
    id: 4,
    name: "Alex",
    relationship: "Sibling",
    emoji: "🧑",
    city: "London",
    country: "GB",
    timezone: "Europe/London",
    lat: 51.5074,
    lon: -0.1278,
    wakeHour: 8,
    sleepHour: 23,
  },
];

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
    return { label: "Just waking / winding down", dot: "#f59e0b" };
  return { label: "Probably sleeping", dot: "#6b7280" };
}

function useWeather(member: (typeof MEMBERS)[0]) {
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

function FamilyCard({ member }: { member: (typeof MEMBERS)[0] }) {
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
      style={styles.card}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.emoji}>{member.emoji}</Text>
        <View>
          <Text style={styles.name}>{member.name}</Text>
          <View style={styles.relationBadge}>
            <Text style={styles.relationText}>
              {member.relationship.toUpperCase()}
            </Text>
          </View>
        </View>
      </View>
      <Text style={styles.location}>
        📍 {member.city}, {member.country}
      </Text>
      <Text style={styles.time}>{timeStr}</Text>
      <Text style={styles.date}>{dateStr}</Text>
      {weather ? (
        <View style={styles.weatherRow}>
          <Text style={styles.weatherIcon}>{weather.icon}</Text>
          <View>
            <Text style={styles.weatherTemp}>
              {weather.temp}
              {weather.unit}
            </Text>
            <Text style={styles.weatherLabel}>{weather.label}</Text>
          </View>
          {weather.severe && (
            <View style={styles.alertBadge}>
              <Text style={styles.alertText}>⚠ ALERT</Text>
            </View>
          )}
        </View>
      ) : (
        <ActivityIndicator
          color="rgba(255,255,255,0.4)"
          style={{ marginVertical: 12 }}
        />
      )}
      <View style={styles.callRow}>
        <View style={[styles.dot, { backgroundColor: call.dot }]} />
        <Text style={styles.callLabel}>{call.label}</Text>
      </View>
    </LinearGradient>
  );
}

export default function Index() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <View style={styles.logoMark}>
            <Text style={styles.logoEmoji}>🎵</Text>
          </View>
          <View>
            <Text style={styles.logoText}>Ensemble</Text>
            <Text style={styles.logoTagline}>
              Everyone you love, at a glance
            </Text>
          </View>
        </View>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {MEMBERS.map((m) => (
            <FamilyCard key={m.id} member={m} />
          ))}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#07080f" },
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  logoMark: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#7c6af7",
    alignItems: "center",
    justifyContent: "center",
  },
  logoEmoji: { fontSize: 20 },
  logoText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#f0f0f6",
    letterSpacing: -0.5,
  },
  logoTagline: { fontSize: 11, color: "rgba(240,240,246,0.45)" },
  scroll: { padding: 16, gap: 16, paddingBottom: 40 },
  card: { borderRadius: 22, padding: 22 },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  emoji: { fontSize: 44 },
  name: {
    fontSize: 22,
    fontWeight: "700",
    color: "white",
    letterSpacing: -0.3,
  },
  relationBadge: {
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 9,
    paddingVertical: 2,
    borderRadius: 20,
    marginTop: 4,
    alignSelf: "flex-start",
  },
  relationText: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255,255,255,0.8)",
    letterSpacing: 0.5,
  },
  location: { fontSize: 12, color: "rgba(255,255,255,0.55)", marginBottom: 8 },
  time: {
    fontSize: 46,
    fontWeight: "800",
    color: "white",
    letterSpacing: -2,
    lineHeight: 52,
  },
  date: { fontSize: 13, color: "rgba(255,255,255,0.55)", marginBottom: 18 },
  weatherRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  weatherIcon: { fontSize: 30 },
  weatherTemp: { fontSize: 22, fontWeight: "700", color: "white" },
  weatherLabel: { fontSize: 12, color: "rgba(255,255,255,0.6)" },
  alertBadge: {
    marginLeft: "auto",
    backgroundColor: "rgba(239,68,68,0.3)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.5)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  alertText: { color: "#fca5a5", fontSize: 11, fontWeight: "700" },
  callRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: 12,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  callLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "rgba(255,255,255,0.85)",
  },
});
