import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Member } from '../context/MembersContext';
import { SafetyItem } from './safety';

const SEEN_KEY = 'instereo_seen_alerts';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

async function getSeen(): Promise<Set<string>> {
  const raw = await AsyncStorage.getItem(SEEN_KEY);
  return new Set<string>(raw ? JSON.parse(raw) : []);
}

async function markSeen(ids: Set<string>) {
  await AsyncStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(ids)));
}

// Only urgent items notify (shootings, disasters, official severe alerts);
// "heads up" items just show in the feed.
export async function notifyCritical(member: Member, item: SafetyItem) {
  if (item.severity !== 'urgent') return;

  const settingsRaw = await AsyncStorage.getItem('instereo_settings');
  if (settingsRaw) {
    try {
      const settings = JSON.parse(settingsRaw);
      if (settings.notificationsEnabled === false) return;
    } catch {}
  }

  const seen = await getSeen();
  if (seen.has(item.id)) return;

  const granted = await requestNotificationPermission();
  if (!granted) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `Alert near ${member.name}${member.city ? ` (${member.city})` : ''}`,
      body: item.title,
      data: { url: item.url, memberId: member.id },
    },
    trigger: null,
  });

  seen.add(item.id);
  // Cap memory: keep last 200
  const trimmed = new Set(Array.from(seen).slice(-200));
  await markSeen(trimmed);
}

export async function notifyBirthday(member: Member, type: 'birthday' | 'anniversary') {
  const settingsRaw = await AsyncStorage.getItem('instereo_settings');
  if (settingsRaw) {
    try {
      const s = JSON.parse(settingsRaw);
      if (s.notificationsEnabled === false) return;
    } catch {}
  }
  const seen = await getSeen();
  const today = new Date().toISOString().split('T')[0];
  const key = `${type}-${member.id}-${today}`;
  if (seen.has(key)) return;
  const granted = await requestNotificationPermission();
  if (!granted) return;
  const label = type === 'birthday' ? `Today is ${member.name}'s birthday!` : `${member.name}'s anniversary is today!`;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'inStereo Reminder',
      body: label,
      data: { memberId: member.id, type },
    },
    trigger: null,
  });
  seen.add(key);
  const trimmed = new Set(Array.from(seen).slice(-200));
  await markSeen(trimmed);
}
