import React, { useState, useEffect, useMemo } from 'react';
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
import { storage } from './components/shared/constants';
import TaskTrackerPage from './components/TaskTrackerPage';
import YearlyGoalsPage from './components/YearlyGoalsPage';
import CalendarPage from './components/CalendarPage';
import ProfileScreen from './components/ProfileScreen';

// ─── Static brand header ──────────────────────────────────────────────────────
function AppHeader({ profile, onEditProfile }) {
  const { C, isDark, toggleTheme } = useTheme();

  const initial     = profile?.firstName?.[0]?.toUpperCase() ?? 'U';
  const displayName = [profile?.firstName, profile?.lastName]
    .filter(Boolean).join(' ').toUpperCase() || 'USER';

  const s = useMemo(() => StyleSheet.create({
    header: {
      backgroundColor: '#0a1628', // always dark — brand element
      paddingTop: Platform.OS === 'ios' ? 54 : Platform.OS === 'android' ? 28 : 20,
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
    headerTextBlock: {
      flex: 1,
    },
    headerName: {
      fontSize: 15,
      fontWeight: '700',
      color: '#ffffff',       // always white — dark header bg
      letterSpacing: 0.5,
    },
    headerSub: {
      fontSize: 10,
      fontWeight: '600',
      color: '#94a3b8',       // always readable on dark header bg
      letterSpacing: 1.4,
      marginTop: 1,
    },
    themeToggle: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: 'rgba(255,255,255,0.08)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.15)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    themeToggleTxt: {
      fontSize: 16,
    },
    headerAccentLine: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 2,
      backgroundColor: C.accent,
    },
  }), [C]);

  return (
    <View style={s.header}>
      <View style={s.headerInner}>
        <View style={s.badge}>
          <Text style={s.badgeText}>{initial}</Text>
        </View>
        <View style={s.headerTextBlock}>
          <TouchableOpacity onPress={onEditProfile} activeOpacity={0.7}>
            <Text style={s.headerName}>{displayName}</Text>
          </TouchableOpacity>
          <Text style={s.headerSub}>TASK TRACKER</Text>
        </View>
        <TouchableOpacity onPress={toggleTheme} style={s.themeToggle} activeOpacity={0.7}>
          <Text style={s.themeToggleTxt}>{isDark ? '☀' : '☾'}</Text>
        </TouchableOpacity>
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
  const { C } = useTheme();

  const s = useMemo(() => StyleSheet.create({
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
  }), [C]);

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

// ─── Inner app (needs ThemeProvider above it) ─────────────────────────────────
function AppInner() {
  const { C, isDark } = useTheme();
  const [profileStatus, setProfileStatus] = useState('loading'); // 'loading'|'none'|'ready'
  const [profile,       setProfile]       = useState(null);
  const [activeTab,     setActiveTab]     = useState('TASKS');

  // Load profile from storage
  useEffect(() => {
    storage.get('userProfile').then(p => {
      if (p?.firstName) {
        setProfile(p);
        setProfileStatus('ready');
      } else {
        setProfileStatus('none');
      }
    });
  }, []);

  const handleProfileComplete = (p) => {
    setProfile(p);
    setProfileStatus('ready');
  };

  // Loading splash — imperceptible but prevents flash
  if (profileStatus === 'loading') {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <StatusBar style="light" />
      </View>
    );
  }

  // Profile setup / edit screen
  if (profileStatus === 'none') {
    return (
      <>
        <StatusBar style="light" />
        <ProfileScreen
          onComplete={handleProfileComplete}
          existingProfile={profile}
        />
      </>
    );
  }

  // Main app
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AppHeader
        profile={profile}
        onEditProfile={() => setProfileStatus('none')}
      />
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

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
