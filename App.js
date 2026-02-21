import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { C } from './components/shared/constants';
import TaskTrackerPage from './components/TaskTrackerPage';
import YearlyGoalsPage from './components/YearlyGoalsPage';
import CalendarPage from './components/CalendarPage';

// ─── Static brand header ──────────────────────────────────────────────────────
function AppHeader() {
  return (
    <View style={s.header}>
      <View style={s.headerInner}>
        <View style={s.badge}>
          <Text style={s.badgeText}>D</Text>
        </View>
        <View>
          <Text style={s.headerName}>DON IWEJUO</Text>
          <Text style={s.headerSub}>WEEKLY TRACKER</Text>
        </View>
      </View>
      <View style={s.headerAccentLine} />
    </View>
  );
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'TASKS',    label: 'TASK TRACKER' },
  { key: 'GOALS',    label: 'YEARLY GOALS' },
  { key: 'CALENDAR', label: 'CALENDAR' },
];

function TabBar({ activeTab, onTabChange }) {
  return (
    <View style={s.tabBar}>
      {TABS.map(tab => {
        const active = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={s.tabItem}
            onPress={() => onTabChange(tab.key)}
            activeOpacity={0.7}
          >
            <Text style={[s.tabLabel, active && s.tabLabelActive]}>
              {tab.label}
            </Text>
            {active && <View style={s.tabActiveLine} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Root app ─────────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab] = useState('TASKS');

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style="light" />
      <AppHeader />
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === 'TASKS'    && <TaskTrackerPage />}
      {activeTab === 'GOALS'    && <YearlyGoalsPage />}
      {activeTab === 'CALENDAR' && <CalendarPage />}
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },

  // Header
  header: {
    backgroundColor: '#0a1628',
    paddingTop:  Platform.OS === 'ios' ? 54 : Platform.OS === 'android' ? 28 : 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
    position: 'relative',
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(59,130,246,0.35)',
  },
  badgeText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 18,
  },
  headerName: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
    letterSpacing: 0.5,
  },
  headerSub: {
    fontSize: 10,
    fontWeight: '600',
    color: C.textMuted,
    letterSpacing: 1.4,
    marginTop: 1,
  },
  headerAccentLine: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: C.accent,
  },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 13,
    alignItems: 'center',
    position: 'relative',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: C.textMuted,
  },
  tabLabelActive: {
    color: C.accent,
  },
  tabActiveLine: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: C.accent,
  },
});
