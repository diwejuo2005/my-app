import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { useTheme } from './shared/ThemeContext';
import { storage } from './shared/constants';
import LogoMark from './LogoMark';

export default function ProfileScreen({ onComplete, existingProfile }) {
  const { C } = useTheme();

  const [firstName, setFirstName] = useState(existingProfile?.firstName ?? '');
  const [lastName,  setLastName]  = useState(existingProfile?.lastName  ?? '');
  const [email,     setEmail]     = useState(existingProfile?.email     ?? '');
  const [error,     setError]     = useState('');

  const isEditing = !!existingProfile?.firstName;

  const handleSubmit = async () => {
    if (!firstName.trim()) {
      setError('First name is required.');
      return;
    }
    if (!lastName.trim()) {
      setError('Last name is required.');
      return;
    }
    if (!email.trim()) {
      setError('Gmail address is required to sync your calendar.');
      return;
    }
    const profile = {
      firstName: firstName.trim(),
      lastName:  lastName.trim(),
      email:     email.trim().toLowerCase(),
    };
    await storage.set('userProfile', profile);
    onComplete(profile);
  };

  const s = useMemo(() => StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: C.bg,
    },
    scroll: {
      flexGrow: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      paddingVertical: 60,
    },
    logoWrap: {
      marginBottom: 20,
    },
    title: {
      fontSize: 20,
      fontWeight: '800',
      color: C.text,
      letterSpacing: 2,
      marginBottom: 6,
    },
    sub: {
      fontSize: 13,
      color: C.textSec,
      marginBottom: 36,
      textAlign: 'center',
    },
    form: {
      width: '100%',
      maxWidth: 400,
    },
    label: {
      fontSize: 9,
      fontWeight: '700',
      color: C.textMuted,
      letterSpacing: 1.4,
      marginBottom: 6,
    },
    input: {
      backgroundColor: C.surface2,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 8,
      color: C.text,
      fontSize: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginBottom: 16,
    },
    inputFocused: {
      borderColor: C.primary,
    },
    hint: {
      fontSize: 10,
      color: C.textMuted,
      marginTop: -12,
      marginBottom: 16,
      lineHeight: 15,
    },
    errorText: {
      fontSize: 12,
      color: C.red,
      marginBottom: 12,
      textAlign: 'center',
    },
    btn: {
      backgroundColor: C.primary,
      borderRadius: 8,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 4,
    },
    btnTxt: {
      color: '#fff',
      fontWeight: '800',
      fontSize: 13,
      letterSpacing: 1.2,
    },
    cancelBtn: {
      marginTop: 14,
      alignItems: 'center',
    },
    cancelTxt: {
      fontSize: 12,
      color: C.textMuted,
      letterSpacing: 0.5,
    },
  }), [C]);

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={s.logoWrap}>
          <LogoMark size={64} />
        </View>

        <Text style={s.title}>TASK TRACKER</Text>
        <Text style={s.sub}>
          {isEditing
            ? 'Update your profile details below.'
            : 'Set up your profile to get started.'}
        </Text>

        {!!error && <Text style={s.errorText}>{error}</Text>}

        <View style={s.form}>
          <Text style={s.label}>FIRST NAME</Text>
          <TextInput
            style={s.input}
            value={firstName}
            onChangeText={v => { setFirstName(v); setError(''); }}
            placeholder="e.g. Don"
            placeholderTextColor={C.textMuted}
            autoCapitalize="words"
            returnKeyType="next"
          />

          <Text style={s.label}>LAST NAME</Text>
          <TextInput
            style={s.input}
            value={lastName}
            onChangeText={v => { setLastName(v); setError(''); }}
            placeholder="e.g. Iwejuo"
            placeholderTextColor={C.textMuted}
            autoCapitalize="words"
            returnKeyType="next"
          />

          <Text style={s.label}>GMAIL ADDRESS</Text>
          <TextInput
            style={s.input}
            value={email}
            onChangeText={v => { setEmail(v); setError(''); }}
            placeholder="you@gmail.com"
            placeholderTextColor={C.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />
          <Text style={s.hint}>
            Your Google Calendar will sync using this address. Make sure you
            are signed into Google in this browser so your calendar appears.
          </Text>

          <TouchableOpacity style={s.btn} onPress={handleSubmit} activeOpacity={0.8}>
            <Text style={s.btnTxt}>
              {isEditing ? 'SAVE CHANGES' : 'GET STARTED'}
            </Text>
          </TouchableOpacity>

          {isEditing && (
            <TouchableOpacity
              style={s.cancelBtn}
              onPress={() => onComplete(existingProfile)}
              activeOpacity={0.7}
            >
              <Text style={s.cancelTxt}>CANCEL</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
