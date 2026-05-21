import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Audio, Video, ResizeMode } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Member } from '../context/MembersContext';

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  member: Member;
  visible: boolean;
  onClose: () => void;
  onUpdate: (updated: Member) => void;
  onDelete: (id: number) => void;
};

type Message = {
  id: string;
  text: string;
  imageUri?: string;
  videoUri?: string;
  audioUri?: string;
  timestamp: string;
  sent: boolean;
};

type NewsArticle = {
  title: string;
  link: string;
  pubDate: string;
  desc: string;
  level: 'critical' | 'important' | 'normal';
};

type CityResult = {
  city: string;
  country: string;
  timezone: string;
  lat: number;
  lon: number;
  admin1?: string;
};

type CalEvent = {
  id: string;
  title: string;
  date: string;      // "YYYY-MM-DD"
  startTime: string; // "HH:MM" 24h
  endTime: string;   // "HH:MM" 24h
  color: string;
  notes?: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const AVATAR_COLORS = ['#2d3a5a', '#2d4a3e', '#3a2d4a', '#4a3a2d', '#2d4a4a'];

function getAvatarColor(id: number) {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

const RELATIONSHIPS = [
  'Mother',
  'Father',
  'Grandmother',
  'Grandfather',
  'Sibling',
  'Partner',
  'Friend',
  'Aunt',
  'Uncle',
  'Cousin',
  'Other',
];

const COUNTRY_TAG: Record<string, string> = {
  US: 'world/united-states',
  GB: 'world/uk',
  IN: 'world/india',
  AU: 'world/australia',
  CA: 'world/canada',
  FR: 'world/france',
  DE: 'world/germany',
  JP: 'world/japan',
  CN: 'world/china',
  BR: 'world/brazil',
  NG: 'world/nigeria',
  ZA: 'world/south-africa',
  KE: 'world/kenya',
  EG: 'world/egypt',
  GH: 'world/ghana',
  PK: 'world/pakistan',
  BD: 'world/bangladesh',
  MX: 'world/mexico',
  IT: 'world/italy',
  ES: 'world/spain',
  NL: 'world/netherlands',
  RU: 'world/russia',
  UA: 'world/ukraine',
  TR: 'world/turkey',
};

const MOOD_LABELS: Record<number, string> = {
  1: 'Struggling',
  2: 'Low',
  3: 'OK',
  4: 'Good',
  5: 'Thriving',
};

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function weekStartStr(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}

function currentWeekDays(): string[] {
  const monday = new Date(weekStartStr() + 'T12:00:00');
  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

function barColor(score: number | undefined): string {
  if (!score) return 'rgba(255,255,255,0.12)';
  if (score <= 2) return '#f87171';
  if (score === 3) return '#fbbf24';
  return '#34d399';
}

function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return `${Math.round(diff / 86400)}d ago`;
}

const CRIT_KW = ["earthquake","flood","hurricane","tornado","explosion","attack","shooting","terrorism","disaster","emergency","evacuation","outbreak","pandemic","riot","coup","curfew","wildfire","tsunami","volcano"];
const IMP_KW = ["election","protest","strike","war","conflict","recession","scandal","arrested","indicted","sanctions","crisis"];

function classifyArticle(title: string, desc: string): 'critical' | 'important' | 'normal' {
  const t = (title + ' ' + desc).toLowerCase();
  if (CRIT_KW.some((k) => t.includes(k))) return 'critical';
  if (IMP_KW.some((k) => t.includes(k))) return 'important';
  return 'normal';
}

const REGION_TAGS: Record<string, string> = {
  NG:'world/africa',GH:'world/africa',KE:'world/africa',ZA:'world/africa',EG:'world/africa',ET:'world/africa',
  IN:'world/asia-pacific',JP:'world/asia-pacific',CN:'world/asia-pacific',AU:'world/asia-pacific',KR:'world/asia-pacific',
  GB:'world/europe',FR:'world/europe',DE:'world/europe',IT:'world/europe',ES:'world/europe',PL:'world/europe',
  US:'world/americas',CA:'world/americas',MX:'world/americas',BR:'world/americas',AR:'world/americas',
  SA:'world/middle-east',IL:'world/middle-east',TR:'world/middle-east',IQ:'world/middle-east',IR:'world/middle-east',
};

async function guardianFetch(url: string): Promise<NewsArticle[]> {
  try {
    const res = await fetch(url);
    const data = await res.json();
    return (data.response?.results || []).map((item: any) => {
      const desc = (item.fields?.trailText || '').replace(/<[^>]+>/g, '');
      return { title: item.webTitle, link: item.webUrl, pubDate: item.webPublicationDate, desc, level: classifyArticle(item.webTitle, desc) };
    });
  } catch { return []; }
}

async function fetchMemberNews(member: Member): Promise<NewsArticle[]> {
  const RANK: Record<string, number> = { critical: 0, important: 1, normal: 2 };
  const sort = (arr: NewsArticle[]) =>
    arr.sort((a, b) => {
      const r = (RANK[a.level] ?? 2) - (RANK[b.level] ?? 2);
      return r !== 0 ? r : new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime();
    });

  const seen = new Set<string>();
  const merge = (existing: NewsArticle[], incoming: NewsArticle[]) => {
    for (const a of incoming) { if (!seen.has(a.link)) { seen.add(a.link); existing.push(a); } }
    return existing;
  };

  const cityQ = member.city ? encodeURIComponent('"' + member.city + '"') : null;
  let articles: NewsArticle[] = [];

  // 1. City exact search — only articles that explicitly mention the city
  if (cityQ) merge(articles, await guardianFetch(`https://content.guardianapis.com/search?q=${cityQ}&api-key=test&show-fields=trailText&page-size=15&order-by=newest`));

  // 2. Country tag + city keyword (still city-specific, within the country section)
  const tag = COUNTRY_TAG[member.country];
  if (articles.length < 5 && tag && cityQ) merge(articles, await guardianFetch(`https://content.guardianapis.com/search?tag=${tag}&q=${cityQ}&api-key=test&show-fields=trailText&page-size=10&order-by=newest`));

  // 3. Country tag alone — same country, no city filter (closest fallback)
  if (articles.length < 5 && tag) merge(articles, await guardianFetch(`https://content.guardianapis.com/search?tag=${tag}&api-key=test&show-fields=trailText&page-size=10&order-by=newest`));

  return sort(articles).slice(0, 20);
}

async function searchCities(query: string): Promise<CityResult[]> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=8&language=en&format=json`;
  const res = await fetch(url);
  const data = await res.json();
  return (data.results || []).map((r: any) => ({
    city: r.name,
    country: r.country_code,
    timezone: r.timezone,
    lat: r.latitude,
    lon: r.longitude,
    admin1: r.admin1,
  }));
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ member, size = 56 }: { member: Member; size?: number }) {
  const radius = size / 2;
  const style = {
    width: size,
    height: size,
    borderRadius: radius,
    overflow: 'hidden' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };
  if (member.photoUri) {
    return <Image source={{ uri: member.photoUri }} style={style} />;
  }
  return (
    <View style={[style, { backgroundColor: getAvatarColor(member.id) }]}>
      <Text style={{ color: 'white', fontWeight: '700', fontSize: size * 0.38 }}>
        {member.name[0]?.toUpperCase() ?? '?'}
      </Text>
    </View>
  );
}

// ─── NEWS TAB ─────────────────────────────────────────────────────────────────

function newsBorderColor(level: string) {
  if (level === 'critical') return '#ef4444';
  if (level === 'important') return '#f59e0b';
  return 'rgba(34,197,94,0.45)';
}
function newsTitleColor(level: string) {
  if (level === 'critical') return '#fca5a5';
  if (level === 'important') return '#fde68a';
  return 'rgba(255,255,255,0.9)';
}

function NewsTab({ member }: { member: Member }) {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setArticles([]);
    const load = () =>
      fetchMemberNews(member)
        .then((items) => { setArticles(items); setLoading(false); })
        .catch(() => setLoading(false));
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [member.id]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 }}>
        <ActivityIndicator color="#a78bfa" />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      {articles.length === 0 && (
        <Text style={{ color: 'rgba(255,255,255,0.35)', textAlign: 'center', marginTop: 40, fontSize: 14 }}>
          No recent headlines found
        </Text>
      )}
      {articles.map((article, i) => (
        <TouchableOpacity
          key={i}
          style={[d.newsCard, { borderColor: newsBorderColor(article.level), borderWidth: article.level !== 'normal' ? 2 : 1 }]}
          activeOpacity={0.75}
          onPress={() => Linking.openURL(article.link)}
        >
          {article.level !== 'normal' && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 2 }}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: newsBorderColor(article.level) }} />
              <Text style={{ fontSize: 9, fontWeight: '800', letterSpacing: 1, color: newsBorderColor(article.level), textTransform: 'uppercase' }}>
                {article.level === 'critical' ? 'CRITICAL' : 'IMPORTANT'}
              </Text>
            </View>
          )}
          <Text style={[d.newsTitle, { color: newsTitleColor(article.level) }]}>{article.title}</Text>
          {!!article.desc && (
            <Text style={d.newsDesc} numberOfLines={2}>
              {article.desc}
            </Text>
          )}
          <Text style={d.newsAgo}>{timeAgo(article.pubDate)}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

// ─── CHAT TAB ─────────────────────────────────────────────────────────────────

function ChatTab({ member }: { member: Member }) {
  const storageKey = `ensemble_chat_${member.id}`;
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [zoomVideo, setZoomVideo] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    AsyncStorage.getItem(storageKey).then((raw) => {
      if (raw) { try { setMessages(JSON.parse(raw)); } catch {} }
    });
  }, [member.id]);

  async function saveMessages(msgs: Message[]) {
    setMessages(msgs);
    await AsyncStorage.setItem(storageKey, JSON.stringify(msgs));
  }

  function sendText() {
    if (!text.trim()) return;
    const msg: Message = { id: Date.now().toString(), text: text.trim(), timestamp: new Date().toISOString(), sent: true };
    saveMessages([...messages, msg]);
    setText('');
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }

  async function pickMedia(type: 'image' | 'video') {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: type === 'image' ? ImagePicker.MediaTypeOptions.Images : ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: false, quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      const msg: Message = { id: Date.now().toString(), text: '', timestamp: new Date().toISOString(), sent: true, ...(type === 'image' ? { imageUri: asset.uri } : { videoUri: asset.uri }) };
      saveMessages([...messages, msg]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }

  async function startRecording() {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });
      const { recording: rec } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(rec);
      setIsRecording(true);
    } catch { Alert.alert('Could not start recording'); }
  }

  async function stopRecording() {
    if (!recording) return;
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      setIsRecording(false);
      if (uri) {
        const msg: Message = { id: Date.now().toString(), text: '', audioUri: uri, timestamp: new Date().toISOString(), sent: true };
        saveMessages([...messages, msg]);
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } catch {}
  }

  function longPressMessage(item: Message) {
    if (!item.sent) return;
    const opts: any[] = [];
    if (item.text) opts.push({ text: 'Edit', onPress: () => { setEditingId(item.id); setEditText(item.text); setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 150); } });
    opts.push({ text: 'Delete', style: 'destructive', onPress: () => saveMessages(messages.filter(m => m.id !== item.id)) });
    opts.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert('Message', undefined, opts);
  }

  function saveEdit() {
    if (!editText.trim()) return;
    saveMessages(messages.map(m => m.id === editingId ? { ...m, text: editText.trim() } : m));
    setEditingId(null);
    setEditText('');
  }

  async function playAudio(uri: string) {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });
      const { sound } = await Audio.Sound.createAsync({ uri }, { volume: 1.0 });
      await sound.playAsync();
    } catch { Alert.alert('Could not play audio'); }
  }

  function renderMessage({ item }: { item: Message }) {
    const isEditing = editingId === item.id;
    return (
      <TouchableOpacity
        style={[d.bubble, item.sent ? d.bubbleSent : d.bubbleReceived]}
        onLongPress={() => longPressMessage(item)}
        activeOpacity={0.85}
        delayLongPress={400}
      >
        {item.imageUri ? (
          <TouchableOpacity onPress={() => setZoomImage(item.imageUri!)}>
            <Image source={{ uri: item.imageUri }} style={{ width: 200, height: 200, borderRadius: 12 }} resizeMode="cover" />
          </TouchableOpacity>
        ) : null}
        {item.videoUri ? (
          <TouchableOpacity onPress={() => setZoomVideo(item.videoUri!)} style={{ width: 200, height: 140, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <Ionicons name="play-circle" size={48} color="rgba(255,255,255,0.85)" />
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 4 }}>Tap to play</Text>
          </TouchableOpacity>
        ) : null}
        {item.audioUri ? (
          <TouchableOpacity onPress={() => playAudio(item.audioUri!)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}>
            <Ionicons name="play-circle" size={28} color="#a78bfa" />
            <Text style={{ color: '#a78bfa', fontSize: 13, fontWeight: '600' }}>Voice message</Text>
          </TouchableOpacity>
        ) : null}
        {isEditing ? (
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            <TextInput style={{ flex: 1, color: '#fff', fontSize: 14, borderBottomWidth: 1, borderBottomColor: '#a78bfa' }} value={editText} onChangeText={setEditText} autoFocus />
            <TouchableOpacity onPress={saveEdit}><Ionicons name="checkmark" size={18} color="#a78bfa" /></TouchableOpacity>
            <TouchableOpacity onPress={() => setEditingId(null)}><Ionicons name="close" size={18} color="rgba(255,255,255,0.5)" /></TouchableOpacity>
          </View>
        ) : item.text ? (
          <Text style={[d.bubbleText, item.sent ? d.bubbleTextSent : d.bubbleTextReceived]}>{item.text}</Text>
        ) : null}
        <Text style={d.bubbleTime}>{timeAgo(item.timestamp)}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
      <FlatList ref={listRef} data={messages} keyExtractor={(item) => item.id} renderItem={renderMessage}
        contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 16 }} showsVerticalScrollIndicator={false}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={<Text style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: 60, fontSize: 14 }}>No messages yet</Text>}
      />
      <View style={d.inputRow}>
        <TouchableOpacity onPress={() => pickMedia('image')} style={d.iconBtn}>
          <Ionicons name="camera-outline" size={22} color="#a78bfa" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => pickMedia('video')} style={d.iconBtn}>
          <Ionicons name="videocam-outline" size={22} color="#a78bfa" />
        </TouchableOpacity>
        <TouchableOpacity onPress={isRecording ? stopRecording : startRecording} style={[d.iconBtn, isRecording && { backgroundColor: 'rgba(239,68,68,0.2)' }]}>
          <Ionicons name={isRecording ? "stop-circle" : "mic-outline"} size={22} color={isRecording ? "#ef4444" : "#a78bfa"} />
        </TouchableOpacity>
        <TextInput style={d.chatInput} value={text} onChangeText={setText} placeholder="Message..." placeholderTextColor="rgba(255,255,255,0.3)" returnKeyType="send" onSubmitEditing={sendText} multiline={false} />
        <TouchableOpacity onPress={sendText} style={d.sendBtn}>
          <Ionicons name="send" size={18} color="white" />
        </TouchableOpacity>
      </View>
      <Modal visible={!!zoomImage} transparent animationType="fade">
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' }} activeOpacity={1} onPress={() => setZoomImage(null)}>
          {zoomImage ? <Image source={{ uri: zoomImage }} style={{ width: '90%', height: '70%', borderRadius: 16 }} resizeMode="contain" /> : null}
        </TouchableOpacity>
      </Modal>

      <Modal visible={!!zoomVideo} transparent animationType="fade" onRequestClose={() => setZoomVideo(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' }}>
          {zoomVideo ? (
            <Video
              source={{ uri: zoomVideo }}
              style={{ width: '100%', aspectRatio: 16 / 9 }}
              resizeMode={ResizeMode.CONTAIN}
              useNativeControls
              shouldPlay
            />
          ) : null}
          <TouchableOpacity onPress={() => setZoomVideo(null)} style={{ position: 'absolute', top: 56, right: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="close" size={22} color="white" />
          </TouchableOpacity>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ─── PULSE LINE GRAPH (read-only view for connections) ───────────────────────

function ConnectionLineGraph({ scores }: { scores: Record<string, number> }) {
  const days = currentWeekDays();
  const today = todayStr();
  const W = Dimensions.get('window').width - 96;
  const LEFT = 26;
  const RIGHT = 8;
  const TOP = 10;
  const BOT = 22;
  const GRAPH_H = 90;
  const plotW = W - LEFT - RIGHT;
  const plotH = GRAPH_H - TOP - BOT;

  const xOf = (i: number) => LEFT + (i / 6) * plotW;
  const yOf = (score: number) => TOP + ((5 - score) / 4) * plotH;

  const pts = days.map((day, i) => ({
    day,
    x: xOf(i),
    y: scores[day] != null ? yOf(scores[day]) : null,
    score: scores[day],
    label: DAY_LABELS[i],
    isToday: day === today,
  }));

  return (
    <View style={{ height: GRAPH_H + 32, position: 'relative' }}>
      {/* Y-axis title */}
      <Text style={{ position: 'absolute', left: -18, top: GRAPH_H / 2 - 18, width: 36, textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: 7, fontWeight: '700', letterSpacing: 0.5, transform: [{ rotate: '-90deg' }] }}>
        MOOD
      </Text>

      {/* Y-axis grid + labels */}
      {[5, 4, 3, 2, 1].map((s) => (
        <View key={s}>
          <View style={{ position: 'absolute', left: LEFT, top: yOf(s), right: RIGHT, height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.08)' }} />
          <Text style={{ position: 'absolute', left: 0, top: yOf(s) - 5, width: LEFT - 2, textAlign: 'right', color: 'rgba(255,255,255,0.28)', fontSize: 8, fontWeight: '600' }}>
            {s}
          </Text>
        </View>
      ))}

      {/* Continuous line across all 7 days */}
      {pts.map((p, i) => {
        if (i === 0) return null;
        const prev = pts[i - 1];
        const y1 = prev.y ?? yOf(3);
        const y2 = p.y ?? yOf(3);
        const dx = p.x - prev.x;
        const dy = y2 - y1;
        const len = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        const bothScored = prev.y !== null && p.y !== null;
        return (
          <View key={p.day + '-line'} style={{ position: 'absolute', left: (prev.x + p.x) / 2 - len / 2, top: (y1 + y2) / 2 - 1, width: len, height: bothScored ? 2 : 1, backgroundColor: bothScored ? '#a78bfa' : 'rgba(167,139,250,0.2)', borderRadius: 1, transform: [{ rotate: `${angle}deg` }] }} />
        );
      })}

      {/* Points + day labels */}
      {pts.map((p) => (
        <View key={p.day}>
          {p.y != null ? (
            <View style={{ position: 'absolute', left: p.x - 5, top: p.y - 5, width: 10, height: 10, borderRadius: 5, backgroundColor: barColor(p.score), borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)' }} />
          ) : (
            <View style={{ position: 'absolute', left: p.x - 4, top: yOf(3) - 4, width: 8, height: 8, borderRadius: 4, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'transparent' }} />
          )}
          <Text style={{ position: 'absolute', left: p.x - 14, top: GRAPH_H - 4, width: 28, textAlign: 'center', color: p.isToday ? '#a78bfa' : 'rgba(255,255,255,0.35)', fontSize: 9, fontWeight: p.isToday ? '700' : '500' }}>
            {p.label}
          </Text>
        </View>
      ))}

      {/* X-axis title */}
      <Text style={{ position: 'absolute', left: LEFT, right: RIGHT, top: GRAPH_H + 18, textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 7, fontWeight: '700', letterSpacing: 0.5 }}>
        DAY OF WEEK
      </Text>
    </View>
  );
}

// ─── PULSE TAB ────────────────────────────────────────────────────────────────

function PulseTab({ member }: { member: Member }) {
  const pulseKey = 'ensemble_pulse';
  const notesKey = `ensemble_pulse_notes_${member.id}`;
  const [pulseMap, setPulseMap] = useState<Record<string, Record<string, number>>>({});
  const [notes, setNotes] = useState('');
  const days = currentWeekDays();
  const memberScores: Record<string, number> = pulseMap[String(member.id)] || {};

  useEffect(() => {
    AsyncStorage.multiGet([pulseKey, notesKey]).then(([[, pulse], [, noteRaw]]) => {
      if (pulse) { try { setPulseMap(JSON.parse(pulse)); } catch {} }
      if (noteRaw) setNotes(noteRaw);
    });
  }, [member.id]);

  const logged = days.filter((day) => memberScores[day] !== undefined);
  const avg =
    logged.length > 0
      ? (logged.reduce((sum, day) => sum + memberScores[day], 0) / logged.length).toFixed(1)
      : null;

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={d.pulseHeader}>{member.name}'s week</Text>

      <View style={d.card}>
        <ConnectionLineGraph scores={memberScores} />
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
          <View style={d.chip}>
            <Text style={d.chipText}>Weekly avg: {avg ?? '—'}</Text>
          </View>
          <View style={d.chip}>
            <Text style={d.chipText}>Days logged: {logged.length} / 7</Text>
          </View>
        </View>
      </View>

      <View style={d.card}>
        <Text style={d.sectionLabel}>Notes from {member.name}</Text>
        {notes ? (
          <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, lineHeight: 20 }}>{notes}</Text>
        ) : (
          <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 14, fontStyle: 'italic' }}>
            No notes left this week
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

// ─── EDIT SUB-MODAL ───────────────────────────────────────────────────────────

function EditModal({
  member,
  visible,
  onClose,
  onSave,
}: {
  member: Member;
  visible: boolean;
  onClose: () => void;
  onSave: (updated: Member) => void;
}) {
  const [name, setName] = useState(member.name);
  const [relationship, setRelationship] = useState(member.relationship);
  const [photoUri, setPhotoUri] = useState<string | undefined>(member.photoUri);
  const [hometown, setHometown] = useState(member.hometown || '');
  const [birthday, setBirthday] = useState(member.birthday || '');
  const [anniversary, setAnniversary] = useState(member.anniversary || '');
  const [showBirthdayPicker, setShowBirthdayPicker] = useState(false);
  const [showAnniversaryPicker, setShowAnniversaryPicker] = useState(false);
  const [cityQuery, setCityQuery] = useState(member.city || '');
  const editScrollRef = useRef<ScrollView>(null);
  const [cityResult, setCityResult] = useState<CityResult | null>({
    city: member.city,
    country: member.country,
    timezone: member.timezone,
    lat: member.lat,
    lon: member.lon,
  });
  const [searchResults, setSearchResults] = useState<CityResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Reset state when member changes
  useEffect(() => {
    setName(member.name);
    setRelationship(member.relationship);
    setPhotoUri(member.photoUri);
    setHometown(member.hometown || '');
    setBirthday(member.birthday || '');
    setAnniversary(member.anniversary || '');
    setCityQuery(member.city || '');
    setCityResult({
      city: member.city,
      country: member.country,
      timezone: member.timezone,
      lat: member.lat,
      lon: member.lon,
    });
    setSearchResults([]);
  }, [member.id, visible]);

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets.length > 0) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  async function searchCity() {
    if (!cityQuery.trim()) return;
    setSearching(true);
    try {
      const results = await searchCities(cityQuery);
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    }
    setSearching(false);
  }

  function handleSave() {
    if (!name.trim()) {
      Alert.alert('Name is required');
      return;
    }
    const city = cityResult || { city: member.city, country: member.country, timezone: member.timezone, lat: member.lat, lon: member.lon };
    onSave({
      ...member,
      name: name.trim(),
      relationship,
      photoUri,
      hometown,
      birthday,
      anniversary,
      ...city,
    });
  }

  const initials = name.trim() ? name.trim()[0].toUpperCase() : '?';
  const avatarBg = getAvatarColor(member.id);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#07080f' }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          ref={editScrollRef}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 24, paddingBottom: 80 }}
          showsVerticalScrollIndicator={false}
        >
          <Text style={e.title}>Edit Profile</Text>

          {/* Photo */}
          <Text style={e.label}>PHOTO</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={e.avatarCircle} />
            ) : (
              <View style={[e.avatarCircle, { backgroundColor: avatarBg }]}>
                <Text style={{ color: 'white', fontWeight: '700', fontSize: 26 }}>{initials}</Text>
              </View>
            )}
            <TouchableOpacity style={e.uploadBtn} onPress={pickPhoto}>
              <Text style={e.uploadText}>Upload Photo</Text>
            </TouchableOpacity>
          </View>

          {/* Name */}
          <Text style={e.label}>NAME</Text>
          <TextInput
            style={e.input}
            value={name}
            onChangeText={setName}
            placeholder="Name..."
            placeholderTextColor="rgba(255,255,255,0.3)"
          />

          {/* Relationship */}
          <Text style={e.label}>RELATIONSHIP</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {RELATIONSHIPS.map((r) => (
              <TouchableOpacity
                key={r}
                onPress={() => setRelationship(r)}
                style={[e.relBtn, relationship === r && e.relBtnActive]}
              >
                <Text style={[e.relText, relationship === r && e.relTextActive]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Hometown */}
          <Text style={e.label}>HOMETOWN</Text>
          <TextInput
            style={e.input}
            value={hometown}
            onChangeText={setHometown}
            placeholder="City / Town they grew up in"
            placeholderTextColor="rgba(255,255,255,0.3)"
          />

          {/* Birthday */}
          <Text style={e.label}>BIRTHDAY</Text>
          <TouchableOpacity style={e.dateBtn} onPress={() => setShowBirthdayPicker(true)}>
            <Text style={e.dateBtnText}>{birthday ? birthday : 'Tap to add birthday'}</Text>
          </TouchableOpacity>
          {showBirthdayPicker && (
            <DateTimePicker
              value={birthday ? new Date(birthday) : new Date(1980, 0, 1)}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              maximumDate={new Date()}
              onChange={(_, d) => {
                setShowBirthdayPicker(false);
                if (d) setBirthday(d.toISOString().split('T')[0]);
              }}
            />
          )}

          {/* Anniversary */}
          <Text style={e.label}>ANNIVERSARY</Text>
          <TouchableOpacity style={e.dateBtn} onPress={() => setShowAnniversaryPicker(true)}>
            <Text style={e.dateBtnText}>{anniversary ? anniversary : 'Tap to add anniversary'}</Text>
          </TouchableOpacity>
          {showAnniversaryPicker && (
            <DateTimePicker
              value={anniversary ? new Date(anniversary) : new Date(1980, 0, 1)}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              maximumDate={new Date()}
              onChange={(_, d) => {
                setShowAnniversaryPicker(false);
                if (d) setAnniversary(d.toISOString().split('T')[0]);
              }}
            />
          )}

          {/* City */}
          <Text style={e.label}>CITY</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            <TextInput
              style={[e.input, { flex: 1, marginBottom: 0 }]}
              value={cityQuery}
              onChangeText={setCityQuery}
              onSubmitEditing={searchCity}
              placeholder="Search city..."
              placeholderTextColor="rgba(255,255,255,0.3)"
              onFocus={() => {
                setTimeout(() => editScrollRef.current?.scrollToEnd({ animated: true }), 300);
              }}
            />
            <TouchableOpacity style={e.searchBtn} onPress={searchCity}>
              <Text style={{ color: 'white', fontWeight: '600' }}>
                {searching ? '...' : 'Search'}
              </Text>
            </TouchableOpacity>
          </View>
          {searchResults.length > 0 && (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              scrollEnabled={searchResults.length > 4}
              style={[e.resultsList, { maxHeight: 200 }]}
            >
              {searchResults.map((r, i) => (
                <TouchableOpacity
                  key={`${r.lat}-${r.lon}-${i}`}
                  style={e.resultRow}
                  activeOpacity={0.6}
                  onPress={() => {
                    setCityResult(r);
                    setCityQuery(r.city);
                    setSearchResults([]);
                  }}
                >
                  <Text style={e.resultText}>
                    {r.city}{r.admin1 ? `, ${r.admin1}` : ''} · {r.country}
                  </Text>
                  <Text style={e.resultTz}>{r.timezone}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
          {cityResult && (
            <Text style={e.citySelected}>
              Selected: {cityResult.city}, {cityResult.country}
            </Text>
          )}

          {/* Actions */}
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
            <TouchableOpacity
              style={e.cancelBtn}
              onPress={onClose}
            >
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={e.saveBtn} onPress={handleSave}>
              <Text style={{ color: 'white', fontWeight: '700' }}>Save</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── SCHEDULE TAB ────────────────────────────────────────────────────────────

function ScheduleTab() {
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem('ensemble_calendar').then((raw) => {
      if (raw) {
        const all: CalEvent[] = JSON.parse(raw);
        const today = new Date().toISOString().split('T')[0];
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() + 30);
        const cutoffStr = cutoff.toISOString().split('T')[0];
        const upcoming = all
          .filter((e) => e.date >= today && e.date <= cutoffStr)
          .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
        setEvents(upcoming);
      }
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <ActivityIndicator color="#a78bfa" style={{ marginTop: 40 }} />;
  }

  if (events.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 }}>
        <Ionicons name="calendar-outline" size={48} color="rgba(255,255,255,0.15)" />
        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15, textAlign: 'center' }}>
          No upcoming events in the next 30 days.
        </Text>
      </View>
    );
  }

  const grouped: Record<string, CalEvent[]> = {};
  events.forEach((e) => {
    if (!grouped[e.date]) grouped[e.date] = [];
    grouped[e.date].push(e);
  });
  const dates = Object.keys(grouped).sort();

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {dates.map((date) => {
        const d = new Date(date + 'T12:00:00');
        const label = d.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        });
        return (
          <View key={date}>
            <Text
              style={{
                color: 'rgba(255,255,255,0.5)',
                fontSize: 11,
                fontWeight: '700',
                letterSpacing: 0.8,
                marginBottom: 8,
              }}
            >
              {label.toUpperCase()}
            </Text>
            {grouped[date].map((ev) => (
              <View
                key={ev.id}
                style={{
                  flexDirection: 'row',
                  gap: 12,
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  borderRadius: 14,
                  padding: 14,
                  marginBottom: 8,
                  borderLeftWidth: 3,
                  borderLeftColor: ev.color,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#f0f0f6', fontSize: 15, fontWeight: '700' }}>
                    {ev.title}
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, marginTop: 3 }}>
                    {ev.startTime} – {ev.endTime}
                  </Text>
                  {ev.notes ? (
                    <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 4 }}>
                      {ev.notes}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        );
      })}
    </ScrollView>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function PersonDetail({ member, visible, onClose, onUpdate, onDelete }: Props) {
  const [activeTab, setActiveTab] = useState<'News' | 'Chat' | 'Pulse' | 'Schedule'>('News');
  const [editVisible, setEditVisible] = useState(false);

  function confirmDelete() {
    Alert.alert(
      'Remove Person',
      `Remove ${member.name} from Ensemble?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            onClose();
            onDelete(member.id);
          },
        },
      ]
    );
  }

  function handleUpdate(updated: Member) {
    setEditVisible(false);
    onUpdate(updated);
  }

  const tabs: Array<'News' | 'Chat' | 'Pulse' | 'Schedule'> = ['News', 'Chat', 'Pulse', 'Schedule'];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={d.root}>
        {/* Header */}
        <View style={d.header}>
          <TouchableOpacity onPress={onClose} style={d.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="chevron-back" size={26} color="#a78bfa" />
          </TouchableOpacity>

          <Avatar member={member} size={52} />

          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={d.headerName} numberOfLines={1}>{member.name}</Text>
            <Text style={d.headerSub} numberOfLines={1}>
              {member.relationship} · {member.city}
            </Text>
          </View>

          <TouchableOpacity onPress={() => setEditVisible(true)} style={d.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="pencil-outline" size={20} color="#a78bfa" />
          </TouchableOpacity>
          <TouchableOpacity onPress={confirmDelete} style={[d.iconBtn, { marginLeft: 6 }]} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="trash-outline" size={20} color="#f87171" />
          </TouchableOpacity>
        </View>

        {/* Tab switcher */}
        <View style={d.tabBar}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[d.tabItem, activeTab === tab && d.tabItemActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.7}
            >
              <Text style={[d.tabText, activeTab === tab && d.tabTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab content */}
        <View style={{ flex: 1 }}>
          {activeTab === 'News' && <NewsTab member={member} />}
          {activeTab === 'Chat' && <ChatTab member={member} />}
          {activeTab === 'Pulse' && <PulseTab member={member} />}
          {activeTab === 'Schedule' && <ScheduleTab />}
        </View>

        {/* Edit modal */}
        <EditModal
          member={member}
          visible={editVisible}
          onClose={() => setEditVisible(false)}
          onSave={handleUpdate}
        />
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const d = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#07080f' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  backBtn: { marginRight: 8 },
  headerName: { fontSize: 18, fontWeight: '700', color: '#f0f0f6' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Tabs
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  tabItem: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: '#a78bfa',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
  },
  tabTextActive: {
    color: '#a78bfa',
  },

  // News
  newsCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    gap: 6,
  },
  newsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 20,
  },
  newsDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    lineHeight: 17,
  },
  newsAgo: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
  },

  // Chat
  bubble: {
    maxWidth: '75%',
    borderRadius: 16,
    padding: 10,
    marginVertical: 2,
    gap: 4,
  },
  bubbleSent: {
    alignSelf: 'flex-end',
    backgroundColor: '#7c6af7',
  },
  bubbleReceived: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.09)',
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 19,
  },
  bubbleTextSent: { color: 'white' },
  bubbleTextReceived: { color: 'rgba(255,255,255,0.85)' },
  bubbleTime: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    alignSelf: 'flex-end',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
    backgroundColor: '#07080f',
  },
  chatInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#f0f0f6',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#7c6af7',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Pulse
  pulseHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f0f0f6',
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    gap: 14,
  },
  chip: {
    backgroundColor: 'rgba(167,139,250,0.12)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.25)',
  },
  chipText: {
    color: '#a78bfa',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f0f0f6',
  },
  scoreBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    gap: 4,
  },
  scoreBtnActive: {
    backgroundColor: '#a78bfa',
    borderColor: '#a78bfa',
  },
  scoreNum: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 18,
    fontWeight: '700',
  },
  scoreNumActive: { color: 'white' },
  scoreDesc: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
  },
  scoreDescActive: { color: 'rgba(255,255,255,0.9)' },
  noteInput: {
    color: '#f0f0f6',
    fontSize: 14,
    lineHeight: 20,
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: 0,
  },
});

// ─── Edit modal styles ────────────────────────────────────────────────────────

const e = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '800', color: '#f0f0f6', marginBottom: 24 },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1,
    marginBottom: 8,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  uploadBtn: {
    backgroundColor: 'rgba(124,106,247,0.2)',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(124,106,247,0.4)',
  },
  uploadText: { color: '#c4b5fd', fontWeight: '600', fontSize: 14 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    color: '#f0f0f6',
    fontSize: 15,
    padding: 13,
    marginBottom: 16,
  },
  dateBtn: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 13,
    marginBottom: 16,
  },
  dateBtnText: { color: '#f0f0f6', fontSize: 15 },
  relBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  relBtnActive: {
    backgroundColor: 'rgba(124,106,247,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(124,106,247,0.5)',
  },
  relText: { fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: '500' },
  relTextActive: { color: '#c4b5fd' },
  searchBtn: {
    backgroundColor: 'rgba(124,106,247,0.3)',
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(124,106,247,0.4)',
  },
  resultsList: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 10,
    overflow: 'hidden',
  },
  resultRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  resultText: { color: '#f0f0f6', fontSize: 14, fontWeight: '600' },
  resultTz: { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 },
  citySelected: {
    fontSize: 12,
    color: '#86efac',
    backgroundColor: 'rgba(34,197,94,0.1)',
    borderRadius: 8,
    padding: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.2)',
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    padding: 15,
    alignItems: 'center',
  },
  saveBtn: {
    flex: 1,
    backgroundColor: '#7c6af7',
    borderRadius: 14,
    padding: 15,
    alignItems: 'center',
  },
});
