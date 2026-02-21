import React, { useState, useEffect } from 'react';
import {
  View,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from './components/shared/ThemeContext';
import { storage, setStorageUser } from './components/shared/constants';
import Navbar from './components/Navbar';
import SearchBar from './components/SearchBar';
import TaskTrackerPage from './components/TaskTrackerPage';
import YearlyGoalsPage from './components/YearlyGoalsPage';
import CalendarPage from './components/CalendarPage';
import ProfileScreen from './components/ProfileScreen';

// ─── Inner app (needs ThemeProvider above it) ─────────────────────────────────
function AppInner() {
  const { C, isDark } = useTheme();

  // Auth state
  const [profile,       setProfile]       = useState(null);
  const [profileLoaded, setProfileLoaded] = useState(false);

  // Navigation state
  const [activeTab,   setActiveTab]   = useState('TASKS');
  const [currentWeek, setCurrentWeek] = useState(6); // lifted from TaskTrackerPage

  // Load profile on first mount.
  // IMPORTANT: read userProfile first (global key, no prefix), then set the
  // per-user prefix, then read user-specific data so keys are correct.
  useEffect(() => {
    storage.get('userProfile').then(p => {
      const validProfile = p?.firstName ? p : null;

      // Restore the per-user storage prefix for returning users
      if (validProfile?.email) {
        setStorageUser(validProfile.email);
      }

      setProfile(validProfile);

      // Now read user-specific data (prefix is set)
      storage.get('taskTracker').then(t => {
        if (t?.week) setCurrentWeek(t.week);
        setProfileLoaded(true);
      });
    });
  }, []);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleProfileComplete = (p) => {
    // Activate the per-user storage namespace before any data is saved
    setStorageUser(p.email);
    setProfile(p);
  };

  const handleSignOut = async () => {
    await storage.set('userProfile', null); // global key — always clears correctly
    setStorageUser('');                      // clear namespace prefix
    setProfile(null);
    setActiveTab('TASKS');
    setCurrentWeek(6);
  };

  const handleSearchNavigate = (weekNum) => {
    setCurrentWeek(weekNum);
    setActiveTab('TASKS');
  };

  // ── Render branches ─────────────────────────────────────────────────────────

  // Still reading storage — blank to avoid flash
  if (!profileLoaded) {
    return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  }

  // No profile → force login
  if (!profile) {
    return (
      <>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <ProfileScreen onComplete={handleProfileComplete} />
      </>
    );
  }

  // ── Main app ────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        profile={profile}
        onSignOut={handleSignOut}
      />

      {activeTab === 'TASKS' && (
        <>
          <SearchBar onNavigate={handleSearchNavigate} />
          <TaskTrackerPage week={currentWeek} onWeekChange={setCurrentWeek} />
        </>
      )}
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
