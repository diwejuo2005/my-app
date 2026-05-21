import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CalendarEvent = {
  id: string;
  title: string;
  date: string; // "YYYY-MM-DD"
  startTime: string; // "HH:MM" 24h
  endTime: string; // "HH:MM" 24h
  color: string;
  notes?: string;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = "ensemble_calendar";
const EVENT_COLORS = [
  "#7c6af7",
  "#f472b6",
  "#34d399",
  "#60a5fa",
  "#fbbf24",
  "#f87171",
];

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// Grid: 6 AM (hour 6) → 11 PM (hour 23) — 18 hours, each hour = 60px
const GRID_START_HOUR = 6;
const GRID_END_HOUR = 23;
const HOUR_HEIGHT = 60; // px per hour
const TIME_COL_WIDTH = 44;
const ACCENT = "#a78bfa";
const BG = "#07080f";

const SCREEN_WIDTH = Dimensions.get("window").width;
// Day column width accounts for time label column + 1px borders
const DAY_COL_WIDTH = (SCREEN_WIDTH - TIME_COL_WIDTH) / 7;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Get Sunday of the week containing `d`. */
function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() - copy.getDay());
  return copy;
}

/** Add `days` days to a Date, returning a new Date. */
function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/** Parse "HH:MM" into total minutes from midnight. */
function timeToMinutes(t: string): number {
  const parts = t.split(":");
  if (parts.length < 2) return 0;
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

/** Format "HH:MM" 24h → "h:MM AM/PM". */
function formatTime12(t: string): string {
  const parts = t.split(":");
  if (parts.length < 2) return t;
  let h = parseInt(parts[0], 10);
  const m = parts[1];
  const ampm = h >= 12 ? "PM" : "AM";
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${m} ${ampm}`;
}

/** Validate "HH:MM" string. */
function isValidTime(t: string): boolean {
  const match = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return false;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

/** Y-offset in px from the top of the grid for a given hour (0–23) and minute. */
function timeToY(hour: number, minute: number): number {
  return (hour - GRID_START_HOUR) * HOUR_HEIGHT + (minute / 60) * HOUR_HEIGHT;
}

// ---------------------------------------------------------------------------
// AsyncStorage helpers
// ---------------------------------------------------------------------------

async function loadEvents(): Promise<CalendarEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CalendarEvent[];
  } catch {
    return [];
  }
}

async function saveEvents(events: CalendarEvent[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

// Time-picker row — 12-hour format with AM/PM toggle
function TimePicker({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  const parts = value.split(":");
  const h24 = parseInt(parts[0] ?? "8", 10) || 0;
  const m = parseInt(parts[1] ?? "0", 10) || 0;

  const isPM = h24 >= 12;
  const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;

  function update(newH12: number, newM: number, newIsPM: boolean) {
    let ch = newH12;
    if (ch < 1) ch = 12;
    if (ch > 12) ch = 1;
    let cm = newM;
    if (cm < 0) cm = 55;
    if (cm > 55) cm = 0;
    const h24out = newIsPM ? (ch === 12 ? 12 : ch + 12) : (ch === 12 ? 0 : ch);
    onChange(`${String(h24out).padStart(2, "0")}:${String(cm).padStart(2, "0")}`);
  }

  const HIT = { top: 6, bottom: 6, left: 6, right: 6 };

  return (
    <View style={tp.row}>
      <Text style={tp.label}>{label}</Text>
      <View style={tp.controls}>
        <TouchableOpacity style={tp.btn} onPress={() => update(h12 - 1, m, isPM)} hitSlop={HIT}>
          <Ionicons name="remove" size={16} color="#fff" />
        </TouchableOpacity>
        <Text style={tp.val}>{String(h12).padStart(2, "0")}</Text>
        <TouchableOpacity style={tp.btn} onPress={() => update(h12 + 1, m, isPM)} hitSlop={HIT}>
          <Ionicons name="add" size={16} color="#fff" />
        </TouchableOpacity>

        <Text style={tp.colon}>:</Text>

        <TouchableOpacity style={tp.btn} onPress={() => update(h12, m - 5, isPM)} hitSlop={HIT}>
          <Ionicons name="remove" size={16} color="#fff" />
        </TouchableOpacity>
        <Text style={tp.val}>{String(m).padStart(2, "0")}</Text>
        <TouchableOpacity style={tp.btn} onPress={() => update(h12, m + 5, isPM)} hitSlop={HIT}>
          <Ionicons name="add" size={16} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity style={tp.ampmBtn} onPress={() => update(h12, m, !isPM)}>
          <Text style={tp.ampmTxt}>{isPM ? "PM" : "AM"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const tp = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  label: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 13,
    width: 52,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  btn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  val: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    width: 28,
    textAlign: "center",
  },
  colon: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    marginHorizontal: 2,
  },
  ampmBtn: {
    backgroundColor: "#7c6af7",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginLeft: 4,
  },
  ampmTxt: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});

// ---------------------------------------------------------------------------
// Date picker modal (simple month/day/year pager)
// ---------------------------------------------------------------------------

function DatePickerModal({
  visible,
  value,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  value: string; // YYYY-MM-DD
  onConfirm: (d: string) => void;
  onCancel: () => void;
}) {
  const parts = value.split("-");
  const initY = parseInt(parts[0], 10) || new Date().getFullYear();
  const initM = parseInt(parts[1], 10) - 1 || 0;
  const initD = parseInt(parts[2], 10) || 1;

  const [year, setYear] = useState(initY);
  const [month, setMonth] = useState(initM); // 0-indexed
  const [day, setDay] = useState(initD);

  useEffect(() => {
    if (visible) {
      const p = value.split("-");
      setYear(parseInt(p[0], 10) || new Date().getFullYear());
      setMonth((parseInt(p[1], 10) || 1) - 1);
      setDay(parseInt(p[2], 10) || 1);
    }
  }, [visible, value]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const clampedDay = Math.min(day, daysInMonth);

  function confirm() {
    const d = new Date(year, month, clampedDay);
    onConfirm(toDateString(d));
  }

  function adj(
    setter: (v: number) => void,
    val: number,
    delta: number,
    min: number,
    max: number
  ) {
    let next = val + delta;
    if (next < min) next = max;
    if (next > max) next = min;
    setter(next);
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={dpm.overlay}>
        <View style={dpm.box}>
          <Text style={dpm.title}>Select Date</Text>

          <View style={dpm.row}>
            {/* Month */}
            <View style={dpm.col}>
              <Text style={dpm.colLabel}>Month</Text>
              <TouchableOpacity
                onPress={() => adj(setMonth, month, -1, 0, 11)}
                style={dpm.arrow}
              >
                <Ionicons name="chevron-up" size={20} color="#fff" />
              </TouchableOpacity>
              <Text style={dpm.val}>{MONTH_NAMES[month].slice(0, 3)}</Text>
              <TouchableOpacity
                onPress={() => adj(setMonth, month, 1, 0, 11)}
                style={dpm.arrow}
              >
                <Ionicons name="chevron-down" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Day */}
            <View style={dpm.col}>
              <Text style={dpm.colLabel}>Day</Text>
              <TouchableOpacity
                onPress={() => adj(setDay, clampedDay, -1, 1, daysInMonth)}
                style={dpm.arrow}
              >
                <Ionicons name="chevron-up" size={20} color="#fff" />
              </TouchableOpacity>
              <Text style={dpm.val}>{String(clampedDay).padStart(2, "0")}</Text>
              <TouchableOpacity
                onPress={() => adj(setDay, clampedDay, 1, 1, daysInMonth)}
                style={dpm.arrow}
              >
                <Ionicons name="chevron-down" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Year */}
            <View style={dpm.col}>
              <Text style={dpm.colLabel}>Year</Text>
              <TouchableOpacity
                onPress={() => adj(setYear, year, -1, 2020, 2035)}
                style={dpm.arrow}
              >
                <Ionicons name="chevron-up" size={20} color="#fff" />
              </TouchableOpacity>
              <Text style={dpm.val}>{year}</Text>
              <TouchableOpacity
                onPress={() => adj(setYear, year, 1, 2020, 2035)}
                style={dpm.arrow}
              >
                <Ionicons name="chevron-down" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={dpm.actions}>
            <TouchableOpacity style={dpm.cancelBtn} onPress={onCancel}>
              <Text style={dpm.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={dpm.confirmBtn} onPress={confirm}>
              <Text style={dpm.confirmTxt}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const dpm = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  box: {
    backgroundColor: "#1a1b2e",
    borderRadius: 20,
    padding: 24,
    width: 320,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  title: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 20,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 24,
  },
  col: { alignItems: "center", gap: 4 },
  colLabel: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 11,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  arrow: {
    padding: 4,
  },
  val: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    minWidth: 52,
    textAlign: "center",
    paddingVertical: 4,
  },
  actions: { flexDirection: "row", gap: 12 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
  },
  cancelTxt: { color: "rgba(255,255,255,0.7)", fontSize: 15, fontWeight: "600" },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: ACCENT,
    alignItems: "center",
  },
  confirmTxt: { color: "#fff", fontSize: 15, fontWeight: "700" },
});

// ---------------------------------------------------------------------------
// Event Modal (Add / Edit)
// ---------------------------------------------------------------------------

type ModalMode = "add" | "edit";

type EventModalProps = {
  visible: boolean;
  mode: ModalMode;
  initial: Partial<CalendarEvent>;
  onSave: (ev: CalendarEvent) => void;
  onDelete: (id: string) => void;
  onCancel: () => void;
};

function EventModal({
  visible,
  mode,
  initial,
  onSave,
  onDelete,
  onCancel,
}: EventModalProps) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(toDateString(new Date()));
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("09:00");
  const [color, setColor] = useState(EVENT_COLORS[0]);
  const [notes, setNotes] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      setTitle(initial.title ?? "");
      setDate(initial.date ?? toDateString(new Date()));
      setStartTime(initial.startTime ?? "08:00");
      setEndTime(initial.endTime ?? "09:00");
      setColor(initial.color ?? EVENT_COLORS[0]);
      setNotes(initial.notes ?? "");
      setShowDatePicker(false);
    }
  }, [visible, initial]);

  function handleSave() {
    if (!title.trim()) {
      Alert.alert("Title required", "Please enter a title for this event.");
      return;
    }
    if (!isValidTime(startTime)) {
      Alert.alert("Invalid start time", "Enter time as HH:MM (e.g. 09:00).");
      return;
    }
    if (!isValidTime(endTime)) {
      Alert.alert("Invalid end time", "Enter time as HH:MM (e.g. 10:00).");
      return;
    }
    if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
      Alert.alert("Invalid times", "End time must be after start time.");
      return;
    }
    const ev: CalendarEvent = {
      id: initial.id ?? genId(),
      title: title.trim(),
      date,
      startTime,
      endTime,
      color,
      notes: notes.trim() || undefined,
    };
    onSave(ev);
  }

  function handleDelete() {
    if (!initial.id) return;
    Alert.alert("Delete event?", `"${title}" will be removed.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => onDelete(initial.id!),
      },
    ]);
  }

  // Format date for display: "Wed, May 21"
  function formatDate(ds: string): string {
    const parts = ds.split("-");
    if (parts.length < 3) return ds;
    const d = new Date(
      parseInt(parts[0], 10),
      parseInt(parts[1], 10) - 1,
      parseInt(parts[2], 10)
    );
    return `${DAY_LABELS[d.getDay()]}, ${MONTH_NAMES[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
  }

  return (
    <>
      <DatePickerModal
        visible={showDatePicker}
        value={date}
        onConfirm={(d) => {
          setDate(d);
          setShowDatePicker(false);
        }}
        onCancel={() => setShowDatePicker(false)}
      />
      <Modal
        visible={visible && !showDatePicker}
        transparent
        animationType="slide"
      >
        <Pressable style={em.overlay} onPress={onCancel}>
          <Pressable style={em.sheet} onPress={() => {}}>
            {/* Handle bar */}
            <View style={em.handle} />

            <Text style={em.heading}>
              {mode === "add" ? "New Event" : "Edit Event"}
            </Text>

            {/* Title */}
            <Text style={em.fieldLabel}>Title</Text>
            <TextInput
              style={em.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Event title"
              placeholderTextColor="rgba(255,255,255,0.3)"
              maxLength={80}
              returnKeyType="done"
            />

            {/* Date */}
            <Text style={em.fieldLabel}>Date</Text>
            <TouchableOpacity
              style={em.dateRow}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons
                name="calendar-outline"
                size={16}
                color={ACCENT}
                style={{ marginRight: 8 }}
              />
              <Text style={em.dateText}>{formatDate(date)}</Text>
              <Ionicons
                name="chevron-forward"
                size={14}
                color="rgba(255,255,255,0.3)"
              />
            </TouchableOpacity>

            {/* Times */}
            <Text style={em.fieldLabel}>Time</Text>
            <TimePicker
              label="Start"
              value={startTime}
              onChange={setStartTime}
            />
            <TimePicker label="End" value={endTime} onChange={setEndTime} />

            {/* Color */}
            <Text style={em.fieldLabel}>Color</Text>
            <View style={em.colorRow}>
              {EVENT_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setColor(c)}
                  style={[
                    em.swatch,
                    { backgroundColor: c },
                    color === c && em.swatchSelected,
                  ]}
                >
                  {color === c && (
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Notes */}
            <Text style={em.fieldLabel}>Notes (optional)</Text>
            <TextInput
              style={[em.input, em.inputMulti]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add notes…"
              placeholderTextColor="rgba(255,255,255,0.3)"
              multiline
              numberOfLines={3}
              maxLength={500}
            />

            {/* Actions */}
            <View style={em.actions}>
              {mode === "edit" && (
                <TouchableOpacity
                  style={em.deleteBtn}
                  onPress={handleDelete}
                >
                  <Ionicons name="trash-outline" size={18} color="#f87171" />
                </TouchableOpacity>
              )}
              <TouchableOpacity style={em.cancelBtn} onPress={onCancel}>
                <Text style={em.cancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={em.saveBtn} onPress={handleSave}>
                <Text style={em.saveTxt}>
                  {mode === "add" ? "Add" : "Save"}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const em = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#0e0f1e",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignSelf: "center",
    marginBottom: 16,
  },
  heading: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 20,
    textAlign: "center",
  },
  fieldLabel: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 12,
    color: "#fff",
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  inputMulti: {
    height: 72,
    textAlignVertical: "top",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  dateText: {
    color: "#fff",
    fontSize: 15,
    flex: 1,
  },
  colorRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  swatchSelected: {
    borderWidth: 2,
    borderColor: "#fff",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
    alignItems: "center",
  },
  deleteBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(248,113,113,0.12)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.25)",
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
  },
  cancelTxt: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 15,
    fontWeight: "600",
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: ACCENT,
    alignItems: "center",
  },
  saveTxt: { color: "#fff", fontSize: 15, fontWeight: "700" },
});

// ---------------------------------------------------------------------------
// Week header
// ---------------------------------------------------------------------------

type WeekHeaderProps = {
  weekDays: Date[];
  todayStr: string;
  onPrev: () => void;
  onNext: () => void;
};

function WeekHeader({ weekDays, todayStr, onPrev, onNext }: WeekHeaderProps) {
  const firstDay = weekDays[0];
  const lastDay = weekDays[6];

  // Determine displayed month(s)
  let monthLabel: string;
  if (firstDay.getMonth() === lastDay.getMonth()) {
    monthLabel = `${MONTH_NAMES[firstDay.getMonth()]} ${firstDay.getFullYear()}`;
  } else {
    const mA = MONTH_NAMES[firstDay.getMonth()].slice(0, 3);
    const mB = MONTH_NAMES[lastDay.getMonth()].slice(0, 3);
    const yr =
      firstDay.getFullYear() === lastDay.getFullYear()
        ? ` ${firstDay.getFullYear()}`
        : ` ${firstDay.getFullYear()} / ${lastDay.getFullYear()}`;
    monthLabel = `${mA} – ${mB}${yr}`;
  }

  return (
    <View style={wh.container}>
      {/* Month/year row */}
      <View style={wh.monthRow}>
        <TouchableOpacity style={wh.arrow} onPress={onPrev} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={20} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>
        <Text style={wh.monthLabel}>{monthLabel}</Text>
        <TouchableOpacity style={wh.arrow} onPress={onNext} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>
      </View>

      {/* Day columns row */}
      <View style={wh.daysRow}>
        {/* Spacer for time column */}
        <View style={{ width: TIME_COL_WIDTH }} />
        {weekDays.map((d, i) => {
          const ds = toDateString(d);
          const isToday = ds === todayStr;
          return (
            <View key={i} style={wh.dayCol}>
              <Text style={wh.dayName}>{DAY_LABELS[i]}</Text>
              <View
                style={[
                  wh.dateBubble,
                  isToday && { backgroundColor: ACCENT },
                ]}
              >
                <Text
                  style={[
                    wh.dateNum,
                    isToday && { color: "#fff", fontWeight: "800" },
                  ]}
                >
                  {d.getDate()}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const wh = StyleSheet.create({
  container: {
    backgroundColor: BG,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
    paddingTop: Platform.OS === "ios" ? 48 : 24,
  },
  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  arrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  monthLabel: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  daysRow: {
    flexDirection: "row",
    paddingBottom: 8,
  },
  dayCol: {
    width: DAY_COL_WIDTH,
    alignItems: "center",
    gap: 2,
  },
  dayName: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  dateBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  dateNum: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
    fontWeight: "600",
  },
});

// ---------------------------------------------------------------------------
// Event block (inside time grid)
// ---------------------------------------------------------------------------

type EventBlockProps = {
  event: CalendarEvent;
  siblingIndex: number;
  totalSiblings: number;
  onPress: (ev: CalendarEvent) => void;
  key?: string | number;
};

function EventBlock({ event, siblingIndex, totalSiblings, onPress }: EventBlockProps) {
  const startParts = event.startTime.split(":");
  const endParts = event.endTime.split(":");
  const startH = parseInt(startParts[0], 10);
  const startM = parseInt(startParts[1], 10);
  const endH = parseInt(endParts[0], 10);
  const endM = parseInt(endParts[1], 10);

  const top = timeToY(startH, startM);
  const height = Math.max(
    timeToY(endH, endM) - top,
    22 // minimum visible height
  );

  // For overlapping events: tile horizontally
  const widthFraction = totalSiblings > 1 ? 0.88 / totalSiblings : 0.92;
  const width = DAY_COL_WIDTH * widthFraction;
  const left = siblingIndex * (DAY_COL_WIDTH * (0.88 / totalSiblings));

  return (
    <TouchableOpacity
      style={[
        eb.block,
        {
          top,
          height,
          width,
          left,
          backgroundColor: event.color + "D9", // 85% opacity
          borderLeftColor: event.color,
        },
      ]}
      onPress={() => onPress(event)}
      activeOpacity={0.75}
    >
      <Text style={eb.title} numberOfLines={height > 40 ? 2 : 1}>
        {event.title}
      </Text>
      {height > 38 && (
        <Text style={eb.time}>
          {formatTime12(event.startTime)}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const eb = StyleSheet.create({
  block: {
    position: "absolute",
    borderRadius: 5,
    borderLeftWidth: 3,
    paddingHorizontal: 4,
    paddingVertical: 2,
    overflow: "hidden",
  },
  title: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 14,
  },
  time: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 9,
    marginTop: 1,
  },
});

// ---------------------------------------------------------------------------
// Time grid
// ---------------------------------------------------------------------------

type TimeGridProps = {
  weekDays: Date[];
  events: CalendarEvent[];
  onPressSlot: (date: string, hour: number) => void;
  onPressEvent: (ev: CalendarEvent) => void;
};

function TimeGrid({ weekDays, events, onPressSlot, onPressEvent }: TimeGridProps) {
  const hours: number[] = [];
  for (let h = GRID_START_HOUR; h <= GRID_END_HOUR; h++) hours.push(h);

  const totalHeight = (GRID_END_HOUR - GRID_START_HOUR + 1) * HOUR_HEIGHT;

  // Map each day date-string to events for that day
  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const ev of events) {
      if (!map[ev.date]) map[ev.date] = [];
      map[ev.date].push(ev);
    }
    return map;
  }, [events]);

  return (
    <ScrollView
      style={tg.scroll}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <View style={{ height: totalHeight, flexDirection: "row" }}>
        {/* Time labels column */}
        <View style={tg.timeCol}>
          {hours.map((h) => (
            <View key={h} style={tg.hourLabelRow}>
              <Text style={tg.hourLabel}>
                {h === 0
                  ? "12 AM"
                  : h < 12
                  ? `${h} AM`
                  : h === 12
                  ? "12 PM"
                  : `${h - 12} PM`}
              </Text>
            </View>
          ))}
        </View>

        {/* Day columns */}
        {weekDays.map((d, dayIdx) => {
          const ds = toDateString(d);
          const dayEvents = eventsByDay[ds] ?? [];

          return (
            <View key={dayIdx} style={[tg.dayCol, { width: DAY_COL_WIDTH }]}>
              {/* Hour lines + tap targets */}
              {hours.map((h) => (
                <TouchableOpacity
                  key={h}
                  style={tg.hourSlot}
                  onPress={() => onPressSlot(ds, h)}
                  activeOpacity={0.6}
                />
              ))}

              {/* Event blocks (absolutely positioned) */}
              {dayEvents.map((ev, evIdx) => (
                <EventBlock
                  key={ev.id}
                  event={ev}
                  siblingIndex={evIdx}
                  totalSiblings={dayEvents.length}
                  onPress={onPressEvent}
                />
              ))}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const tg = StyleSheet.create({
  scroll: { flex: 1 },
  timeCol: {
    width: TIME_COL_WIDTH,
  },
  hourLabelRow: {
    height: HOUR_HEIGHT,
    justifyContent: "flex-start",
    paddingTop: 2,
    paddingRight: 6,
    alignItems: "flex-end",
    borderTopWidth: 0,
  },
  hourLabel: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 10,
    fontWeight: "500",
  },
  dayCol: {
    borderLeftWidth: 1,
    borderLeftColor: "rgba(255,255,255,0.06)",
    position: "relative",
  },
  hourSlot: {
    height: HOUR_HEIGHT,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
});

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function CalendarScreen() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("add");
  const [modalInitial, setModalInitial] = useState<Partial<CalendarEvent>>({});

  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => toDateString(today), [today]);

  // Compute the 7 days of the currently displayed week
  const weekDays = useMemo<Date[]>(() => {
    const base = startOfWeek(today);
    const shifted = addDays(base, weekOffset * 7);
    return Array.from({ length: 7 }, (_, i) => addDays(shifted, i));
  }, [today, weekOffset]);

  // Load events from storage
  useEffect(() => {
    loadEvents().then(setEvents);
  }, []);

  async function persistEvents(updated: CalendarEvent[]) {
    setEvents(updated);
    await saveEvents(updated);
  }

  const handleSave = useCallback(
    async (ev: CalendarEvent) => {
      setModalVisible(false);
      const updated =
        modalMode === "add"
          ? [...events, ev]
          : events.map((e) => (e.id === ev.id ? ev : e));
      await persistEvents(updated);
    },
    [events, modalMode]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      setModalVisible(false);
      await persistEvents(events.filter((e) => e.id !== id));
    },
    [events]
  );

  function openAddModal(date: string, hour: number) {
    const startH = String(Math.min(hour, 22)).padStart(2, "0");
    const endH = String(Math.min(hour + 1, 23)).padStart(2, "0");
    setModalMode("add");
    setModalInitial({
      date,
      startTime: `${startH}:00`,
      endTime: `${endH}:00`,
      color: EVENT_COLORS[0],
    });
    setModalVisible(true);
  }

  function openEditModal(ev: CalendarEvent) {
    setModalMode("edit");
    setModalInitial(ev);
    setModalVisible(true);
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />

      <WeekHeader
        weekDays={weekDays}
        todayStr={todayStr}
        onPrev={() => setWeekOffset((o) => o - 1)}
        onNext={() => setWeekOffset((o) => o + 1)}
      />

      <TimeGrid
        weekDays={weekDays}
        events={events}
        onPressSlot={openAddModal}
        onPressEvent={openEditModal}
      />

      <EventModal
        visible={modalVisible}
        mode={modalMode}
        initial={modalInitial}
        onSave={handleSave}
        onDelete={handleDelete}
        onCancel={() => setModalVisible(false)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
});
