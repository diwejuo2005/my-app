import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from './components/shared/ThemeContext';
import TaskTrackerPage from './components/TaskTrackerPage';
import YearlyGoalsPage from './components/YearlyGoalsPage';
import CalendarPage from './components/CalendarPage';

// ─── Tab definitions ──────────────────────────────────────────────────────────
const TABS = [
  { key: 'TASKS',    label: 'Tasks'    },
  { key: 'GOALS',    label: 'Goals'    },
  { key: 'CALENDAR', label: 'Calendar' },
];

// ─── Duke wordmark ────────────────────────────────────────────────────────────
function DukeLogo() {
  return (
    <Text
      style={{
        fontFamily:
          Platform.OS === 'web'
            ? 'Georgia, "Palatino Linotype", "Book Antiqua", Palatino, serif'
            : 'serif',
        fontSize: 26,
        fontWeight: '700',
        color: '#012169', // Duke official navy
        letterSpacing: 0.5,
        lineHeight: 32,
      }}
    >
      Duke
    </Text>
  );
}

// ─── Slim Notion-style Navbar ─────────────────────────────────────────────────
function Navbar({ activeTab, onTabChange }) {
  const { C, isDark, toggleTheme } = useTheme();

  const s = useMemo(() => StyleSheet.create({
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      backgroundColor: C.surface,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
      // iOS safe area
      paddingTop: Platform.OS === 'ios' ? 44 : 0,
      height: Platform.OS === 'ios' ? 100 : 56,
    },
    logoArea: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    navLinks: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    navItem: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      position: 'relative',
    },
    navTxt: {
      fontSize: 13,
      fontWeight: '500',
      color: C.textSec,
    },
    navTxtActive: {
      color: C.primary,
      fontWeight: '700',
    },
    navUnderline: {
      position: 'absolute',
      bottom: -1,
      left: 12,
      right: 12,
      height: 2,
      borderRadius: 1,
      backgroundColor: C.primary,
    },
    navSep: {
      width: 1,
      height: 14,
      backgroundColor: C.border,
    },
    rightArea: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
    },
    themeBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: C.surface2,
      borderWidth: 1,
      borderColor: C.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    themeTxt: {
      fontSize: 14,
    },
  }), [C]);

  return (
    <View style={s.bar}>
      {/* Left: Duke wordmark */}
      <View style={s.logoArea}>
        <DukeLogo />
      </View>

      {/* Center: tab nav links */}
      <View style={s.navLinks}>
        {TABS.map((tab, idx) => {
          const active = activeTab === tab.key;
          return (
            <React.Fragment key={tab.key}>
              {idx > 0 && <View style={s.navSep} />}
              <TouchableOpacity
                style={s.navItem}
                onPress={() => onTabChange(tab.key)}
                activeOpacity={0.7}
              >
                <Text style={[s.navTxt, active && s.navTxtActive]}>{tab.label}</Text>
                {active && <View style={s.navUnderline} />}
              </TouchableOpacity>
            </React.Fragment>
          );
        })}
      </View>

      {/* Right: theme toggle only */}
      <View style={s.rightArea}>
        <TouchableOpacity style={s.themeBtn} onPress={toggleTheme} activeOpacity={0.7}>
          <Text style={s.themeTxt}>{isDark ? '☀' : '☾'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Inner app (needs ThemeProvider above it) ─────────────────────────────────
function AppInner() {
  const { C, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState('TASKS');

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {activeTab === 'TASKS'    && <TaskTrackerPage />}
      {activeTab === 'GOALS'    && <YearlyGoalsPage />}
      {activeTab === 'CALENDAR' && <CalendarPage />}
    </KeyboardAvoidingView>
  );
}

// ─── Root — ThemeProvider shell ───────────────────────────────────────────────
export default function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}
