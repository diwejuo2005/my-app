import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { Connection, UserProfile, watchConnectionsWithProfiles } from "../../lib/firestore";
import { notifyBirthday } from "../../lib/notifications";
import PersonDetail from "../../components/PersonDetail";

type Member = {
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

function uidToNum(uid: string): number {
  let h = 0;
  for (let i = 0; i < uid.length; i++) h = Math.imul(31, h) + uid.charCodeAt(i) | 0;
  return Math.abs(h);
}

function profileToMember(
  profile: UserProfile,
  connection: Connection,
  myUid: string
): Member {
  return {
    id: uidToNum(profile.uid),
    uid: profile.uid,
    name: profile.name,
    relationship: connection.labels?.[myUid] ?? "Connection",
    photoUri: profile.photoUrl ?? undefined,
    city: profile.city,
    country: profile.country,
    timezone: profile.timezone || "UTC",
    lat: profile.lat ?? 0,
    lon: profile.lon ?? 0,
    wakeHour: profile.wakeHour ?? 7,
    sleepHour: profile.sleepHour ?? 22,
  };
}

function useFirebaseMembers() {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const unsub = watchConnectionsWithProfiles(user.uid, (items) => {
      const accepted = items.filter((i) => i.connection.status === "accepted");
      setMembers(accepted.map(({ connection, profile }) => profileToMember(profile, connection, user.uid)));
      setLoading(false);
    });
    return unsub;
  }, [user?.uid]);

  return { members, loading };
}

const GRADIENTS: Record<string, [string, string]> = {
  night: ["#060810", "#0c0e1a"],
  dawn: ["#170d1f", "#220e14"],
  morning: ["#091828", "#0b1e18"],
  afternoon: ["#0a1628", "#0b1a10"],
  evening: ["#140d26", "#1a0c1e"],
  "late-evening": ["#080a1e", "#10081c"],
};

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

function weatherCodeInfo(code: number) {
  if (code === 0)
    return { ionicon: "sunny-outline", label: "Clear", severe: false };
  if (code <= 2)
    return { ionicon: "partly-sunny-outline", label: "Mostly clear", severe: false };
  if (code === 3)
    return { ionicon: "cloud-outline", label: "Overcast", severe: false };
  if ([45, 48].includes(code))
    return { ionicon: "cloud-outline", label: "Foggy", severe: false };
  if ([51, 53, 55].includes(code))
    return { ionicon: "rainy-outline", label: "Drizzle", severe: false };
  if ([61, 63].includes(code))
    return { ionicon: "rainy-outline", label: "Rain", severe: false };
  if (code === 65)
    return { ionicon: "rainy-outline", label: "Heavy rain", severe: true };
  if ([71, 73].includes(code))
    return { ionicon: "snow-outline", label: "Snow", severe: false };
  if (code === 75)
    return { ionicon: "snow-outline", label: "Heavy snow", severe: true };
  if ([80, 81].includes(code))
    return { ionicon: "rainy-outline", label: "Showers", severe: false };
  if (code === 82)
    return { ionicon: "rainy-outline", label: "Violent showers", severe: true };
  if (code === 95)
    return { ionicon: "thunderstorm-outline", label: "Thunderstorm", severe: true };
  if ([96, 99].includes(code))
    return { ionicon: "thunderstorm-outline", label: "Severe storm", severe: true };
  return { ionicon: "partly-sunny-outline", label: "Unknown", severe: false };
}

function safeTimezone(tz: string | undefined): string {
  if (!tz) return "UTC";
  try { Intl.DateTimeFormat(undefined, { timeZone: tz }); return tz; } catch { return "UTC"; }
}

function getTimeOfDay(timezone: string) {
  try {
    const h = parseInt(
      new Intl.DateTimeFormat("en-US", {
        timeZone: safeTimezone(timezone),
        hour: "2-digit",
        hour12: false,
      }).format(new Date()),
    ) % 24;
    if (h >= 5 && h < 8) return "dawn";
    if (h >= 8 && h < 12) return "morning";
    if (h >= 12 && h < 17) return "afternoon";
    if (h >= 17 && h < 20) return "evening";
    if (h >= 20 && h < 22) return "late-evening";
    return "night";
  } catch { return "night"; }
}

function getCallStatus(timezone: string, wakeHour: number, sleepHour: number) {
  const tz = safeTimezone(timezone);
  const now = new Date();
  const h = parseInt(new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "2-digit", hour12: false }).format(now)) % 24;
  const m = parseInt(new Intl.DateTimeFormat("en-US", { timeZone: tz, minute: "2-digit" }).format(now));
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
  const lastRef = useRef<{ temp: number; code: number } | null>(null);
  const hasGoodValueRef = useRef(false);

  useEffect(() => {
    const unit = member.country === "US" ? "fahrenheit" : "celsius";

    async function doFetch() {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      try {
        const r = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${member.lat}&longitude=${member.lon}&current=temperature_2m,weather_code&temperature_unit=${unit}`,
          { signal: controller.signal },
        );
        clearTimeout(timeoutId);
        const d = await r.json();
        if (
          !d ||
          !d.current ||
          typeof d.current.temperature_2m !== "number"
        ) {
          throw new Error("Invalid weather response");
        }
        const temp = Math.round(d.current.temperature_2m);
        const code = typeof d.current.weather_code === "number"
          ? d.current.weather_code
          : 0;
        if (
          lastRef.current?.temp === temp &&
          lastRef.current?.code === code
        ) {
          return;
        }
        lastRef.current = { temp, code };
        hasGoodValueRef.current = true;
        setWeather({
          temp,
          unit: unit === "fahrenheit" ? "°F" : "°C",
          ...weatherCodeInfo(code),
        });
      } catch {
        clearTimeout(timeoutId);
        // Only surface an error sentinel if we have never had a good value.
        // Otherwise keep showing the last good weather.
        if (!hasGoodValueRef.current) {
          setWeather({ error: true });
        }
      }
    }

    doFetch();
    const interval = setInterval(doFetch, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [member.id]);

  return weather;
}

function FamilyCard({ member, tick, onView }: { member: Member; tick: number; onView: () => void }) {
  const weather = useWeather(member);
  const [zoom, setZoom] = useState(false);
  const tod = getTimeOfDay(member.timezone);
  const call = getCallStatus(
    member.timezone,
    member.wakeHour,
    member.sleepHour,
  );
  const tz = safeTimezone(member.timezone);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const timeStr = useMemo(() => new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true }).format(new Date()), [tick, tz]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const dateStr = useMemo(() => new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "long", month: "short", day: "numeric" }).format(new Date()), [tick, tz]);

  const avatarColor = getAvatarColor(member.id);
  const initials = member.name[0].toUpperCase();

  return (
    <LinearGradient
      colors={GRADIENTS[tod]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={s.card}
    >
      <View style={s.cardTop}>
        <TouchableOpacity onPress={() => member.photoUri && setZoom(true)}>
          {member.photoUri ? (
            <Image source={{ uri: member.photoUri }} style={s.avatarCircle} />
          ) : (
            <View style={[s.avatarCircle, { backgroundColor: avatarColor }]}>
              <Text style={s.avatarInitial}>{initials}</Text>
            </View>
          )}
        </TouchableOpacity>
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

      <View style={s.locationRow}>
        <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.4)" />
        <Text style={s.location}>{member.city}, {member.country}</Text>
      </View>

      {weather === null ? (
        <ActivityIndicator
          color="rgba(255,255,255,0.4)"
          style={{ marginVertical: 10 }}
        />
      ) : weather.error ? (
        <View style={s.weatherRow}>
          <Ionicons
            name="warning-outline"
            size={18}
            color="rgba(255,255,255,0.5)"
          />
          <Text style={s.wLabel}>Weather unavailable</Text>
        </View>
      ) : (
        <View style={s.weatherRow}>
          <Ionicons
            name={weather.ionicon as any}
            size={22}
            color="rgba(255,255,255,0.7)"
          />
          <Text style={s.wTemp}>
            {weather.temp}
            {weather.unit}
          </Text>
          <Text style={s.wLabel}>{weather.label}</Text>
          {weather.severe && (
            <View style={s.alertBadge}>
              <Ionicons name="warning-outline" size={14} color="#fca5a5" />
            </View>
          )}
        </View>
      )}

      <View style={s.callRow}>
        <View style={[s.dot, { backgroundColor: call.dot }]} />
        <Text style={s.callLabel}>{call.label}</Text>
      </View>

      <TouchableOpacity
        style={{ marginTop: 10, backgroundColor: 'rgba(167,139,250,0.15)', borderRadius: 12, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(167,139,250,0.3)' }}
        onPress={onView}
        activeOpacity={0.75}
      >
        <Text style={{ color: '#a78bfa', fontWeight: '700', fontSize: 13 }}>View Profile</Text>
      </TouchableOpacity>

      <Modal visible={zoom} transparent animationType="fade">
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' }}
          activeOpacity={1}
          onPress={() => setZoom(false)}
        >
          <Image
            source={{ uri: member.photoUri! }}
            style={{ width: '90%', aspectRatio: 1, borderRadius: 16 }}
            resizeMode="cover"
          />
        </TouchableOpacity>
      </Modal>
    </LinearGradient>
  );
}

export default function HomeScreen() {
  const { members, loading: membersLoading } = useFirebaseMembers();
  const router = useRouter();
  const [tick, setTick] = useState(0);
  const [viewingMember, setViewingMember] = useState<Member | null>(null);
  const [localMembers, setLocalMembers] = useState<Member[]>([]);

  useEffect(() => { setLocalMembers(members); }, [members]);

  const displayMembers = localMembers;

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayMD = `${mm}-${dd}`;
    members.forEach(m => {
      if (m.birthday && m.birthday.slice(5) === todayMD) notifyBirthday(m, 'birthday');
      if (m.anniversary && m.anniversary.slice(5) === todayMD) notifyBirthday(m, 'anniversary');
      (m.importantDates || []).forEach(d => {
        if (d.date && d.date.slice(5) === todayMD) notifyBirthday({ ...m, name: m.name + ' — ' + d.label } as any, 'birthday');
      });
    });
  }, [members]);

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
        >
          {membersLoading ? (
            <ActivityIndicator color="#a78bfa" style={{ marginTop: 60 }} />
          ) : displayMembers.length === 0 ? (
            <View style={{ alignItems: "center", paddingTop: 80, gap: 14 }}>
              <Ionicons name="people-outline" size={56} color="rgba(255,255,255,0.12)" />
              <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 18, fontWeight: "700" }}>
                No connections yet
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.3)", fontSize: 14, textAlign: "center", lineHeight: 20, paddingHorizontal: 32 }}>
                Tap the + button to invite family members and friends.
              </Text>
            </View>
          ) : (
            displayMembers.map((m) => (
              <FamilyCard key={m.id} member={m} tick={tick} onView={() => setViewingMember(m)} />
            ))
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
      <TouchableOpacity
        style={{
          position: 'absolute',
          bottom: 98,
          right: 20,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: '#7c6af7',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#7c6af7',
          shadowOpacity: 0.45,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 10,
        }}
        onPress={() => router.push('/connections')}
        activeOpacity={0.8}
      >
        <Ionicons name="person-add-outline" size={24} color="white" />
      </TouchableOpacity>
      {viewingMember && (
        <PersonDetail
          member={viewingMember}
          visible={!!viewingMember}
          onClose={() => setViewingMember(null)}
          onUpdate={(updated) => {
            setLocalMembers((prev) => prev.map((m) => m.id === updated.id ? updated : m));
            setViewingMember(updated);
          }}
          onDelete={(id) => {
            setLocalMembers((prev) => prev.filter((m) => m.id !== id));
            setViewingMember(null);
          }}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#07080f" },
  scroll: { padding: 16, gap: 14 },
  card: { borderRadius: 22, padding: 20 },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarInitial: {
    color: "white",
    fontWeight: "700",
    fontSize: 20,
  },
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
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 10,
  },
  location: { fontSize: 12, color: "rgba(255,255,255,0.5)" },
  weatherRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    padding: 11,
    marginBottom: 10,
  },
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
