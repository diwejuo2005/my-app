import React, { useState, useEffect } from 'react';
import {
  View,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from './components/shared/ThemeContext';
import { storage } from './components/shared/constants';
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
  const [activeTab,    setActiveTab]    = useState('TASKS');
  const [currentWeek,  setCurrentWeek]  = useState(6); // lifted from TaskTrackerPage

  // Load profile + last-used week from storage on first mount
  useEffect(() => {
    Promise.all([
      storage.get('userProfile'),
      storage.get('taskTracker'),
    ]).then(([p, t]) => {
      setProfile(p?.firstName ? p : null);
      if (t?.week) setCurrentWeek(t.week);
      setProfileLoaded(true);
    });
  }, []);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleProfileComplete = (p) => setProfile(p);

  const handleSignOut = async () => {
    await storage.set('userProfile', null);
    setProfile(null);
    setActiveTab('TASKS');
  };

  const handleSearchNavigate = (weekNum) => {
    setCurrentWeek(weekNum);
    setActiveTab('TASKS');
  };

  // ── Render branches ─────────────────────────────────────────────────────────

  // Still checking storage — render blank to avoid flash
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
