import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  Platform,
} from 'react-native';
import { useTheme } from './shared/ThemeContext';
import { pctColor, storage } from './shared/constants';

// ─── Calendar Date Picker Modal ───────────────────────────────────────────────
const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_LABELS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

function DatePickerModal({ visible, currentValue, onSelect, onClose }) {
  const { C } = useTheme();

  // Parse current date or default to today
  const today = new Date();
  const parseDate = (str) => {
    if (!str) return null;
    const parts = str.split('/');
    if (parts.length === 3) {
      const d = new Date(Number(parts[2]), Number(parts[0]) - 1, Number(parts[1]));
      if (!isNaN(d)) return d;
    }
    return null;
  };
  const parsedCurrent = parseDate(currentValue);
  const [viewYear,  setViewYear]  = useState(parsedCurrent ? parsedCurrent.getFullYear()  : today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsedCurrent ? parsedCurrent.getMonth()     : today.getMonth()); // 0-based
  const [selected,  setSelected]  = useState(parsedCurrent);

  // Reset when opened
  useEffect(() => {
    if (visible) {
      const d = parseDate(currentValue) || today;
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
      setSelected(parseDate(currentValue));
    }
  }, [visible, currentValue]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  // Build calendar days grid
  const firstDay   = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sun
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  const isSelected = (d) => {
    if (!d || !selected) return false;
    return (
      selected.getFullYear() === viewYear &&
      selected.getMonth()    === viewMonth &&
      selected.getDate()     === d
    );
  };
  const isToday = (d) => {
    if (!d) return false;
    return (
      today.getFullYear() === viewYear &&
      today.getMonth()    === viewMonth &&
      today.getDate()     === d
    );
  };

  const handleSelect = (d) => {
    if (!d) return;
    const date = new Date(viewYear, viewMonth, d);
    setSelected(date);
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    onSelect(`${mm}/${dd}/${viewYear}`);
  };

  const s = useMemo(() => StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    picker: {
      backgroundColor: C.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: C.border,
      width: 300,
      paddingBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.18,
      shadowRadius: 20,
      elevation: 12,
    },
    pickerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    navBtn: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: C.surface2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    navTxt: { color: C.text, fontSize: 16, fontWeight: '600' },
    monthYearTxt: {
      fontSize: 14,
      fontWeight: '700',
      color: C.text,
      letterSpacing: 0.3,
    },
    dayLabelsRow: {
      flexDirection: 'row',
      paddingHorizontal: 10,
      paddingTop: 10,
      paddingBottom: 4,
    },
    dayLabel: {
      flex: 1,
      textAlign: 'center',
      fontSize: 10,
      fontWeight: '700',
      color: C.textMuted,
      letterSpacing: 0.5,
    },
    daysGrid: {
      paddingHorizontal: 10,
    },
    daysRow: {
      flexDirection: 'row',
    },
    dayCell: {
      flex: 1,
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 6,
      marginVertical: 1,
    },
    dayCellEmpty: {},
    dayCellSelected: { backgroundColor: C.primary },
    dayCellToday: {
      borderWidth: 1.5,
      borderColor: C.primary,
    },
    dayTxt: { fontSize: 12, color: C.text, fontWeight: '500' },
    dayTxtSelected: { color: '#fff', fontWeight: '700' },
    dayTxtToday: { color: C.primary, fontWeight: '700' },
    footer: {
      flexDirection: 'row',
      justifyContent: 'center',
      paddingTop: 12,
      paddingHorizontal: 16,
    },
    cancelBtn: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: C.border,
    },
    cancelTxt: { color: C.textSec, fontSize: 13, fontWeight: '600' },
  }), [C]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} onPress={e => e.stopPropagation()}>
          <View style={s.picker}>
            {/* Header */}
            <View style={s.pickerHeader}>
              <TouchableOpacity style={s.navBtn} onPress={prevMonth} activeOpacity={0.7}>
                <Text style={s.navTxt}>‹</Text>
              </TouchableOpacity>
              <Text style={s.monthYearTxt}>{MONTH_LABELS[viewMonth]} {viewYear}</Text>
              <TouchableOpacity style={s.navBtn} onPress={nextMonth} activeOpacity={0.7}>
                <Text style={s.navTxt}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Day labels */}
            <View style={s.dayLabelsRow}>
              {DAY_LABELS.map(d => (
                <Text key={d} style={s.dayLabel}>{d}</Text>
              ))}
            </View>

            {/* Days grid */}
            <View style={s.daysGrid}>
              {Array.from({ length: cells.length / 7 }, (_, row) => (
                <View key={row} style={s.daysRow}>
                  {cells.slice(row * 7, row * 7 + 7).map((d, col) => {
                    const sel = isSelected(d);
                    const tod = isToday(d);
                    return (
                      <TouchableOpacity
                        key={col}
                        style={[
                          s.dayCell,
                          !d && s.dayCellEmpty,
                          tod && !sel && s.dayCellToday,
                          sel && s.dayCellSelected,
                        ]}
                        onPress={() => handleSelect(d)}
                        activeOpacity={d ? 0.7 : 1}
                        disabled={!d}
                      >
                        {d ? (
                          <Text style={[
                            s.dayTxt,
                            tod && !sel && s.dayTxtToday,
                            sel && s.dayTxtSelected,
                          ]}>
                            {d}
                          </Text>
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>

            {/* Footer */}
            <View style={s.footer}>
              <TouchableOpacity style={s.cancelBtn} onPress={onClose} activeOpacity={0.7}>
                <Text style={s.cancelTxt}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Column headers ───────────────────────────────────────────────────────────
function TableHeader() {
  const { C } = useTheme();
  const s = useMemo(() => StyleSheet.create({
    tableHeader: {
      flexDirection: 'row',
      backgroundColor: C.surface2,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
      paddingVertical: 9,
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
      letterSpacing: 1.4,
    },
  }), [C]);

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
function TaskRow({ task, index, isAlt, onUpdate, onDelete, onOpenDatePicker }) {
  const { C } = useTheme();
  const pct   = Math.min(100, Math.max(0, Number(task.completion) || 0));
  const color = pctColor(pct);
  const [hovered, setHovered] = useState(false);

  const hoverProps = Platform.OS === 'web'
    ? { onMouseEnter: () => setHovered(true), onMouseLeave: () => setHovered(false) }
    : {};

  const s = useMemo(() => StyleSheet.create({
    tableRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: C.surface,
      borderBottomWidth: 1,
      borderBottomColor: C.borderLight,
      minHeight: 52,
    },
    tableRowAlt: {
      backgroundColor: C.surfaceAlt,
    },
    tableRowHover: {
      backgroundColor: C.primary + '10',
    },
    tableRowDone: {
      borderLeftWidth: 2,
      borderLeftColor: C.green,
    },
    cell: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 8,
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
    // Date cell
    dateTouchable: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    dateTxt: {
      flex: 1,
      color: task.date ? C.text : C.textMuted,
      fontSize: 13,
    },
    completionCell: {
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
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
      borderRadius: 6,
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
      width: 60,
      height: 3,
      backgroundColor: C.border,
      borderRadius: 99,
      overflow: 'hidden',
      flexDirection: 'row',
    },
    deleteCell: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 8,
    },
    deleteTxt: {
      color: C.textMuted,
      fontSize: 15,
      fontWeight: '400',
    },
  }), [C, task.date]);

  return (
    <View
      style={[
        s.tableRow,
        isAlt      && s.tableRowAlt,
        hovered    && s.tableRowHover,
        pct >= 100 && s.tableRowDone,
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

      {/* DUE DATE — taps to open calendar */}
      <View style={[s.cell, { flex: 2 }]}>
        <TouchableOpacity style={s.dateTouchable} onPress={() => onOpenDatePicker(index)} activeOpacity={0.7}>
          <Text style={s.dateTxt}>{task.date || 'Pick date'}</Text>
        </TouchableOpacity>
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
        <View style={s.miniBarTrack}>
          <View style={[{ flex: pct, height: '100%', borderRadius: 99, backgroundColor: color }]} />
          <View style={{ flex: Math.max(0, 100 - pct) }} />
        </View>
      </View>

      {/* DELETE */}
      <View style={[s.deleteCell, { flex: 0.5 }]}>
        <TouchableOpacity onPress={() => onDelete(index)} hitSlop={12}>
          <Text style={s.deleteTxt}>×</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function TaskTrackerPage() {
  const { C } = useTheme();
  const [week,        setWeek]        = useState(6);
  const [weeks,       setWeeks]       = useState({});
  const [editingWeek, setEditingWeek] = useState(false);
  const [weekInput,   setWeekInput]   = useState('6');

  // Date picker state
  const [datePickerIdx,     setDatePickerIdx]     = useState(null); // task index
  const [datePickerVisible, setDatePickerVisible] = useState(false);

  const tasks = weeks[week] || [];
  const done  = tasks.filter(t => (Number(t.completion) || 0) >= 100).length;
  const avg   = tasks.length
    ? Math.round(tasks.reduce((a, t) => a + (Number(t.completion) || 0), 0) / tasks.length)
    : 0;

  useEffect(() => {
    storage.get('taskTracker').then(data => {
      if (data) {
        setWeek(data.week || 6);
        setWeeks(data.weeks || {});
      }
    });
  }, []);

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

  const commitWeekEdit = () => {
    const n = parseInt(weekInput);
    if (!isNaN(n) && n >= 1 && n <= 99) setWeek(n);
    setEditingWeek(false);
  };

  const openDatePicker = (idx) => {
    setDatePickerIdx(idx);
    setDatePickerVisible(true);
  };
  const closeDatePicker = () => setDatePickerVisible(false);
  const handleDateSelect = (dateStr) => {
    if (datePickerIdx !== null) updateTask(datePickerIdx, 'date', dateStr);
    closeDatePicker();
  };

  const s = useMemo(() => StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    statsStrip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 20,
      paddingVertical: 11,
      backgroundColor: C.surface,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    statsLabel: {
      fontSize: 9,
      fontWeight: '700',
      color: C.textMuted,
      letterSpacing: 1.3,
      minWidth: 130,
    },
    statsBarTrack: {
      flex: 1,
      height: 4,
      backgroundColor: C.border,
      borderRadius: 99,
      overflow: 'hidden',
      flexDirection: 'row',
    },
    statsPct: {
      fontSize: 13,
      fontWeight: '700',
      minWidth: 36,
      textAlign: 'right',
    },
    controls: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      gap: 10,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
      backgroundColor: C.surface,
    },
    weekPicker: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: C.surface2,
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
      minWidth: 72,
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
      minWidth: 72,
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
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: C.primary,
      paddingHorizontal: 14,
      paddingVertical: 7,
    },
    addBtnTxt: {
      color: C.primary,
      fontWeight: '700',
      fontSize: 12,
      letterSpacing: 0.6,
    },
    tableWrap: {
      width: '100%',
      maxWidth: 960,
      alignSelf: 'center',
    },
    empty: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
    },
    emptyTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: C.textMuted,
      letterSpacing: 1,
      marginBottom: 8,
    },
    emptySub: {
      fontSize: 12,
      color: C.textMuted,
    },
  }), [C]);

  return (
    <View style={s.root}>

      {/* Date picker modal */}
      <DatePickerModal
        visible={datePickerVisible}
        currentValue={datePickerIdx !== null ? (tasks[datePickerIdx]?.date ?? '') : ''}
        onSelect={handleDateSelect}
        onClose={closeDatePicker}
      />

      {/* Stats strip */}
      <View style={s.statsStrip}>
        <Text style={s.statsLabel}>WEEK {week} · {done}/{tasks.length} DONE</Text>
        <View style={s.statsBarTrack}>
          <View style={[{ flex: avg, height: '100%', borderRadius: 99, backgroundColor: pctColor(avg) }]} />
          <View style={{ flex: Math.max(0, 100 - avg) }} />
        </View>
        <Text style={[s.statsPct, { color: pctColor(avg) }]}>{avg}%</Text>
      </View>

      {/* Controls */}
      <View style={s.controls}>
        <View style={s.weekPicker}>
          <TouchableOpacity style={s.arrowBtn} onPress={() => setWeek(w => Math.max(1, w - 1))}>
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
            <TouchableOpacity onPress={() => { setWeekInput(String(week)); setEditingWeek(true); }}>
              <Text style={s.weekLabel}>Week {week}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={s.arrowBtn} onPress={() => setWeek(w => w + 1)}>
            <Text style={s.arrowTxt}>&#8250;</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.taskCount}>
          {tasks.length} task{tasks.length !== 1 ? 's' : ''}
        </Text>

        <TouchableOpacity style={s.addBtn} onPress={addTask} activeOpacity={0.8}>
          <Text style={{ color: C.primary, fontWeight: '700', fontSize: 14 }}>+</Text>
          <Text style={s.addBtnTxt}>ADD TASK</Text>
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
                onOpenDatePicker={openDatePicker}
              />
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
