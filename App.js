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
import LogoMark from './components/LogoMark';
import TaskTrackerPage from './components/TaskTrackerPage';
import YearlyGoalsPage from './components/YearlyGoalsPage';
import CalendarPage from './components/CalendarPage';
import ProfileScreen from './components/ProfileScreen';

// ─── Tab definitions ──────────────────────────────────────────────────────────
const TABS = [
  { key: 'TASKS',    label: 'Tasks'    },
  { key: 'GOALS',    label: 'Goals'    },
  { key: 'CALENDAR', label: 'Calendar' },
];

// ─── Slim Notion-style Navbar ─────────────────────────────────────────────────
function Navbar({ profile, activeTab, onTabChange, onEditProfile }) {
  const { C, isDark, toggleTheme } = useTheme();

  const firstName = profile?.firstName ?? '';
  const initial   = firstName[0]?.toUpperCase() ?? 'U';
  const appName   = firstName ? `${firstName}'s Tracker` : 'Task Tracker';

  const s = useMemo(() => StyleSheet.create({
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 56,
      paddingHorizontal: 16,
      backgroundColor: C.surface,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
      // safe area top pad on iOS
      paddingTop: Platform.OS === 'ios' ? 44 : 0,
      height: Platform.OS === 'ios' ? 100 : 56,
    },
    logoArea: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
    },
    appName: {
      fontSize: 14,
      fontWeight: '700',
      color: C.text,
      letterSpacing: 0.2,
    },
    navLinks: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 0,
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
      gap: 8,
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
    avatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: C.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarTxt: {
      color: '#fff',
      fontWeight: '800',
      fontSize: 13,
    },
  }), [C]);

  return (
    <View style={s.bar}>
      {/* Left: logo + app name */}
      <View style={s.logoArea}>
        <LogoMark size={28} />
        <Text style={s.appName}>{appName}</Text>
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

      {/* Right: theme toggle + avatar */}
      <View style={s.rightArea}>
        <TouchableOpacity style={s.themeBtn} onPress={toggleTheme} activeOpacity={0.7}>
          <Text style={s.themeTxt}>{isDark ? '☀' : '☾'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.avatar} onPress={onEditProfile} activeOpacity={0.8}>
          <Text style={s.avatarTxt}>{initial}</Text>
        </TouchableOpacity>
      </View>
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

  // Loading splash
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
        <StatusBar style={isDark ? 'light' : 'dark'} />
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

      <Navbar
        profile={profile}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onEditProfile={() => setProfileStatus('none')}
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
