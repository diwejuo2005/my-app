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

const DANGER_KEYWORDS = [
  'hurricane', 'typhoon', 'cyclone', 'tornado', 'earthquake', 'tsunami',
  'flood', 'wildfire', 'forest fire', 'avalanche', 'volcano', 'eruption',
  'shooting', 'gunshot', 'gunfire', 'shot dead', 'mass shooting', 'gunman',
  'explosion', 'bomb', 'bombing', 'blast', 'detonation',
  'attack', 'terrorist', 'terrorism', 'extremist',
  'riot', 'armed conflict', 'civil war', 'massacre', 'airstrike', 'shelling',
  'chemical', 'nuclear', 'radiation leak',
  'evacuation', 'state of emergency', 'emergency alert', 'curfew',
  'death toll', 'fatalities', 'killed', 'casualties', 'dead',
  'hostage', 'kidnapping', 'abduction',
  'outbreak', 'epidemic', 'pandemic', 'quarantine',
];

function isDangerous(title: string, desc: string): boolean {
  const text = (title + ' ' + desc).toLowerCase();
  return DANGER_KEYWORDS.some(k => text.includes(k));
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

  if (!isDangerous(article.title, article.desc)) return;

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

export async function notifyBirthday(member: Member, type: 'birthday' | 'anniversary') {
  const settingsRaw = await AsyncStorage.getItem('ensemble_settings');
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
      title: 'Ensemble Reminder',
      body: label,
      data: { memberId: member.id, type },
    },
    trigger: null,
  });
  seen.add(key);
  const trimmed = new Set(Array.from(seen).slice(-200));
  await markSeen(trimmed);
}
