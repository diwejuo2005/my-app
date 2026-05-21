import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as Notifications from "expo-notifications";

// ─── Storage keys ─────────────────────────────────────────────────────────────

const MY_MOOD_KEY = "ensemble_my_mood";
const MY_NOTES_KEY = "ensemble_my_notes";
const REMINDER_KEY = "ensemble_mood_reminder";
type MoodMap = Record<string, number>; // YYYY-MM-DD → 1-5
type NotesMap = Record<string, string>; // weekStartISO → string

// ─── Descriptor labels ────────────────────────────────────────────────────────

const MOOD_LABELS: Record<number, string> = {
  1: "Struggling",
  2: "Low",
  3: "Okay",
  4: "Good",
  5: "Thriving",
};

// ─── Date helpers ─────────────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

/** Monday of the current week as ISO date string */
function weekStartStr(): string {
  const d = new Date();
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

/** Returns Mon–Sun ISO date strings for the current week */
function currentWeekDays(): string[] {
  const monday = new Date(weekStartStr() + "T12:00:00");
  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d.toISOString().split("T")[0]);
  }
  return days;
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function barColor(score: number | undefined): string {
  if (!score) return "rgba(255,255,255,0.12)";
  if (score <= 2) return "#f87171";
  if (score === 3) return "#fbbf24";
  return "#34d399";
}

// ─── Week bar graph ───────────────────────────────────────────────────────────

function WeekBarGraph({
  scores,
  highlightToday = true,
}: {
  scores: Record<string, number>;
  highlightToday?: boolean;
}) {
  const days = currentWeekDays();
  const today = todayStr();
  const MAX_BAR_H = 80;

  return (
    <View style={graph.container}>
      {days.map((day, idx) => {
        const score = scores[day];
        const barH = score ? (score / 5) * MAX_BAR_H : 4;
        const isToday = highlightToday && day === today;
        const color = barColor(score);

        return (
          <View key={day} style={graph.col}>
            {/* Score label above bar */}
            <Text style={graph.scoreLabel}>{score ? String(score) : ""}</Text>

            {/* Bar wrapper for bottom-alignment */}
            <View style={{ height: MAX_BAR_H, justifyContent: "flex-end" }}>
              <View
                style={[
                  graph.bar,
                  {
                    height: barH,
                    backgroundColor: color,
                    borderWidth: isToday ? 2 : 0,
                    borderColor: "#a78bfa",
                    borderRadius: 6,
                  },
                ]}
              />
            </View>

            {/* Day label */}
            <Text style={[graph.dayLabel, isToday && graph.dayLabelToday]}>
              {DAY_LABELS[idx]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const graph = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 4,
  },
  col: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  scoreLabel: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 10,
    fontWeight: "700",
    height: 14,
  },
  bar: {
    width: "70%",
    minHeight: 4,
    borderRadius: 6,
  },
  dayLabel: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 10,
    fontWeight: "500",
    marginTop: 2,
  },
  dayLabelToday: {
    color: "#a78bfa",
    fontWeight: "700",
  },
});

// ─── Stats chips ──────────────────────────────────────────────────────────────

function StatsRow({ scores }: { scores: Record<string, number> }) {
  const days = currentWeekDays();
  const logged = days.filter((d) => scores[d] !== undefined);
  const avg =
    logged.length > 0
      ? (logged.reduce((sum, d) => sum + scores[d], 0) / logged.length).toFixed(1)
      : null;

  return (
    <View style={stat.row}>
      <View style={stat.chip}>
        <Text style={stat.chipText}>
          Weekly avg: {avg !== null ? avg : "—"}
        </Text>
      </View>
      <View style={stat.chip}>
        <Text style={stat.chipText}>
          Days logged: {logged.length} / 7
        </Text>
      </View>
    </View>
  );
}

const stat = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  chip: {
    backgroundColor: "rgba(167,139,250,0.12)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(167,139,250,0.25)",
  },
  chipText: {
    color: "#a78bfa",
    fontSize: 12,
    fontWeight: "600",
  },
});

// ─── Tab 1: My Mood ───────────────────────────────────────────────────────────

function MyMoodTab() {
  const [moodMap, setMoodMap] = useState<MoodMap>({});
  const [notesMap, setNotesMap] = useState<NotesMap>({});
  const [reminderOn, setReminderOn] = useState(false);
  const today = todayStr();
  const weekStart = weekStartStr();
  const todayScore = moodMap[today];
  const weekNote = notesMap[weekStart] ?? "";
  const [noteText, setNoteText] = useState(weekNote);
  const noteInitRef = useRef(false);

  useEffect(() => {
    AsyncStorage.multiGet([MY_MOOD_KEY, MY_NOTES_KEY, REMINDER_KEY]).then(
      ([[, mood], [, notes], [, reminder]]) => {
        if (mood) {
          try { setMoodMap(JSON.parse(mood)); } catch {}
        }
        if (notes) {
          try {
            const parsed: NotesMap = JSON.parse(notes);
            setNotesMap(parsed);
            if (!noteInitRef.current) {
              setNoteText(parsed[weekStart] ?? "");
              noteInitRef.current = true;
            }
          } catch {}
        }
        if (reminder) {
          setReminderOn(reminder === "true");
        }
      }
    );
  }, []);

  async function logMood(score: number) {
    const newMap: MoodMap = { ...moodMap, [today]: score };
    setMoodMap(newMap);
    await AsyncStorage.setItem(MY_MOOD_KEY, JSON.stringify(newMap));
  }

  async function saveNote() {
    const newMap: NotesMap = { ...notesMap, [weekStart]: noteText };
    setNotesMap(newMap);
    await AsyncStorage.setItem(MY_NOTES_KEY, JSON.stringify(newMap));
  }

  async function toggleReminder(val: boolean) {
    setReminderOn(val);
    await AsyncStorage.setItem(REMINDER_KEY, val ? "true" : "false");
    if (val) {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status === "granted") {
        await Notifications.scheduleNotificationAsync({
          content: { title: "Ensemble", body: "How are you feeling today?" },
          trigger: { type: "daily", hour: 20, minute: 0 } as Parameters<typeof Notifications.scheduleNotificationAsync>[0]["trigger"],
        });
      }
    } else {
      await Notifications.cancelAllScheduledNotificationsAsync();
    }
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 20 }}
    >
      {/* Log today's mood */}
      <View style={mood.card}>
        <Text style={mood.sectionTitle}>How are you feeling today?</Text>
        <View style={mood.scoreRow}>
          {([1, 2, 3, 4, 5] as const).map((n) => {
            const active = todayScore === n;
            return (
              <TouchableOpacity
                key={n}
                style={[mood.scoreBtn, active && mood.scoreBtnActive]}
                onPress={() => logMood(n)}
                activeOpacity={0.7}
              >
                <Text style={[mood.scoreNum, active && mood.scoreNumActive]}>
                  {n}
                </Text>
                <Text style={[mood.scoreDesc, active && mood.scoreDescActive]}>
                  {MOOD_LABELS[n]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* This week's graph */}
      <View style={mood.card}>
        <Text style={mood.sectionTitle}>This week</Text>
        <WeekBarGraph scores={moodMap} highlightToday />
        <StatsRow scores={moodMap} />
      </View>

      {/* Notes */}
      <View style={mood.card}>
        <Text style={mood.sectionTitle}>This week's notes</Text>
        <TextInput
          style={mood.noteInput}
          multiline
          placeholder="How's your week going? What's on your mind?"
          placeholderTextColor="rgba(255,255,255,0.25)"
          value={noteText}
          onChangeText={setNoteText}
          onBlur={saveNote}
        />
      </View>

      {/* Daily reminder */}
      <View style={[mood.card, mood.reminderRow]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Ionicons name="notifications-outline" size={20} color="#a78bfa" />
          <Text style={mood.reminderLabel}>Daily mood reminder</Text>
        </View>
        <Switch
          value={reminderOn}
          onValueChange={toggleReminder}
          trackColor={{ false: "rgba(255,255,255,0.15)", true: "#7c6af7" }}
          thumbColor={reminderOn ? "#a78bfa" : "rgba(255,255,255,0.6)"}
        />
      </View>
    </ScrollView>
  );
}

const mood = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    gap: 14,
  },
  sectionTitle: {
    color: "#f0f0f6",
    fontSize: 15,
    fontWeight: "700",
  },
  scoreRow: {
    flexDirection: "row",
    gap: 6,
  },
  scoreBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(255,255,255,0.04)",
    gap: 4,
  },
  scoreBtnActive: {
    backgroundColor: "#a78bfa",
    borderColor: "#a78bfa",
  },
  scoreNum: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 18,
    fontWeight: "700",
  },
  scoreNumActive: {
    color: "white",
  },
  scoreDesc: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 9,
    fontWeight: "600",
    textAlign: "center",
  },
  scoreDescActive: {
    color: "rgba(255,255,255,0.9)",
  },
  noteInput: {
    color: "#f0f0f6",
    fontSize: 14,
    lineHeight: 20,
    minHeight: 80,
    textAlignVertical: "top",
    paddingTop: 0,
  },
  reminderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  reminderLabel: {
    color: "#f0f0f6",
    fontSize: 15,
    fontWeight: "600",
  },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ConnectScreen() {
  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />
      <MyMoodTab />
    </View>
  );
}

// ─── Root styles ──────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#07080f",
  },
});
