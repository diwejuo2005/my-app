import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { C } from './shared/constants';

// showNav=1 enables Google's built-in prev/next week arrows inside the embed
const CALENDAR_URL =
  'https://calendar.google.com/calendar/embed' +
  '?src=donaldiwejuo%40gmail.com' +
  '&ctz=America%2FNew_York' +
  '&mode=WEEK' +
  '&showNav=1' +
  '&showTitle=0' +
  '&showPrint=0' +
  '&showTabs=1' +
  '&showCalendars=0' +
  '&showTz=0';

export default function CalendarPage() {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const iframe = document.createElement('iframe');
    iframe.src = CALENDAR_URL;
    iframe.title = 'Google Calendar';
    iframe.style.cssText = 'width:100%;height:100%;border:none;display:block;background:#070d1a;';
    container.appendChild(iframe);

    return () => {
      if (container && container.contains(iframe)) {
        container.removeChild(iframe);
      }
    };
  }, []);

  return (
    <View style={s.root}>
      <View style={s.pageHeader}>
        <Text style={s.pageTitle}>CALENDAR</Text>
        <Text style={s.pageSub}>
          Use the arrows inside the calendar to navigate between weeks.
          You must be signed into Google in your browser.
        </Text>
      </View>
      <View style={s.iframeContainer} ref={containerRef} />
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  pageHeader: {
    paddingHorizontal: 20,
    paddingVertical: 12,
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
    fontSize: 11,
    color: C.textMuted,
    marginTop: 3,
    lineHeight: 16,
  },
  iframeContainer: {
    flex: 1,
  },
});
