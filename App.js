import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

// ─── Cross-platform storage (localStorage on web, memory on native) ──────────
const storage = {
  async get(key) {
    try {
      if (Platform.OS === 'web') {
        const v = window.localStorage.getItem(key);
        return v ? JSON.parse(v) : null;
      }
      return null; // swap in AsyncStorage here for native persistence
    } catch {
      return null;
    }
  },
  async set(key, value) {
    try {
      if (Platform.OS === 'web') {
        window.localStorage.setItem(key, JSON.stringify(value));
      }
    } catch {}
  },
};

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:        '#070d1a',
  surface:   '#0e1629',
  surface2:  '#162035',
  border:    '#1e2d4a',
  primary:   '#1e40af',
  accent:    '#f59e0b',
  text:      '#e2e8f0',
  textSec:   '#94a3b8',
  textMuted: '#475569',
  green:     '#10b981',
  yellow:    '#f59e0b',
  red:       '#ef4444',
};

function pctColor(pct) {
  if (pct >= 100) return '#10b981';
  if (pct >= 60)  return '#22c55e';
  if (pct >= 30)  return '#f59e0b';
  if (pct > 0)    return '#ef4444';
  return C.border;
}

// ─── Header ───────────────────────────────────────────────────────────────────
function Header({ weekNum, tasks }) {
  const avg = tasks.length
    ? Math.round(tasks.reduce((a, t) => a + (Number(t.completion) || 0), 0) / tasks.length)
    : 0;

  return (
    <View style={s.header}>
      <StatusBar style="light" />
      <View style={s.headerInner}>
        {/* Duke badge */}
        <View style={s.badge}>
          <Text style={s.badgeText}>D</Text>
        </View>

        {/* Title block */}
        <View style={{ flex: 1 }}>
          <Text style={s.headerName}>DON IWEJUO · WEEKLY TRACKER</Text>
          <Text style={s.headerTitle}>WEEK {weekNum} TASKS</Text>
          <Text style={s.headerSub}>Add tasks, track completion, switch weeks below.</Text>
        </View>

        {/* Overall completion */}
        <View style={s.overallBlock}>
          <Text style={s.overallLabel}>OVERALL</Text>
          <Text style={[s.overallPct, { color: pctColor(avg) }]}>{avg}%</Text>
          <View style={s.overallBarTrack}>
            <View
              style={[
                s.overallBarFill,
                { width: `${avg}%`, backgroundColor: pctColor(avg) },
              ]}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Task card ────────────────────────────────────────────────────────────────
function TaskCard({ task, index, onUpdate, onDelete }) {
  const pct = Math.min(100, Math.max(0, Number(task.completion) || 0));
  const color = pctColor(pct);

  return (
    <View style={[s.card, pct >= 100 && { borderLeftColor: C.green, borderLeftWidth: 3 }]}>

      {/* Title row */}
      <View style={s.cardTitleRow}>
        <View style={[s.dot, { backgroundColor: color }]} />
        <TextInput
          style={s.titleInput}
          value={task.title}
          onChangeText={v => onUpdate(index, 'title', v)}
          placeholder="Task title..."
          placeholderTextColor={C.textMuted}
          returnKeyType="done"
        />
        <TouchableOpacity onPress={() => onDelete(index)} style={s.deleteBtn} hitSlop={8}>
          <Text style={s.deleteTxt}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Due date */}
      <View style={s.fieldRow}>
        <Text style={s.label}>📅  DUE DATE</Text>
        <TextInput
          style={s.fieldInput}
          value={task.date}
          onChangeText={v => onUpdate(index, 'date', v)}
          placeholder="MM / DD / YYYY"
          placeholderTextColor={C.textMuted}
        />
      </View>

      {/* Notes */}
      <View style={s.fieldRow}>
        <Text style={s.label}>💬  NOTES</Text>
        <TextInput
          style={[s.fieldInput, s.notesInput]}
          value={task.notes}
          onChangeText={v => onUpdate(index, 'notes', v)}
          placeholder="Add notes or reminders..."
          placeholderTextColor={C.textMuted}
          multiline
          textAlignVertical="top"
        />
      </View>

      {/* Completion */}
      <View style={s.completionBlock}>
        <View style={s.completionTopRow}>
          <Text style={s.label}>⚡  COMPLETION</Text>
          <View style={s.pctRow}>
            <TextInput
              style={[s.pctInput, { borderColor: color }]}
              value={String(task.completion)}
              onChangeText={v => {
                const n = Math.min(100, Math.max(0, parseInt(v) || 0));
                onUpdate(index, 'completion', n);
              }}
              keyboardType="numeric"
              maxLength={3}
              selectTextOnFocus
            />
            <Text style={s.pctSymbol}>%</Text>
          </View>
        </View>
        <View style={s.barTrack}>
          <View style={[s.barFill, { width: `${pct}%`, backgroundColor: color }]} />
        </View>
        <Text style={[s.pctBelowBar, { color }]}>{pct}% complete</Text>
      </View>
    </View>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [week, setWeek] = useState(6);
  const [weeks, setWeeks] = useState({});

  const tasks = weeks[week] || [];

  // Load persisted data
  useEffect(() => {
    storage.get('taskTracker').then(data => {
      if (data) {
        setWeek(data.week || 6);
        setWeeks(data.weeks || {});
      }
    });
  }, []);

  // Persist on every change
  useEffect(() => {
    storage.set('taskTracker', { week, weeks });
  }, [week, weeks]);

  const addTask = useCallback(() => {
    setWeeks(prev => ({
      ...prev,
      [week]: [...(prev[week] || []), { title: '', date: '', notes: '', completion: 0 }],
    }));
  }, [week]);

  const updateTask = useCallback((index, field, value) => {
    setWeeks(prev => {
      const arr = [...(prev[week] || [])];
      arr[index] = { ...arr[index], [field]: value };
      return { ...prev, [week]: arr };
    });
  }, [week]);

  const deleteTask = useCallback((index) => {
    setWeeks(prev => {
      const arr = [...(prev[week] || [])];
      arr.splice(index, 1);
      return { ...prev, [week]: arr };
    });
  }, [week]);

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Header weekNum={week} tasks={tasks} />

      {/* ── Controls bar ──────────────────────────────── */}
      <View style={s.controls}>
        <View style={s.weekPicker}>
          <TouchableOpacity
            style={s.arrowBtn}
            onPress={() => setWeek(w => Math.max(1, w - 1))}
          >
            <Text style={s.arrowTxt}>‹</Text>
          </TouchableOpacity>

          <Text style={s.weekLabel}>Week {week}</Text>

          <TouchableOpacity
            style={s.arrowBtn}
            onPress={() => setWeek(w => w + 1)}
          >
            <Text style={s.arrowTxt}>›</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.taskCount}>
          {tasks.length} task{tasks.length !== 1 ? 's' : ''}
        </Text>

        <TouchableOpacity style={s.addBtn} onPress={addTask} activeOpacity={0.8}>
          <Text style={s.addBtnTxt}>＋  Add Task</Text>
        </TouchableOpacity>
      </View>

      {/* ── Task list ─────────────────────────────────── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.listContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {tasks.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>📋</Text>
            <Text style={s.emptyTitle}>No tasks yet</Text>
            <Text style={s.emptySub}>Tap "＋ Add Task" to get started</Text>
          </View>
        ) : (
          tasks.map((task, i) => (
            <TaskCard
              key={i}
              task={task}
              index={i}
              onUpdate={updateTask}
              onDelete={deleteTask}
            />
          ))
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },

  // ── Header
  header: {
    backgroundColor: '#0a1628',
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingTop:  Platform.OS === 'ios' ? 54 : Platform.OS === 'android' ? 28 : 20,
    paddingBottom: 18,
    paddingHorizontal: 20,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    maxWidth: 900,
    alignSelf: 'center',
    width: '100%',
  },
  badge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(59,130,246,0.35)',
  },
  badgeText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 20,
  },
  headerName: {
    fontSize: 10,
    color: C.textSec,
    fontWeight: '600',
    letterSpacing: 1.1,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: Platform.OS === 'web' ? 22 : 18,
    fontWeight: '800',
    color: C.accent,
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  headerSub: {
    fontSize: 11,
    color: C.textMuted,
  },
  overallBlock: {
    alignItems: 'flex-end',
    gap: 3,
  },
  overallLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: C.textMuted,
    letterSpacing: 1.5,
  },
  overallPct: {
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 30,
  },
  overallBarTrack: {
    width: 90,
    height: 4,
    backgroundColor: C.border,
    borderRadius: 99,
    overflow: 'hidden',
  },
  overallBarFill: {
    height: '100%',
    borderRadius: 99,
  },

  // ── Controls
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    maxWidth: 900,
    alignSelf: 'center',
    width: '100%',
  },
  weekPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    overflow: 'hidden',
  },
  arrowBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  arrowTxt: {
    color: C.textSec,
    fontSize: 22,
    fontWeight: '300',
    lineHeight: 24,
  },
  weekLabel: {
    color: C.text,
    fontWeight: '600',
    fontSize: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: C.border,
    minWidth: 72,
    textAlign: 'center',
  },
  taskCount: {
    flex: 1,
    color: C.textMuted,
    fontSize: 13,
    textAlign: 'right',
    marginRight: 2,
  },
  addBtn: {
    backgroundColor: C.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  addBtnTxt: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.2,
  },

  // ── List
  listContent: {
    padding: 16,
    paddingBottom: 48,
    gap: 10,
    maxWidth: 900,
    alignSelf: 'center',
    width: '100%',
  },

  // ── Task card
  card: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  titleInput: {
    flex: 1,
    color: C.text,
    fontSize: 15,
    fontWeight: '600',
    paddingVertical: 2,
  },
  deleteBtn: {
    padding: 4,
    opacity: 0.5,
  },
  deleteTxt: {
    color: C.textSec,
    fontSize: 13,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  label: {
    fontSize: 9,
    fontWeight: '700',
    color: C.textMuted,
    letterSpacing: 0.8,
    paddingTop: 8,
    minWidth: 86,
  },
  fieldInput: {
    flex: 1,
    color: C.textSec,
    fontSize: 13,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: C.surface2,
  },
  notesInput: {
    minHeight: 44,
    maxHeight: 80,
  },

  // Completion
  completionBlock: {
    gap: 7,
  },
  completionTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pctRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pctInput: {
    backgroundColor: C.surface2,
    borderWidth: 1.5,
    borderRadius: 8,
    color: C.text,
    fontWeight: '700',
    fontSize: 16,
    width: 52,
    textAlign: 'center',
    paddingVertical: 4,
  },
  pctSymbol: {
    color: C.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  barTrack: {
    height: 7,
    backgroundColor: C.border,
    borderRadius: 99,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 99,
  },
  pctBelowBar: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
    opacity: 0.8,
  },

  // Empty state
  empty: {
    alignItems: 'center',
    paddingVertical: 70,
  },
  emptyIcon: {
    fontSize: 44,
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: C.textSec,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    color: C.textMuted,
  },
});
