import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
  timestamp: string;
  sent: boolean;
};

type NewsArticle = {
  title: string;
  link: string;
  pubDate: string;
  desc: string;
};

type CityResult = {
  city: string;
  country: string;
  timezone: string;
  lat: number;
  lon: number;
  admin1?: string;
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

async function fetchMemberNews(member: Member): Promise<NewsArticle[]> {
  const tag = COUNTRY_TAG[member.country];
  const url = tag
    ? `https://content.guardianapis.com/search?tag=${tag}&api-key=test&show-fields=trailText&page-size=10&order-by=newest`
    : `https://content.guardianapis.com/search?q=${encodeURIComponent(member.country)}&section=world&api-key=test&show-fields=trailText&page-size=10&order-by=newest`;
  const res = await fetch(url);
  const data = await res.json();
  return (data.response?.results || []).map((item: any) => ({
    title: item.webTitle,
    link: item.webUrl,
    pubDate: item.webPublicationDate,
    desc: (item.fields?.trailText || '').replace(/<[^>]+>/g, ''),
  }));
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

function NewsTab({ member }: { member: Member }) {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setArticles([]);
    fetchMemberNews(member)
      .then(setArticles)
      .catch(() => {})
      .finally(() => setLoading(false));
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
          style={d.newsCard}
          activeOpacity={0.75}
          onPress={() => Linking.openURL(article.link)}
        >
          <Text style={d.newsTitle}>{article.title}</Text>
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
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    AsyncStorage.getItem(storageKey).then((raw) => {
      if (raw) {
        try {
          setMessages(JSON.parse(raw));
        } catch {}
      }
    });
  }, [member.id]);

  async function saveMessages(msgs: Message[]) {
    setMessages(msgs);
    await AsyncStorage.setItem(storageKey, JSON.stringify(msgs));
  }

  function sendText() {
    if (!text.trim()) return;
    const msg: Message = {
      id: Date.now().toString(),
      text: text.trim(),
      timestamp: new Date().toISOString(),
      sent: true,
    };
    const updated = [...messages, msg];
    saveMessages(updated);
    setText('');
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      const msg: Message = {
        id: Date.now().toString(),
        text: '',
        imageUri: result.assets[0].uri,
        timestamp: new Date().toISOString(),
        sent: true,
      };
      const updated = [...messages, msg];
      saveMessages(updated);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }

  function renderMessage({ item }: { item: Message }) {
    return (
      <View
        style={[
          d.bubble,
          item.sent ? d.bubbleSent : d.bubbleReceived,
        ]}
      >
        {item.imageUri ? (
          <TouchableOpacity onPress={() => setZoomImage(item.imageUri!)}>
            <Image
              source={{ uri: item.imageUri }}
              style={{ width: 200, height: 200, borderRadius: 12 }}
              resizeMode="cover"
            />
          </TouchableOpacity>
        ) : null}
        {!!item.text && (
          <Text style={[d.bubbleText, item.sent ? d.bubbleTextSent : d.bubbleTextReceived]}>
            {item.text}
          </Text>
        )}
        <Text style={d.bubbleTime}>{timeAgo(item.timestamp)}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={120}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <Text style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: 60, fontSize: 14 }}>
            No messages yet
          </Text>
        }
      />
      <View style={d.inputRow}>
        <TouchableOpacity onPress={pickImage} style={d.iconBtn}>
          <Ionicons name="camera-outline" size={22} color="#a78bfa" />
        </TouchableOpacity>
        <TextInput
          style={d.chatInput}
          value={text}
          onChangeText={setText}
          placeholder="Message..."
          placeholderTextColor="rgba(255,255,255,0.3)"
          returnKeyType="send"
          onSubmitEditing={sendText}
          multiline={false}
        />
        <TouchableOpacity onPress={sendText} style={d.sendBtn}>
          <Ionicons name="send" size={18} color="white" />
        </TouchableOpacity>
      </View>

      <Modal visible={!!zoomImage} transparent animationType="fade">
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' }}
          activeOpacity={1}
          onPress={() => setZoomImage(null)}
        >
          {zoomImage ? (
            <Image
              source={{ uri: zoomImage }}
              style={{ width: '90%', height: '70%', borderRadius: 16 }}
              resizeMode="contain"
            />
          ) : null}
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ─── PULSE TAB ────────────────────────────────────────────────────────────────

function PulseTab({ member }: { member: Member }) {
  const pulseKey = 'ensemble_pulse';
  const notesKey = `ensemble_pulse_notes_${member.id}`;
  const [pulseMap, setPulseMap] = useState<Record<string, Record<string, number>>>({});
  const [notes, setNotes] = useState('');
  const today = todayStr();
  const days = currentWeekDays();

  const memberScores: Record<string, number> = pulseMap[String(member.id)] || {};
  const todayScore = memberScores[today];

  useEffect(() => {
    AsyncStorage.multiGet([pulseKey, notesKey]).then(([[, pulse], [, noteRaw]]) => {
      if (pulse) {
        try { setPulseMap(JSON.parse(pulse)); } catch {}
      }
      if (noteRaw) setNotes(noteRaw);
    });
  }, [member.id]);

  async function logScore(score: number) {
    const memberKey = String(member.id);
    const updated = {
      ...pulseMap,
      [memberKey]: { ...(pulseMap[memberKey] || {}), [today]: score },
    };
    setPulseMap(updated);
    await AsyncStorage.setItem(pulseKey, JSON.stringify(updated));
  }

  async function saveNotes() {
    await AsyncStorage.setItem(notesKey, notes);
  }

  const logged = days.filter((d) => memberScores[d] !== undefined);
  const avg =
    logged.length > 0
      ? (logged.reduce((sum, d) => sum + memberScores[d], 0) / logged.length).toFixed(1)
      : null;

  const MAX_BAR_H = 80;

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={d.pulseHeader}>Notes from {member.name}</Text>

      {/* Bar graph */}
      <View style={d.card}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 4 }}>
          {days.map((day, idx) => {
            const score = memberScores[day];
            const barH = score ? (score / 5) * MAX_BAR_H : 4;
            const isToday = day === today;
            const color = barColor(score);
            return (
              <View key={day} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: '700', height: 14 }}>
                  {score ? String(score) : ''}
                </Text>
                <View style={{ height: MAX_BAR_H, justifyContent: 'flex-end' }}>
                  <View
                    style={{
                      width: '70%',
                      minHeight: 4,
                      height: barH,
                      backgroundColor: color,
                      borderRadius: 6,
                      borderWidth: isToday ? 2 : 0,
                      borderColor: '#a78bfa',
                    }}
                  />
                </View>
                <Text style={{ color: isToday ? '#a78bfa' : 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: isToday ? '700' : '500', marginTop: 2 }}>
                  {DAY_LABELS[idx]}
                </Text>
              </View>
            );
          })}
        </View>
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
          <View style={d.chip}>
            <Text style={d.chipText}>Average: {avg !== null ? avg : '—'}</Text>
          </View>
        </View>
      </View>

      {/* Log score */}
      <View style={d.card}>
        <Text style={d.sectionLabel}>Log today's check for {member.name}</Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {([1, 2, 3, 4, 5] as const).map((n) => {
            const active = todayScore === n;
            return (
              <TouchableOpacity
                key={n}
                style={[d.scoreBtn, active && d.scoreBtnActive]}
                onPress={() => logScore(n)}
                activeOpacity={0.7}
              >
                <Text style={[d.scoreNum, active && d.scoreNumActive]}>{n}</Text>
                <Text style={[d.scoreDesc, active && d.scoreDescActive]}>{MOOD_LABELS[n]}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Notes */}
      <View style={d.card}>
        <Text style={d.sectionLabel}>Your notes about {member.name}</Text>
        <TextInput
          style={d.noteInput}
          multiline
          value={notes}
          onChangeText={setNotes}
          onBlur={saveNotes}
          placeholder="Write notes here..."
          placeholderTextColor="rgba(255,255,255,0.25)"
        />
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
  const [occupation, setOccupation] = useState(member.occupation || '');
  const [birthday, setBirthday] = useState(member.birthday || '');
  const [anniversary, setAnniversary] = useState(member.anniversary || '');
  const [showBirthdayPicker, setShowBirthdayPicker] = useState(false);
  const [showAnniversaryPicker, setShowAnniversaryPicker] = useState(false);
  const [cityQuery, setCityQuery] = useState(member.city || '');
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
    setOccupation(member.occupation || '');
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
      occupation,
      birthday,
      anniversary,
      ...city,
    });
  }

  const initials = name.trim() ? name.trim()[0].toUpperCase() : '?';
  const avatarBg = getAvatarColor(member.id);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={{ flex: 1, backgroundColor: '#07080f' }}>
        <ScrollView
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

          {/* Occupation */}
          <Text style={e.label}>OCCUPATION</Text>
          <TextInput
            style={e.input}
            value={occupation}
            onChangeText={setOccupation}
            placeholder="Teacher, Engineer, Retired..."
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
      </View>
    </Modal>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function PersonDetail({ member, visible, onClose, onUpdate, onDelete }: Props) {
  const [activeTab, setActiveTab] = useState<'News' | 'Chat' | 'Pulse'>('News');
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

  const tabs: Array<'News' | 'Chat' | 'Pulse'> = ['News', 'Chat', 'Pulse'];

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
