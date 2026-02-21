import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { C, storage } from './shared/constants';

// ─── Check item row ───────────────────────────────────────────────────────────
function CheckItemRow({ item, onToggle, onChangeText, onDelete }) {
  return (
    <View style={s.checkRow}>
      <TouchableOpacity onPress={onToggle} style={s.checkbox} activeOpacity={0.7}>
        {item.checked && <View style={s.checkboxFill} />}
      </TouchableOpacity>
      <TextInput
        style={[s.checkInput, item.checked && s.checkInputDone]}
        value={item.text}
        onChangeText={onChangeText}
        placeholder="Step or milestone..."
        placeholderTextColor={C.textMuted}
      />
      <TouchableOpacity onPress={onDelete} hitSlop={10}>
        <Text style={s.checkDeleteTxt}>X</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Goal card ────────────────────────────────────────────────────────────────
function GoalCard({ goal, onUpdate, onDelete, onToggleExpanded, onAddCheckItem, onUpdateCheckItem, onDeleteCheckItem }) {
  const done  = goal.checkItems.filter(ci => ci.checked).length;
  const total = goal.checkItems.length;

  return (
    <View style={s.goalCard}>

      {/* Header row — always visible */}
      <View style={s.goalHeader}>
        <TouchableOpacity onPress={onToggleExpanded} style={s.chevronBtn} activeOpacity={0.7}>
          <Text style={s.chevronTxt}>{goal.expanded ? '▾' : '▸'}</Text>
        </TouchableOpacity>

        <TextInput
          style={s.goalTitleInput}
          value={goal.title}
          onChangeText={v => onUpdate('title', v)}
          placeholder="Goal title..."
          placeholderTextColor={C.textMuted}
        />

        {total > 0 && (
          <Text style={s.goalProgress}>{done}/{total}</Text>
        )}

        <TouchableOpacity onPress={onDelete} hitSlop={10} style={s.goalDeleteBtn}>
          <Text style={s.goalDeleteTxt}>X</Text>
        </TouchableOpacity>
      </View>

      {/* Expandable body */}
      {goal.expanded && (
        <View style={s.goalBody}>

          {/* Description */}
          <Text style={s.sectionLabel}>DESCRIPTION / STEPS</Text>
          <TextInput
            style={s.descInput}
            value={goal.description}
            onChangeText={v => onUpdate('description', v)}
            placeholder="Describe this goal, outline steps, add context..."
            placeholderTextColor={C.textMuted}
            multiline
            textAlignVertical="top"
          />

          {/* Check items */}
          <View style={s.checkItemsHeader}>
            <Text style={s.sectionLabel}>CHECK ITEMS</Text>
            <TouchableOpacity onPress={onAddCheckItem}>
              <Text style={s.addCheckItemTxt}>+ ADD ITEM</Text>
            </TouchableOpacity>
          </View>

          {goal.checkItems.length === 0 && (
            <Text style={s.noItemsTxt}>No check items yet. Press + ADD ITEM.</Text>
          )}

          {goal.checkItems.map(ci => (
            <CheckItemRow
              key={ci.id}
              item={ci}
              onToggle={() => onUpdateCheckItem(ci.id, 'checked', !ci.checked)}
              onChangeText={v => onUpdateCheckItem(ci.id, 'text', v)}
              onDelete={() => onDeleteCheckItem(ci.id)}
            />
          ))}
        </View>
      )}

      {/* Collapsed progress bar — shows when collapsed and has items */}
      {!goal.expanded && total > 0 && (
        <View style={s.collapsedBar}>
          <View style={[
            s.collapsedBarFill,
            {
              flex: done,
              backgroundColor: done === total ? C.green : C.primary,
            },
          ]} />
          <View style={{ flex: Math.max(0, total - done) }} />
        </View>
      )}
    </View>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function YearlyGoalsPage() {
  const [goals, setGoals] = useState([]);
  const counter = useRef(0);

  const nextId = () => `id_${Date.now()}_${++counter.current}`;

  // Load
  useEffect(() => {
    storage.get('yearlyGoals').then(data => {
      if (Array.isArray(data)) setGoals(data);
    });
  }, []);

  // Save
  useEffect(() => {
    storage.set('yearlyGoals', goals);
  }, [goals]);

  // ── Goal CRUD
  const addGoal = () => {
    setGoals(prev => [...prev, {
      id: nextId(),
      title: '',
      description: '',
      checkItems: [],
      expanded: true,
    }]);
  };

  const updateGoal = (id, field, value) => {
    setGoals(prev => prev.map(g => g.id === id ? { ...g, [field]: value } : g));
  };

  const deleteGoal = (id) => {
    setGoals(prev => prev.filter(g => g.id !== id));
  };

  const toggleExpanded = (id) => {
    setGoals(prev => prev.map(g => g.id === id ? { ...g, expanded: !g.expanded } : g));
  };

  // ── Check item CRUD
  const addCheckItem = (goalId) => {
    setGoals(prev => prev.map(g => {
      if (g.id !== goalId) return g;
      return { ...g, checkItems: [...g.checkItems, { id: nextId(), text: '', checked: false }] };
    }));
  };

  const updateCheckItem = (goalId, itemId, field, value) => {
    setGoals(prev => prev.map(g => {
      if (g.id !== goalId) return g;
      return {
        ...g,
        checkItems: g.checkItems.map(ci => ci.id === itemId ? { ...ci, [field]: value } : ci),
      };
    }));
  };

  const deleteCheckItem = (goalId, itemId) => {
    setGoals(prev => prev.map(g => {
      if (g.id !== goalId) return g;
      return { ...g, checkItems: g.checkItems.filter(ci => ci.id !== itemId) };
    }));
  };

  return (
    <View style={s.root}>

      {/* Page header */}
      <View style={s.pageHeader}>
        <View>
          <Text style={s.pageTitle}>YEARLY GOALS</Text>
          <Text style={s.pageSub}>{goals.length} goal{goals.length !== 1 ? 's' : ''} · {new Date().getFullYear()}</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={addGoal} activeOpacity={0.8}>
          <Text style={s.addBtnTxt}>+ ADD GOAL</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.listContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {goals.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyTitle}>NO GOALS YET</Text>
            <Text style={s.emptySub}>Press + ADD GOAL to define your yearly objectives.</Text>
          </View>
        ) : (
          goals.map(goal => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onUpdate={(field, value)      => updateGoal(goal.id, field, value)}
              onDelete={()                  => deleteGoal(goal.id)}
              onToggleExpanded={()          => toggleExpanded(goal.id)}
              onAddCheckItem={()            => addCheckItem(goal.id)}
              onUpdateCheckItem={(itemId, field, value) => updateCheckItem(goal.id, itemId, field, value)}
              onDeleteCheckItem={(itemId)   => deleteCheckItem(goal.id, itemId)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },

  // Page header
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.surface,
  },
  pageTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: C.text,
    letterSpacing: 1.4,
  },
  pageSub: {
    fontSize: 10,
    color: C.textMuted,
    marginTop: 2,
    letterSpacing: 0.3,
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
    fontSize: 11,
    letterSpacing: 0.8,
  },

  // List
  listContent: {
    padding: 16,
    paddingBottom: 48,
    gap: 10,
    maxWidth: 860,
    alignSelf: 'center',
    width: '100%',
  },

  // Goal card
  goalCard: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 10,
  },
  chevronBtn: {
    width: 22,
    alignItems: 'center',
  },
  chevronTxt: {
    color: C.textSec,
    fontSize: 13,
  },
  goalTitleInput: {
    flex: 1,
    color: C.text,
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 2,
  },
  goalProgress: {
    fontSize: 11,
    fontWeight: '700',
    color: C.textMuted,
    minWidth: 32,
    textAlign: 'right',
    letterSpacing: 0.3,
  },
  goalDeleteBtn: {
    padding: 4,
  },
  goalDeleteTxt: {
    color: C.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },

  // Goal body
  goalBody: {
    borderTopWidth: 1,
    borderTopColor: C.border,
    padding: 14,
    gap: 12,
    backgroundColor: C.surface2,
  },
  sectionLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: C.textMuted,
    letterSpacing: 1.4,
    marginBottom: 4,
  },
  descInput: {
    color: C.textSec,
    fontSize: 13,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 6,
    padding: 10,
    backgroundColor: C.bg,
    minHeight: 80,
    textAlignVertical: 'top',
    lineHeight: 20,
  },

  // Check items
  checkItemsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addCheckItemTxt: {
    fontSize: 10,
    fontWeight: '700',
    color: C.primary,
    letterSpacing: 0.8,
  },
  noItemsTxt: {
    fontSize: 11,
    color: C.textMuted,
    fontStyle: 'italic',
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 1.5,
    borderColor: C.primary,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkboxFill: {
    width: 10,
    height: 10,
    backgroundColor: C.primary,
    borderRadius: 2,
  },
  checkInput: {
    flex: 1,
    color: C.text,
    fontSize: 13,
    paddingVertical: 2,
  },
  checkInputDone: {
    color: C.textMuted,
  },
  checkDeleteTxt: {
    color: C.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },

  // Collapsed bar
  collapsedBar: {
    height: 2,
    flexDirection: 'row',
    backgroundColor: C.border,
  },
  collapsedBarFill: {
    height: '100%',
  },

  // Empty
  empty: {
    alignItems: 'center',
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
  },
});
