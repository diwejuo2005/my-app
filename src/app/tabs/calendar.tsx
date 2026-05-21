import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  SectionList,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Member, useMembers } from "../../context/MembersContext";

type CalendarEvent = {
  id: string;
  type: "birthday" | "anniversary" | "custom" | "holiday";
  label: string;
  date: Date;
  memberName: string;
  memberId: number;
  memberPhotoUri?: string;
  daysUntil: number;
};

type Section = {
  title: string;
  data: CalendarEvent[];
};

const EVENT_META: Record<
  CalendarEvent["type"],
  { icon: string; color: string }
> = {
  birthday: { icon: "gift-outline", color: "#a78bfa" },
  anniversary: { icon: "heart-outline", color: "#f472b6" },
  custom: { icon: "star-outline", color: "#34d399" },
  holiday: { icon: "flag-outline", color: "#60a5fa" },
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

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysBetween(a: Date, b: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / msPerDay);
}

function nextOccurrence(monthDay: { month: number; day: number }, today: Date): Date {
  const thisYear = new Date(today.getFullYear(), monthDay.month, monthDay.day);
  if (thisYear >= startOfDay(today)) return thisYear;
  return new Date(today.getFullYear() + 1, monthDay.month, monthDay.day);
}

function parseMonthDay(dateStr: string): { month: number; day: number } | null {
  const parts = dateStr.split("-");
  if (parts.length < 3) return null;
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  if (isNaN(month) || isNaN(day)) return null;
  return { month, day };
}

type HolidayRaw = {
  date: string;
  localName: string;
  name: string;
  countryCode: string;
};

async function fetchHolidays(year: number, countryCode: string): Promise<HolidayRaw[]> {
  try {
    const res = await fetch(
      `https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`
    );
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

function buildMemberEvents(members: Member[], today: Date, windowDays: number): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const todayStart = startOfDay(today);
  const windowEnd = new Date(todayStart.getTime() + windowDays * 24 * 60 * 60 * 1000);

  for (const m of members) {
    const addDateEvent = (
      dateStr: string,
      type: CalendarEvent["type"],
      label: string
    ) => {
      const md = parseMonthDay(dateStr);
      if (!md) return;
      const occurrence = nextOccurrence(md, todayStart);
      const days = daysBetween(todayStart, occurrence);
      if (days >= 0 && days < windowDays) {
        events.push({
          id: `${m.id}-${type}-${dateStr}`,
          type,
          label,
          date: occurrence,
          memberName: m.name,
          memberId: m.id,
          memberPhotoUri: m.photoUri,
          daysUntil: days,
        });
      }
    };

    if (m.birthday) addDateEvent(m.birthday, "birthday", `${m.name}'s Birthday`);
    if (m.anniversary) addDateEvent(m.anniversary, "anniversary", `${m.name}'s Anniversary`);
    if (m.importantDates) {
      for (const imp of m.importantDates) {
        if (imp.date && imp.label) addDateEvent(imp.date, "custom", imp.label);
      }
    }
  }

  return events;
}

async function buildHolidayEvents(
  members: Member[],
  today: Date,
  windowDays: number
): Promise<CalendarEvent[]> {
  const todayStart = startOfDay(today);
  const countryCodes = [...new Set(members.map((m) => m.country).filter(Boolean))];
  const events: CalendarEvent[] = [];

  const years = [today.getFullYear(), today.getFullYear() + 1];

  await Promise.all(
    countryCodes.flatMap((code) =>
      years.map(async (year) => {
        const holidays = await fetchHolidays(year, code);
        for (const h of holidays) {
          const parts = h.date.split("-");
          if (parts.length < 3) continue;
          const hDate = new Date(
            parseInt(parts[0], 10),
            parseInt(parts[1], 10) - 1,
            parseInt(parts[2], 10)
          );
          const days = daysBetween(todayStart, hDate);
          if (days >= 0 && days < windowDays) {
            events.push({
              id: `holiday-${h.countryCode}-${h.date}`,
              type: "holiday",
              label: h.localName || h.name,
              date: hDate,
              memberName: h.countryCode,
              memberId: -1,
              daysUntil: days,
            });
          }
        }
      })
    )
  );

  // Deduplicate by id
  const seen = new Set<string>();
  return events.filter((e) => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });
}

function groupIntoSections(events: CalendarEvent[]): Section[] {
  const sorted = [...events].sort((a, b) => a.daysUntil - b.daysUntil);

  const today: CalendarEvent[] = [];
  const thisWeek: CalendarEvent[] = [];
  const thisMonth: CalendarEvent[] = [];
  const comingUp: CalendarEvent[] = [];

  for (const e of sorted) {
    if (e.daysUntil === 0) today.push(e);
    else if (e.daysUntil <= 7) thisWeek.push(e);
    else if (e.daysUntil <= 30) thisMonth.push(e);
    else comingUp.push(e);
  }

  const sections: Section[] = [];
  if (today.length) sections.push({ title: "Today", data: today });
  if (thisWeek.length) sections.push({ title: "This Week", data: thisWeek });
  if (thisMonth.length) sections.push({ title: "This Month", data: thisMonth });
  if (comingUp.length) sections.push({ title: "Coming Up", data: comingUp });
  return sections;
}

function DaysUntilBadge({
  daysUntil,
  color,
}: {
  daysUntil: number;
  color: string;
}) {
  let label = "";
  if (daysUntil === 0) label = "Today";
  else if (daysUntil === 1) label = "Tomorrow";
  else label = `In ${daysUntil} days`;

  return (
    <View
      style={[
        s.badge,
        { backgroundColor: color + "22", borderColor: color + "55" },
      ]}
    >
      <Text style={[s.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

function EventCard({ item }: { item: CalendarEvent }) {
  const meta = EVENT_META[item.type];
  const initial = item.memberName?.[0]?.toUpperCase() ?? "?";
  const avatarColor = item.memberId > 0 ? getAvatarColor(item.memberId) : "#2d3a5a";

  return (
    <View style={s.card}>
      <View style={[s.iconCircle, { backgroundColor: meta.color + "22" }]}>
        <Ionicons name={meta.icon as any} size={20} color={meta.color} />
      </View>
      <View style={s.cardMiddle}>
        <Text style={s.cardLabel}>{item.label}</Text>
        <Text style={s.cardSub}>{item.memberName}</Text>
      </View>
      <DaysUntilBadge daysUntil={item.daysUntil} color={meta.color} />
    </View>
  );
}

export default function CalendarScreen() {
  const { members } = useMembers();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const today = new Date();
      const windowDays = 90;
      const memberEvents = buildMemberEvents(members, today, windowDays);
      const holidayEvents = await buildHolidayEvents(members, today, windowDays);
      const allEvents = [...memberEvents, ...holidayEvents];
      setSections(groupIntoSections(allEvents));
      setLoading(false);
    }
    load();
  }, [members]);

  if (loading) {
    return (
      <View style={[s.root, s.center]}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator color="#a78bfa" size="large" />
        <Text style={s.loadingText}>Loading calendar...</Text>
      </View>
    );
  }

  if (sections.length === 0) {
    return (
      <View style={[s.root, s.center]}>
        <StatusBar barStyle="light-content" />
        <Ionicons name="calendar-outline" size={48} color="rgba(255,255,255,0.15)" />
        <Text style={s.emptyText}>
          No upcoming events in the next 90 days. Add birthdays in the People tab.
        </Text>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderSectionHeader={({ section }) => (
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>{section.title}</Text>
          </View>
        )}
        renderItem={({ item }) => <EventCard item={item} />}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#07080f" },
  center: { alignItems: "center", justifyContent: "center", gap: 16, padding: 32 },
  list: { padding: 16, paddingBottom: 100 },
  loadingText: { color: "rgba(255,255,255,0.4)", fontSize: 14, marginTop: 8 },
  emptyText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  sectionHeader: {
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginTop: 8,
  },
  sectionTitle: {
    color: "#a78bfa",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  cardMiddle: { flex: 1 },
  cardLabel: {
    color: "#f0f0f6",
    fontSize: 15,
    fontWeight: "700",
  },
  cardSub: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
    marginTop: 2,
  },
  badge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});
