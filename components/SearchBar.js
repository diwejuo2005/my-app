import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useTheme } from './shared/ThemeContext';
import { storage } from './shared/constants';

export default function SearchBar({ onNavigate }) {
  const { C } = useTheme();
  const [query,    setQuery]    = useState('');
  const [results,  setResults]  = useState([]);
  const [open,     setOpen]     = useState(false);
  const debounceRef = useRef(null);

  const runSearch = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); setOpen(false); return; }

    const data = await storage.get('taskTracker');
    if (!data?.weeks) { setResults([]); return; }

    // Build a map: taskTitle → highest weekNum seen
    const hits = {};
    Object.entries(data.weeks).forEach(([wkStr, tasks]) => {
      if (!Array.isArray(tasks)) return;
      const wk = Number(wkStr);
      tasks.forEach(t => {
        if (!t.title) return;
        if (t.title.toLowerCase().includes(q.toLowerCase())) {
          if (!hits[t.title] || wk > hits[t.title]) {
            hits[t.title] = wk;
          }
        }
      });
    });

    const list = Object.entries(hits)
      .map(([title, weekNum]) => ({ title, weekNum }))
      .sort((a, b) => b.weekNum - a.weekNum)
      .slice(0, 8);

    setResults(list);
    setOpen(list.length > 0);
  }, []);

  const handleChange = (q) => {
    setQuery(q);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(q), 200);
  };

  const handleSelect = ({ weekNum }) => {
    setQuery('');
    setResults([]);
    setOpen(false);
    onNavigate(weekNum);
  };

  const handleBlur = () => {
    // Delay so onPress on a result fires before the dropdown disappears
    setTimeout(() => setOpen(false), 160);
  };

  const s = {
    wrap: {
      position: 'relative',
      backgroundColor: C.surface,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
      paddingHorizontal: 16,
      paddingVertical: 8,
      zIndex: 200,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: C.surface2,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      gap: 8,
      height: 36,
    },
    searchIcon: {
      fontSize: 13,
      color: C.textMuted,
    },
    input: {
      flex: 1,
      color: C.text,
      fontSize: 13,
      paddingVertical: 0,
      outlineStyle: 'none', // web — remove default input outline
    },
    clearBtn: {
      padding: 2,
    },
    clearTxt: {
      fontSize: 13,
      color: C.textMuted,
      fontWeight: '600',
    },
    dropdown: {
      position: 'absolute',
      top: 52,
      left: 16,
      right: 16,
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 8,
      zIndex: 999,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 8,
      overflow: 'hidden',
    },
    resultItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 11,
      gap: 8,
    },
    resultItemBorder: {
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    resultIcon: {
      fontSize: 11,
      color: C.textMuted,
    },
    resultTitle: {
      flex: 1,
      fontSize: 13,
      color: C.text,
    },
    resultWeek: {
      fontSize: 11,
      color: C.primary,
      fontWeight: '700',
    },
  };

  return (
    <View style={s.wrap}>
      <View style={s.inputRow}>
        <Text style={s.searchIcon}>⌕</Text>
        <TextInput
          style={s.input}
          value={query}
          onChangeText={handleChange}
          placeholder="Search tasks across all weeks..."
          placeholderTextColor={C.textMuted}
          onFocus={() => query && setOpen(results.length > 0)}
          onBlur={handleBlur}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity
            style={s.clearBtn}
            onPress={() => { setQuery(''); setResults([]); setOpen(false); }}
          >
            <Text style={s.clearTxt}>×</Text>
          </TouchableOpacity>
        )}
      </View>

      {open && results.length > 0 && (
        <View style={s.dropdown}>
          {results.map((r, i) => (
            <TouchableOpacity
              key={i}
              style={[s.resultItem, i < results.length - 1 && s.resultItemBorder]}
              onPress={() => handleSelect(r)}
              activeOpacity={0.7}
            >
              <Text style={s.resultIcon}>↗</Text>
              <Text style={s.resultTitle} numberOfLines={1}>{r.title}</Text>
              <Text style={s.resultWeek}>Week {r.weekNum}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}
