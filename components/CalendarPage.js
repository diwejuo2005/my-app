import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { useTheme } from './shared/ThemeContext';
import { storage } from './shared/constants';

function buildCalendarUrl(email) {
  const src = email ? `&src=${encodeURIComponent(email)}` : '';
  return (
    'https://calendar.google.com/calendar/embed?' +
    'mode=WEEK' + src +
    '&ctz=America%2FNew_York&showNav=1&showTitle=0&showPrint=0&showTabs=1&showCalendars=0'
  );
}

export default function CalendarPage() {
  const { C } = useTheme();
  const [email, setEmail] = useState('');

  useEffect(() => {
    storage.get('userProfile').then(p => setEmail(p?.email ?? ''));
  }, []);

  const s = useMemo(() => StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    pageHeader: {
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
      backgroundColor: C.surface,
    },
    pageTitle: { fontSize: 11, fontWeight: '700', color: C.text, letterSpacing: 1.4 },
    pageSub:   { fontSize: 11, color: C.textMuted, marginTop: 3 },
    body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 20 },
    bodyText: { fontSize: 14, color: C.textSec, textAlign: 'center', lineHeight: 22 },
    openBtn: { backgroundColor: C.primary, borderRadius: 8, paddingHorizontal: 24, paddingVertical: 12 },
    openBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 13, letterSpacing: 0.8 },
  }), [C]);

  return (
    <View style={s.root}>
      <View style={s.pageHeader}>
        <Text style={s.pageTitle}>CALENDAR</Text>
        <Text style={s.pageSub}>Opens your Google Calendar in the browser.</Text>
      </View>
      <View style={s.body}>
        <Text style={s.bodyText}>
          Google Calendar is available in your browser. Tap the button below to open it.
        </Text>
        <TouchableOpacity
          style={s.openBtn}
          onPress={() => Linking.openURL(buildCalendarUrl(email))}
          activeOpacity={0.8}
        >
          <Text style={s.openBtnTxt}>OPEN CALENDAR IN BROWSER</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
