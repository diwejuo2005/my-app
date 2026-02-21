import React, { useRef, useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from './shared/ThemeContext';
import { storage } from './shared/constants';

function buildCalendarUrl(email) {
  const base = 'https://calendar.google.com/calendar/embed';
  const src   = email ? `&src=${encodeURIComponent(email)}` : '';
  return (
    base + '?' +
    'mode=WEEK' +
    src +
    '&ctz=America%2FNew_York' +
    '&showNav=1' +
    '&showTitle=0' +
    '&showPrint=0' +
    '&showTabs=1' +
    '&showCalendars=0' +
    '&showTz=0'
  );
}

export default function CalendarPage() {
  const { C } = useTheme();
  const containerRef   = useRef(null);
  const [calendarEmail, setCalendarEmail] = useState(undefined); // undefined = still loading

  // Load profile email first
  useEffect(() => {
    storage.get('userProfile').then(p => {
      setCalendarEmail(p?.email ?? '');
    });
  }, []);

  // Mount iframe only after email is resolved; re-mount if email changes
  useEffect(() => {
    if (calendarEmail === undefined) return;
    const container = containerRef.current;
    if (!container) return;

    const iframe = document.createElement('iframe');
    iframe.src   = buildCalendarUrl(calendarEmail);
    iframe.title = 'Google Calendar';
    iframe.style.cssText = 'width:100%;height:100%;border:none;display:block;';
    container.appendChild(iframe);

    return () => {
      if (container && container.contains(iframe)) {
        container.removeChild(iframe);
      }
    };
  }, [calendarEmail]);

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
    pageSub:   { fontSize: 11, color: C.textMuted, marginTop: 3, lineHeight: 16 },
    iframeContainer: { flex: 1 },
  }), [C]);

  return (
    <View style={s.root}>
      <View style={s.pageHeader}>
        <Text style={s.pageTitle}>CALENDAR</Text>
        <Text style={s.pageSub}>
          {calendarEmail
            ? `Showing calendar for ${calendarEmail}. Make sure you are signed into Google in this browser.`
            : calendarEmail === ''
              ? 'No Gmail address set. Tap your name in the header to edit your profile.'
              : 'Loading...'}
        </Text>
      </View>
      <View style={s.iframeContainer} ref={containerRef} />
    </View>
  );
}
