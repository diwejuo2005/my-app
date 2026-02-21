import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { C, pctColor, storage } from './shared/constants';

// ─── Column header row ────────────────────────────────────────────────────────
function TableHeader() {
  return (
    <View style={s.tableHeader}>
      <View style={[s.colHeaderCell, { flex: 3 }]}>
        <Text style={s.colHeaderTxt}>TASK</Text>
      </View>
      <View style={[s.colHeaderCell, { flex: 2 }]}>
        <Text style={s.colHeaderTxt}>DUE DATE</Text>
      </View>
      <View style={[s.colHeaderCell, { flex: 3 }]}>
        <Text style={s.colHeaderTxt}>NOTES</Text>
      </View>
      <View style={[s.colHeaderCell, { flex: 1.5 }]}>
        <Text style={s.colHeaderTxt}>COMPLETION</Text>
      </View>
      <View style={{ flex: 0.5 }} />
    </View>
  );
}

// ─── Single task row ──────────────────────────────────────────────────────────
function TaskRow({ task, index, isAlt, onUpdate, onDelete }) {
  const pct   = Math.min(100, Math.max(0, Number(task.completion) || 0));
  const color = pctColor(pct);

  // Web hover effect
  const [hovered, setHovered] = useState(false);
  const hoverProps = Platform.OS === 'web'
    ? { onMouseEnter: () => setHovered(true), onMouseLeave: () => setHovered(false) }
    : {};

  return (
    <View
      style={[
        s.tableRow,
        isAlt       && { backgroundColor: C.surfaceAlt },
        hovered     && s.tableRowHover,
        pct >= 100  && s.tableRowDone,
      ]}
      {...hoverProps}
    >
      {/* TASK */}
      <View style={[s.cell, { flex: 3 }]}>
        <View style={[s.dot, { backgroundColor: color }]} />
        <TextInput
          style={s.cellInput}
          value={task.title}
          onChangeText={v => onUpdate(index, 'title', v)}
          placeholder="Task name..."
          placeholderTextColor={C.textMuted}
        />
      </View>

      {/* DUE DATE */}
      <View style={[s.cell, { flex: 2 }]}>
        <TextInput
          style={s.cellInput}
          value={task.date}
          onChangeText={v => onUpdate(index, 'date', v)}
          placeholder="MM/DD/YYYY"
          placeholderTextColor={C.textMuted}
        />
      </View>

      {/* NOTES */}
      <View style={[s.cell, { flex: 3 }]}>
        <TextInput
          style={[s.cellInput, s.notesCell]}
          value={task.notes}
          onChangeText={v => onUpdate(index, 'notes', v)}
          placeholder="Notes..."
          placeholderTextColor={C.textMuted}
          multiline
          textAlignVertical="top"
        />
      </View>

      {/* COMPLETION */}
      <View style={[s.cell, s.completionCell, { flex: 1.5 }]}>
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
        {/* Flex-based bar avoids % width issues inside flex containers */}
        <View style={s.miniBarTrack}>
          <View style={[s.miniBarFill, { flex: pct, backgroundColor: color }]} />
          <View style={{ flex: Math.max(0, 100 - pct) }} />
        </View>
      </View>

      {/* DELETE */}
      <View style={[s.deleteCell, { flex: 0.5 }]}>
        <TouchableOpacity onPress={() => onDelete(index)} hitSlop={12}>
          <Text style={s.deleteTxt}>X</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function TaskTrackerPage() {
  const [week,        setWeek]        = useState(6);
  const [weeks,       setWeeks]       = useState({});
  const [editingWeek, setEditingWeek] = useState(false);
  const [weekInput,   setWeekInput]   = useState('6');

  const tasks = weeks[week] || [];

  const avg = tasks.length
    ? Math.round(tasks.reduce((a, t) => a + (Number(t.completion) || 0), 0) / tasks.length)
    : 0;

  // Load
  useEffect(() => {
    storage.get('taskTracker').then(data => {
      if (data) {
        setWeek(data.week || 6);
        setWeeks(data.weeks || {});
      }
    });
  }, []);

  // Save
  useEffect(() => {
    storage.set('taskTracker', { week, weeks });
  }, [week, weeks]);

  // ── CRUD
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

  // ── Inline week editing
  const commitWeekEdit = () => {
    const n = parseInt(weekInput);
    if (!isNaN(n) && n >= 1 && n <= 99) setWeek(n);
    setEditingWeek(false);
  };

  return (
    <View style={s.root}>

      {/* Stats strip */}
      <View style={s.statsStrip}>
        <Text style={s.statsLabel}>WEEK {week} OVERALL</Text>
        <View style={s.statsBarTrack}>
          <View style={[
            s.statsBarFill,
            { flex: avg, backgroundColor: pctColor(avg) },
          ]} />
          <View style={{ flex: Math.max(0, 100 - avg) }} />
        </View>
        <Text style={[s.statsPct, { color: pctColor(avg) }]}>{avg}%</Text>
      </View>

      {/* Controls */}
      <View style={s.controls}>
        {/* Week picker */}
        <View style={s.weekPicker}>
          <TouchableOpacity
            style={s.arrowBtn}
            onPress={() => { setWeek(w => Math.max(1, w - 1)); }}
          >
            <Text style={s.arrowTxt}>&#8249;</Text>
          </TouchableOpacity>

          {editingWeek ? (
            <TextInput
              style={s.weekInput}
              value={weekInput}
              onChangeText={setWeekInput}
              keyboardType="numeric"
              maxLength={2}
              autoFocus
              selectTextOnFocus
              onBlur={commitWeekEdit}
              onSubmitEditing={commitWeekEdit}
            />
          ) : (
            <TouchableOpacity
              onPress={() => { setWeekInput(String(week)); setEditingWeek(true); }}
            >
              <Text style={s.weekLabel}>Week {week}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={s.arrowBtn}
            onPress={() => { setWeek(w => w + 1); }}
          >
            <Text style={s.arrowTxt}>&#8250;</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.taskCount}>
          {tasks.length} task{tasks.length !== 1 ? 's' : ''}
        </Text>

        <TouchableOpacity style={s.addBtn} onPress={addTask} activeOpacity={0.8}>
          <Text style={s.addBtnTxt}>+ ADD TASK</Text>
        </TouchableOpacity>
      </View>

      {/* Table */}
      {tasks.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyTitle}>NO TASKS FOR THIS WEEK</Text>
          <Text style={s.emptySub}>Press + ADD TASK to get started.</Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ minWidth: 640 }}
            style={s.tableScrollH}
          >
            <View style={s.tableWrap}>
              <TableHeader />
              {tasks.map((task, i) => (
                <TaskRow
                  key={i}
                  task={task}
                  index={i}
                  isAlt={i % 2 === 1}
                  onUpdate={updateTask}
                  onDelete={deleteTask}
                />
              ))}
            </View>
          </ScrollView>
        </ScrollView>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },

  // Stats strip
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  statsLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: C.textMuted,
    letterSpacing: 1.2,
    minWidth: 110,
  },
  statsBarTrack: {
    flex: 1,
    height: 4,
    backgroundColor: C.border,
    borderRadius: 99,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  statsBarFill: {
    height: '100%',
    borderRadius: 99,
  },
  statsPct: {
    fontSize: 13,
    fontWeight: '700',
    minWidth: 36,
    textAlign: 'right',
  },

  // Controls
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  weekPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  arrowBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  arrowTxt: {
    color: C.textSec,
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '300',
  },
  weekLabel: {
    color: C.text,
    fontWeight: '600',
    fontSize: 13,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: C.border,
    minWidth: 70,
    textAlign: 'center',
  },
  weekInput: {
    color: C.accent,
    fontWeight: '700',
    fontSize: 13,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: C.primary,
    minWidth: 70,
    textAlign: 'center',
    backgroundColor: C.surface2,
  },
  taskCount: {
    flex: 1,
    color: C.textMuted,
    fontSize: 12,
    textAlign: 'right',
  },
  addBtn: {
    backgroundColor: C.primary,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addBtnTxt: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.6,
  },

  // Table
  tableScrollH: {
    flex: 1,
  },
  tableWrap: {
    flex: 1,
    maxWidth: 960,
    alignSelf: 'center',
    width: '100%',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: C.surface2,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingVertical: 8,
  },
  colHeaderCell: {
    paddingHorizontal: 10,
    borderRightWidth: 1,
    borderRightColor: C.border,
  },
  colHeaderTxt: {
    fontSize: 9,
    fontWeight: '700',
    color: C.textMuted,
    letterSpacing: 1.3,
  },

  // Task row
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
    minHeight: 48,
  },
  tableRowHover: {
    backgroundColor: 'rgba(30,64,175,0.08)',
  },
  tableRowDone: {
    borderLeftWidth: 2,
    borderLeftColor: C.green,
  },

  // Cells
  cell: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRightWidth: 1,
    borderRightColor: C.borderLight,
    alignSelf: 'stretch',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 7,
    flexShrink: 0,
  },
  cellInput: {
    flex: 1,
    color: C.text,
    fontSize: 13,
    paddingVertical: 2,
  },
  notesCell: {
    minHeight: 36,
    maxHeight: 60,
  },

  // Completion cell
  completionCell: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 5,
    justifyContent: 'center',
  },
  pctRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  pctInput: {
    width: 44,
    textAlign: 'center',
    borderWidth: 1.5,
    borderRadius: 5,
    color: C.text,
    fontWeight: '700',
    fontSize: 14,
    paddingVertical: 2,
    backgroundColor: C.surface2,
  },
  pctSymbol: {
    color: C.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  miniBarTrack: {
    width: 64,
    height: 3,
    backgroundColor: C.border,
    borderRadius: 99,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  miniBarFill: {
    height: '100%',
    borderRadius: 99,
  },

  // Delete cell
  deleteCell: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  deleteTxt: {
    color: C.textMuted,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  // Empty state
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: C.textMuted,
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 12,
    color: C.textMuted,
    letterSpacing: 0.3,
  },
});
