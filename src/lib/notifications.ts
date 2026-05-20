import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Member } from '../context/MembersContext';

const SEEN_KEY = 'ensemble_seen_alerts';

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

export async function notifyCritical(member: Member, article: { title: string; link: string; desc: string }) {
  const settingsRaw = await AsyncStorage.getItem('ensemble_settings');
  if (settingsRaw) {
    try {
      const settings = JSON.parse(settingsRaw);
      if (settings.notificationsEnabled === false) return;
    } catch {}
  }

  const id = article.link;
  const seen = await getSeen();
  if (seen.has(id)) return;

  const granted = await requestNotificationPermission();
  if (!granted) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `Alert near ${member.name}`,
      body: article.title,
      data: { url: article.link, memberId: member.id },
    },
    trigger: null,
  });

  seen.add(id);
  // Cap memory: keep last 200
  const trimmed = new Set(Array.from(seen).slice(-200));
  await markSeen(trimmed);
}
