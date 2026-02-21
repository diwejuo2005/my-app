import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Modal,
} from 'react-native';
import { useTheme } from './shared/ThemeContext';
import { storage } from './shared/constants';

// ─── Duke University wordmark ─────────────────────────────────────────────────
// Approximates the official Duke wordmark: serif "Duke" + small-caps "UNIVERSITY"
function DukeLogo() {
  return (
    <View style={{ alignItems: 'flex-start', justifyContent: 'center' }}>
      <Text
        style={{
          fontFamily:
            Platform.OS === 'web'
              ? 'Georgia, "Palatino Linotype", "Book Antiqua", Palatino, serif'
              : 'serif',
          fontSize: 22,
          fontWeight: '700',
          color: '#012169',
          letterSpacing: 0.3,
          lineHeight: 24,
          includeFontPadding: false,
        }}
      >
        Duke
      </Text>
      <Text
        style={{
          fontFamily:
            Platform.OS === 'web'
              ? '"Arial Narrow", Arial, sans-serif'
              : 'sans-serif',
          fontSize: 7.5,
          fontWeight: '700',
          color: '#012169',
          letterSpacing: 2.8,
          lineHeight: 10,
          includeFontPadding: false,
        }}
      >
        UNIVERSITY
      </Text>
    </View>
  );
}

// ─── Avatar button ────────────────────────────────────────────────────────────
function AvatarButton({ profile, onPress }) {
  const { C } = useTheme();
  const initial = profile?.firstName?.[0]?.toUpperCase() ?? '?';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: C.primary,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: C.primary + '55',
      }}
    >
      <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>
        {initial}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Avatar dropdown ──────────────────────────────────────────────────────────
function AvatarDropdown({ visible, profile, onClose, onSignOut }) {
  const { C } = useTheme();
  const [history, setHistory] = useState([]);

  // Load recent completions each time the dropdown opens
  useEffect(() => {
    if (visible) {
      storage.get('completionHistory').then(data => {
        setHistory(Array.isArray(data) ? data.slice(0, 5) : []);
      });
    }
  }, [visible]);

  const navbarHeight = Platform.OS === 'ios' ? 100 : 56;
  const fullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ');

  const s = useMemo(() => StyleSheet.create({
    backdrop: { flex: 1 },
    panel: {
      position: 'absolute',
      top: navbarHeight + 4,
      right: 16,
      width: 272,
      backgroundColor: C.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: C.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 24,
      elevation: 16,
      overflow: 'hidden',
    },
    // User info section
    userSection: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      gap: 12,
      backgroundColor: C.surface2,
    },
    avatarLarge: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: C.primary,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    avatarLargeTxt: {
      color: '#fff',
      fontWeight: '800',
      fontSize: 18,
    },
    userName: {
      fontSize: 14,
      fontWeight: '700',
      color: C.text,
    },
    userEmail: {
      fontSize: 12,
      color: C.textMuted,
      marginTop: 2,
    },
    divider: {
      height: 1,
      backgroundColor: C.border,
    },
    // History section
    historySection: {
      padding: 14,
    },
    sectionLabel: {
      fontSize: 9,
      fontWeight: '700',
      color: C.textMuted,
      letterSpacing: 1.4,
      marginBottom: 10,
    },
    historyItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
      gap: 8,
    },
    historyDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: C.green,
      flexShrink: 0,
    },
    historyTitle: {
      flex: 1,
      fontSize: 12,
      color: C.text,
    },
    historyWeek: {
      fontSize: 10,
      color: C.textMuted,
      fontWeight: '600',
    },
    emptyHistory: {
      fontSize: 12,
      color: C.textMuted,
      fontStyle: 'italic',
    },
    // Sign out
    signOutSection: {
      padding: 14,
      borderTopWidth: 1,
      borderTopColor: C.border,
    },
    signOutBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 4,
    },
    signOutTxt: {
      fontSize: 13,
      fontWeight: '600',
      color: C.red,
    },
  }), [C]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* Full-screen backdrop — tap outside to close */}
      <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose}>
        {/* Panel — stop propagation so tapping inside doesn't close */}
        <TouchableOpacity activeOpacity={1} onPress={e => e?.stopPropagation?.()}>
          <View style={s.panel}>

            {/* User info */}
            <View style={s.userSection}>
              <View style={s.avatarLarge}>
                <Text style={s.avatarLargeTxt}>
                  {profile?.firstName?.[0]?.toUpperCase() ?? '?'}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.userName} numberOfLines={1}>{fullName}</Text>
                <Text style={s.userEmail} numberOfLines={1}>
                  {profile?.email || 'No email set'}
                </Text>
              </View>
            </View>

            <View style={s.divider} />

            {/* Recent completions */}
            <View style={s.historySection}>
              <Text style={s.sectionLabel}>RECENT COMPLETIONS</Text>
              {history.length === 0 ? (
                <Text style={s.emptyHistory}>No completed tasks yet.</Text>
              ) : (
                history.map((item, i) => (
                  <View key={i} style={s.historyItem}>
                    <View style={s.historyDot} />
                    <Text style={s.historyTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={s.historyWeek}>Wk {item.weekNum}</Text>
                  </View>
                ))
              )}
            </View>

            <View style={s.divider} />

            {/* Sign out */}
            <View style={s.signOutSection}>
              <TouchableOpacity
                style={s.signOutBtn}
                onPress={() => { onClose(); onSignOut(); }}
                activeOpacity={0.7}
              >
                <Text style={s.signOutTxt}>Sign Out</Text>
              </TouchableOpacity>
            </View>

          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Tab definitions ──────────────────────────────────────────────────────────
const TABS = [
  { key: 'TASKS',    label: 'Tasks'    },
  { key: 'GOALS',    label: 'Goals'    },
  { key: 'CALENDAR', label: 'Calendar' },
];

// ─── Main Navbar ──────────────────────────────────────────────────────────────
export default function Navbar({ activeTab, onTabChange, profile, onSignOut }) {
  const { C, isDark, toggleTheme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const s = useMemo(() => StyleSheet.create({
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      backgroundColor: C.surface,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
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

      {/* Right: theme toggle + user avatar */}
      <View style={s.rightArea}>
        <TouchableOpacity style={s.themeBtn} onPress={toggleTheme} activeOpacity={0.7}>
          <Text style={s.themeTxt}>{isDark ? '☀' : '☾'}</Text>
        </TouchableOpacity>

        <AvatarButton profile={profile} onPress={() => setDropdownOpen(true)} />

        <AvatarDropdown
          visible={dropdownOpen}
          profile={profile}
          onClose={() => setDropdownOpen(false)}
          onSignOut={onSignOut}
        />
      </View>
    </View>
  );
}
