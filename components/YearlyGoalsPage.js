import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from './shared/ThemeContext';
import { storage } from './shared/constants';

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const YEAR = new Date().getFullYear();

// ─── Circular progress ring ───────────────────────────────────────────────────
function CircularProgress({ pct, size = 52, strokeWidth = 4 }) {
  const { C } = useTheme();
  const r    = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(pct, 100) / 100) * circ;
  const color  = pct >= 100 ? C.green : pct > 0 ? C.primary : C.border;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        {/* Track */}
        <Circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={C.border}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress arc */}
        {pct > 0 && (
          <Circle
            cx={size / 2} cy={size / 2} r={r}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${circ} ${circ}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${size / 2},${size / 2}`}
          />
        )}
      </Svg>
      <Text style={{ fontSize: 9, fontWeight: '700', color: pct > 0 ? color : C.textMuted }}>
        {pct}%
      </Text>
    </View>
  );
}

// ─── Subtask row ──────────────────────────────────────────────────────────────
function SubtaskRow({ item, onToggle, onChangeText, onDelete }) {
  const { C } = useTheme();
  const s = useMemo(() => StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 5,
      paddingLeft: 28,
      gap: 8,
    },
    checkbox: {
      width: 14,
      height: 14,
      borderWidth: 1.5,
      borderColor: C.borderLight,
      borderRadius: 2,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    checkmark: {
      color: '#fff',
      fontSize: 9,
      fontWeight: '700',
      lineHeight: 11,
    },
    input: {
      flex: 1,
      color: item.checked ? C.textMuted : C.textSec,
      fontSize: 12,
      paddingVertical: 1,
      textDecorationLine: item.checked ? 'line-through' : 'none',
    },
    delBtn: { padding: 3 },
    delTxt: { color: C.textMuted, fontSize: 10 },
  }), [C, item.checked]);

  return (
    <View style={s.row}>
      <TouchableOpacity
        onPress={onToggle}
        style={[s.checkbox, item.checked && { backgroundColor: C.green, borderColor: C.green }]}
        activeOpacity={0.7}
      >
        {item.checked && <Text style={s.checkmark}>✓</Text>}
      </TouchableOpacity>
      <TextInput
        style={s.input}
        value={item.text}
        onChangeText={onChangeText}
        placeholder="Subtask..."
        placeholderTextColor={C.textMuted}
      />
      <TouchableOpacity onPress={onDelete} style={s.delBtn} hitSlop={8}>
        <Text style={s.delTxt}>×</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Task row ─────────────────────────────────────────────────────────────────
function TaskRow({ task, monthIdx, onToggle, onChangeTitle, onDelete, onAddSubtask, onUpdateSubtask, onDeleteSubtask }) {
  const { C } = useTheme();
  const [expanded, setExpanded] = useState(false);

  const s = useMemo(() => StyleSheet.create({
    taskWrap: {
      borderTopWidth: 1,
      borderTopColor: C.border,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 12,
      gap: 8,
    },
    checkbox: {
      width: 16,
      height: 16,
      borderWidth: 1.5,
      borderColor: C.primary,
      borderRadius: 3,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    checkmark: {
      color: '#fff',
      fontSize: 11,
      fontWeight: '700',
      lineHeight: 13,
    },
    input: {
      flex: 1,
      color: task.checked ? C.textMuted : C.text,
      fontSize: 13,
      paddingVertical: 1,
      textDecorationLine: task.checked ? 'line-through' : 'none',
    },
    expandBtn: { padding: 3 },
    expandTxt: { color: C.textMuted, fontSize: 11 },
    delBtn: { padding: 3 },
    delTxt: { color: C.textMuted, fontSize: 13 },
    addSubBtn: {
      marginLeft: 36,
      marginBottom: 6,
      paddingVertical: 2,
      alignSelf: 'flex-start',
    },
    addSubTxt: {
      fontSize: 11,
      color: C.primary,
      fontWeight: '600',
    },
  }), [C, task.checked]);

  const subtaskCount = task.subtasks?.length ?? 0;

  return (
    <View style={s.taskWrap}>
      <View style={s.row}>
        <TouchableOpacity
          onPress={onToggle}
          style={[s.checkbox, task.checked && { backgroundColor: C.primary, borderColor: C.primary }]}
          activeOpacity={0.7}
        >
          {task.checked && <Text style={s.checkmark}>✓</Text>}
        </TouchableOpacity>

        <TextInput
          style={s.input}
          value={task.title}
          onChangeText={onChangeTitle}
          placeholder="Task..."
          placeholderTextColor={C.textMuted}
          onFocus={() => setExpanded(true)}
        />

        {subtaskCount > 0 && (
          <TouchableOpacity onPress={() => setExpanded(v => !v)} style={s.expandBtn} hitSlop={8}>
            <Text style={s.expandTxt}>{expanded ? '▾' : `▸ ${subtaskCount}`}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={onDelete} style={s.delBtn} hitSlop={8}>
          <Text style={s.delTxt}>×</Text>
        </TouchableOpacity>
      </View>

      {/* Subtasks */}
      {(expanded || subtaskCount > 0) && (
        <>
          {(task.subtasks ?? []).map(sub => (
            <SubtaskRow
              key={sub.id}
              item={sub}
              onToggle={() => onUpdateSubtask(sub.id, 'checked', !sub.checked)}
              onChangeText={v => onUpdateSubtask(sub.id, 'text', v)}
              onDelete={() => onDeleteSubtask(sub.id)}
            />
          ))}
          <TouchableOpacity
            style={s.addSubBtn}
            onPress={onAddSubtask}
            activeOpacity={0.7}
          >
            <Text style={s.addSubTxt}>+ subtask</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

// ─── Month card ───────────────────────────────────────────────────────────────
function MonthCard({ monthIdx, tasks, onAddTask, onToggleTask, onChangeTaskTitle, onDeleteTask, onAddSubtask, onUpdateSubtask, onDeleteSubtask }) {
  const { C } = useTheme();

  // Compute overall completion %
  const allItems = tasks.reduce((acc, t) => {
    acc.push({ checked: t.checked });
    (t.subtasks ?? []).forEach(s => acc.push({ checked: s.checked }));
    return acc;
  }, []);
  const total  = allItems.length;
  const done   = allItems.filter(i => i.checked).length;
  const pct    = total > 0 ? Math.round((done / total) * 100) : 0;

  const s = useMemo(() => StyleSheet.create({
    card: {
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 10,
      overflow: 'hidden',
      marginBottom: 12,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 10,
      backgroundColor: C.surface2,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    monthLabel: {
      fontSize: 11,
      fontWeight: '800',
      color: C.text,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
    },
    taskCount: {
      fontSize: 10,
      color: C.textMuted,
      marginTop: 2,
    },
    cardBody: {
      // tasks render here
    },
    addTaskBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 9,
      gap: 6,
      borderTopWidth: tasks.length > 0 ? 1 : 0,
      borderTopColor: C.border,
    },
    addTaskTxt: {
      fontSize: 12,
      color: C.textMuted,
      fontWeight: '500',
    },
    emptyNote: {
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    emptyTxt: {
      fontSize: 11,
      color: C.textMuted,
      fontStyle: 'italic',
    },
  }), [C, tasks.length]);

  return (
    <View style={s.card}>
      {/* Header */}
      <View style={s.cardHeader}>
        <View>
          <Text style={s.monthLabel}>{MONTH_NAMES[monthIdx - 1]}</Text>
          <Text style={s.taskCount}>
            {total === 0 ? 'No tasks yet' : `${done} of ${total} done`}
          </Text>
        </View>
        <CircularProgress pct={pct} size={52} strokeWidth={4} />
      </View>

      {/* Task list */}
      <View style={s.cardBody}>
        {tasks.length === 0 && (
          <View style={s.emptyNote}>
            <Text style={s.emptyTxt}>No tasks — tap "+ add task" to get started.</Text>
          </View>
        )}
        {tasks.map(task => (
          <TaskRow
            key={task.id}
            task={task}
            monthIdx={monthIdx}
            onToggle={() => onToggleTask(task.id)}
            onChangeTitle={v => onChangeTaskTitle(task.id, v)}
            onDelete={() => onDeleteTask(task.id)}
            onAddSubtask={() => onAddSubtask(task.id)}
            onUpdateSubtask={(sid, field, val) => onUpdateSubtask(task.id, sid, field, val)}
            onDeleteSubtask={sid => onDeleteSubtask(task.id, sid)}
          />
        ))}
      </View>

      {/* Add task */}
      <TouchableOpacity style={s.addTaskBtn} onPress={onAddTask} activeOpacity={0.7}>
        <Text style={{ color: C.primary, fontSize: 14, fontWeight: '700' }}>+</Text>
        <Text style={s.addTaskTxt}>add task</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function YearlyGoalsPage() {
  const { C } = useTheme();
  const counter = useRef(0);
  const nextId  = () => `id_${Date.now()}_${++counter.current}`;

  // goals: { [monthIdx: 1..12]: Task[] }
  // Task: { id, title, checked, subtasks: [{ id, text, checked }] }
  const [goals, setGoals] = useState({});

  useEffect(() => {
    storage.get('yearlyGoalsByMonth').then(data => {
      if (data && typeof data === 'object') setGoals(data);
      else {
        // migrate from old format if needed
        const empty = {};
        for (let m = 1; m <= 12; m++) empty[m] = [];
        setGoals(empty);
      }
    });
  }, []);

  useEffect(() => {
    storage.set('yearlyGoalsByMonth', goals);
  }, [goals]);

  const getTasks = (m) => goals[m] ?? [];

  const addTask = (m) => setGoals(prev => ({
    ...prev,
    [m]: [...(prev[m] ?? []), { id: nextId(), title: '', checked: false, subtasks: [] }],
  }));

  const toggleTask = (m, tid) => setGoals(prev => ({
    ...prev,
    [m]: (prev[m] ?? []).map(t => t.id === tid ? { ...t, checked: !t.checked } : t),
  }));

  const changeTaskTitle = (m, tid, val) => setGoals(prev => ({
    ...prev,
    [m]: (prev[m] ?? []).map(t => t.id === tid ? { ...t, title: val } : t),
  }));

  const deleteTask = (m, tid) => setGoals(prev => ({
    ...prev,
    [m]: (prev[m] ?? []).filter(t => t.id !== tid),
  }));

  const addSubtask = (m, tid) => setGoals(prev => ({
    ...prev,
    [m]: (prev[m] ?? []).map(t =>
      t.id === tid
        ? { ...t, subtasks: [...(t.subtasks ?? []), { id: nextId(), text: '', checked: false }] }
        : t
    ),
  }));

  const updateSubtask = (m, tid, sid, field, val) => setGoals(prev => ({
    ...prev,
    [m]: (prev[m] ?? []).map(t =>
      t.id !== tid ? t : {
        ...t,
        subtasks: (t.subtasks ?? []).map(s => s.id === sid ? { ...s, [field]: val } : s),
      }
    ),
  }));

  const deleteSubtask = (m, tid, sid) => setGoals(prev => ({
    ...prev,
    [m]: (prev[m] ?? []).map(t =>
      t.id !== tid ? t : { ...t, subtasks: (t.subtasks ?? []).filter(s => s.id !== sid) }
    ),
  }));

  // Overall year stats
  const allTasks    = Object.values(goals).flat();
  const allSubtasks = allTasks.flatMap(t => t.subtasks ?? []);
  const totalItems  = allTasks.length + allSubtasks.length;
  const doneItems   = allTasks.filter(t => t.checked).length + allSubtasks.filter(s => s.checked).length;
  const yearPct     = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;

  const s = useMemo(() => StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    pageHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 14,
      backgroundColor: C.surface,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    pageTitleBlock: { flex: 1 },
    pageTitle: { fontSize: 13, fontWeight: '800', color: C.text, letterSpacing: 1.5 },
    pageSub: { fontSize: 11, color: C.textMuted, marginTop: 2 },
    yearPct: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    yearPctTxt: {
      fontSize: 11,
      fontWeight: '700',
      color: C.textSec,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      padding: 12,
      gap: 0,
    },
    gridCell: {
      width: '50%',
      paddingHorizontal: 6,
    },
    gridCellFull: {
      width: '100%',
      paddingHorizontal: 6,
    },
  }), [C]);

  // Simple responsive: if web and wide enough, 2 columns
  // Use onLayout on the ScrollView content container
  const [containerWidth, setContainerWidth] = useState(0);
  const twoCol = containerWidth >= 600;

  return (
    <View style={s.root}>
      {/* Page header */}
      <View style={s.pageHeader}>
        <View style={s.pageTitleBlock}>
          <Text style={s.pageTitle}>{YEAR} GOALS</Text>
          <Text style={s.pageSub}>Month-by-month breakdown</Text>
        </View>
        <View style={s.yearPct}>
          <Text style={s.yearPctTxt}>{doneItems}/{totalItems} overall</Text>
          <CircularProgress pct={yearPct} size={42} strokeWidth={3.5} />
        </View>
      </View>

      {/* Month grid */}
      <ScrollView
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
        onLayout={e => setContainerWidth(e.nativeEvent.layout.width)}
      >
        <View style={s.grid}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
            const tasks = getTasks(m);
            return (
              <View key={m} style={twoCol ? s.gridCell : s.gridCellFull}>
                <MonthCard
                  monthIdx={m}
                  tasks={tasks}
                  onAddTask={() => addTask(m)}
                  onToggleTask={tid => toggleTask(m, tid)}
                  onChangeTaskTitle={(tid, val) => changeTaskTitle(m, tid, val)}
                  onDeleteTask={tid => deleteTask(m, tid)}
                  onAddSubtask={tid => addSubtask(m, tid)}
                  onUpdateSubtask={(tid, sid, field, val) => updateSubtask(m, tid, sid, field, val)}
                  onDeleteSubtask={(tid, sid) => deleteSubtask(m, tid, sid)}
                />
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
