import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Member, useMembers } from "../../context/MembersContext";

const AVATAR_COLORS = [
  "#2d3a5a",
  "#2d4a3e",
  "#3a2d4a",
  "#4a3a2d",
  "#2d4a4a",
];

function getAvatarColor(id: number) {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

const RELATIONSHIPS = [
  "Mother",
  "Father",
  "Grandmother",
  "Grandfather",
  "Sibling",
  "Partner",
  "Friend",
  "Aunt",
  "Uncle",
  "Cousin",
  "Other",
];

type CityResult = {
  city: string;
  country: string;
  timezone: string;
  lat: number;
  lon: number;
  admin1?: string;
};

async function searchCities(query: string): Promise<CityResult[]> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=10&language=en&format=json`;
  const res = await fetch(url);
  const data = await res.json();
  const results: CityResult[] = (data.results || []).map((r: any) => ({
    city: r.name,
    country: r.country_code,
    timezone: r.timezone,
    lat: r.latitude,
    lon: r.longitude,
    admin1: r.admin1,
  }));

  if (results.length > 0) return results;

  // Nominatim fallback
  try {
    const nomUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=10&addressdetails=1`;
    const nomRes = await fetch(nomUrl);
    const nomData = await nomRes.json();
    if (!Array.isArray(nomData) || nomData.length === 0) return [];

    const enriched: CityResult[] = await Promise.all(
      nomData.map(async (item: any) => {
        const addr = item.address || {};
        const city =
          addr.city ||
          addr.town ||
          addr.village ||
          addr.hamlet ||
          item.display_name ||
          "Unknown";
        const country = (addr.country_code || "").toUpperCase();
        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);
        let timezone = "UTC";
        try {
          const tzRes = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m`,
          );
          const tzData = await tzRes.json();
          if (tzData && typeof tzData.timezone === "string") {
            timezone = tzData.timezone;
          }
        } catch {}
        return {
          city,
          country,
          timezone,
          lat,
          lon,
          admin1: addr.state || addr.region || addr.county,
        };
      }),
    );
    return enriched;
  } catch {
    return [];
  }
}

function MemberForm({
  initial,
  onSave,
  onClose,
}: {
  initial?: Member;
  onSave: (m: any) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name || "");
  const [relationship, setRelationship] = useState(
    initial?.relationship || "Mother",
  );
  const [photoUri, setPhotoUri] = useState<string | undefined>(
    initial?.photoUri,
  );
  const [cityQuery, setCityQuery] = useState(initial?.city || "");
  const [cityResult, setCityResult] = useState<CityResult | null>(
    initial
      ? {
          city: initial.city,
          country: initial.country,
          timezone: initial.timezone,
          lat: initial.lat,
          lon: initial.lon,
        }
      : null,
  );
  const [searchResults, setSearchResults] = useState<CityResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [searching, setSearching] = useState(false);

  const [birthday, setBirthday] = useState<string>(initial?.birthday || '');
  const [anniversary, setAnniversary] = useState<string>(initial?.anniversary || '');
  const [hometown, setHometown] = useState(initial?.hometown || '');
  const [occupation, setOccupation] = useState(initial?.occupation || '');
  const [importantDates, setImportantDates] = useState<Array<{label:string;date:string}>>(initial?.importantDates || []);
  const [showBirthdayPicker, setShowBirthdayPicker] = useState(false);
  const [showAnniversaryPicker, setShowAnniversaryPicker] = useState(false);
  const [importantDatePickerIndex, setImportantDatePickerIndex] = useState<number|null>(null);

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

  async function search() {
    if (!cityQuery.trim()) return;
    setSearching(true);
    setHasSearched(false);
    try {
      const results = await searchCities(cityQuery);
      setSearchResults(results);
      setHasSearched(true);
    } catch {
      setSearchResults([]);
      setHasSearched(true);
    }
    setSearching(false);
  }

  function save() {
    if (!name.trim() || !cityResult)
      return Alert.alert("Fill in name and search a city first");
    onSave({
      name: name.trim(),
      relationship,
      photoUri,
      ...cityResult,
      wakeHour: initial?.wakeHour ?? 7,
      sleepHour: initial?.sleepHour ?? 22,
      birthday,
      anniversary,
      hometown,
      occupation,
      importantDates,
    });
  }

  const initials = name.trim() ? name.trim()[0].toUpperCase() : "?";
  const avatarColor = initial ? getAvatarColor(initial.id) : "#2d3a5a";

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      style={f.modal}
    >
      <Text style={f.title}>{initial ? "Edit Profile" : "Add Person"}</Text>

      <Text style={f.label}>PHOTO</Text>
      <View style={f.photoRow}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={f.avatarCircle} />
        ) : (
          <View style={[f.avatarCircle, { backgroundColor: avatarColor }]}>
            <Text style={f.avatarInitial}>{initials}</Text>
          </View>
        )}
        <TouchableOpacity style={f.uploadBtn} onPress={pickPhoto}>
          <Text style={f.uploadText}>Upload Photo</Text>
        </TouchableOpacity>
      </View>

      <Text style={f.label}>NAME</Text>
      <TextInput
        style={f.input}
        value={name}
        onChangeText={setName}
        placeholder="Mom, Alex…"
        placeholderTextColor="rgba(255,255,255,0.3)"
      />

      <Text style={f.label}>RELATIONSHIP</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: 16 }}
      >
        {RELATIONSHIPS.map((r) => (
          <TouchableOpacity
            key={r}
            onPress={() => setRelationship(r)}
            style={[f.relBtn, relationship === r && f.relBtnActive]}
          >
            <Text style={[f.relText, relationship === r && f.relTextActive]}>
              {r}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={f.label}>HOMETOWN</Text>
      <TextInput
        style={f.input}
        value={hometown}
        onChangeText={setHometown}
        placeholder="City / Town they grew up in"
        placeholderTextColor="rgba(255,255,255,0.3)"
      />

      <Text style={f.label}>OCCUPATION</Text>
      <TextInput
        style={f.input}
        value={occupation}
        onChangeText={setOccupation}
        placeholder="Teacher, Engineer, Retired…"
        placeholderTextColor="rgba(255,255,255,0.3)"
      />

      <Text style={f.label}>BIRTHDAY</Text>
      <TouchableOpacity
        style={f.dateBtn}
        onPress={() => setShowBirthdayPicker(true)}
      >
        <Text style={f.dateBtnText}>
          {birthday ? birthday : "Tap to add birthday"}
        </Text>
      </TouchableOpacity>
      {showBirthdayPicker && (
        <DateTimePicker
          value={birthday ? new Date(birthday) : new Date(1980, 0, 1)}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          maximumDate={new Date()}
          onChange={(_, d) => { setShowBirthdayPicker(false); if (d) setBirthday(d.toISOString().split('T')[0]); }}
        />
      )}

      <Text style={f.label}>ANNIVERSARY</Text>
      <TouchableOpacity
        style={f.dateBtn}
        onPress={() => setShowAnniversaryPicker(true)}
      >
        <Text style={f.dateBtnText}>
          {anniversary ? anniversary : "Tap to add anniversary"}
        </Text>
      </TouchableOpacity>
      {showAnniversaryPicker && (
        <DateTimePicker
          value={anniversary ? new Date(anniversary) : new Date(1980, 0, 1)}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          maximumDate={new Date()}
          onChange={(_, d) => { setShowAnniversaryPicker(false); if (d) setAnniversary(d.toISOString().split('T')[0]); }}
        />
      )}

      <Text style={f.label}>IMPORTANT DATES</Text>
      {importantDates.map((item, i) => (
        <View key={i} style={f.importantDateRow}>
          <TextInput
            style={[f.input, { flex: 1, marginBottom: 0 }]}
            value={item.label}
            onChangeText={(text) => {
              const updated = [...importantDates];
              updated[i] = { ...updated[i], label: text };
              setImportantDates(updated);
            }}
            placeholder="Label (e.g. Graduation)"
            placeholderTextColor="rgba(255,255,255,0.3)"
          />
          <TouchableOpacity
            style={f.dateBtn2}
            onPress={() => setImportantDatePickerIndex(i)}
          >
            <Text style={f.dateBtnText2}>{item.date || "Date"}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={f.removeBtn}
            onPress={() => {
              const updated = importantDates.filter((_, idx) => idx !== i);
              setImportantDates(updated);
            }}
          >
            <Text style={f.removeBtnText}>X</Text>
          </TouchableOpacity>
          {importantDatePickerIndex === i && (
            <DateTimePicker
              value={item.date ? new Date(item.date) : new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, d) => {
                setImportantDatePickerIndex(null);
                if (d) {
                  const updated = [...importantDates];
                  updated[i] = { ...updated[i], date: d.toISOString().split('T')[0] };
                  setImportantDates(updated);
                }
              }}
            />
          )}
        </View>
      ))}
      {importantDates.length < 5 && (
        <TouchableOpacity
          style={f.addDateBtn}
          onPress={() => setImportantDates([...importantDates, { label: '', date: new Date().toISOString().split('T')[0] }])}
        >
          <Text style={f.addDateText}>+ Add Date</Text>
        </TouchableOpacity>
      )}

      <Text style={[f.label, { marginTop: 8 }]}>CITY</Text>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
        <TextInput
          style={[f.input, { flex: 1, marginBottom: 0 }]}
          value={cityQuery}
          onChangeText={setCityQuery}
          onSubmitEditing={search}
          placeholder="Search city…"
          placeholderTextColor="rgba(255,255,255,0.3)"
        />
        <TouchableOpacity style={f.searchBtn} onPress={search}>
          <Text style={{ color: "white", fontWeight: "600" }}>
            {searching ? "…" : "Search"}
          </Text>
        </TouchableOpacity>
      </View>
      {searchResults.length > 0 && (
        <View style={f.resultsList}>
          {searchResults.map((r, i) => {
            const isSelected =
              cityResult &&
              cityResult.lat === r.lat &&
              cityResult.lon === r.lon;
            return (
              <TouchableOpacity
                key={`${r.lat}-${r.lon}-${i}`}
                activeOpacity={0.6}
                style={[f.resultRow, isSelected && f.resultRowActive]}
                onPress={() => setCityResult(r)}
              >
                <Text style={f.resultText}>
                  {r.city}, {r.admin1 || ""} {r.admin1 ? "·" : ""} {r.country}
                </Text>
                <Text style={f.resultTz}>{r.timezone}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
      {hasSearched && searchResults.length === 0 && (
        <Text style={f.notFound}>
          City not found - try a nearby larger city.
        </Text>
      )}
      {cityResult && (
        <Text style={f.cityResult}>
          Selected: {cityResult.city}, {cityResult.country}
        </Text>
      )}

      <View style={f.actions}>
        <TouchableOpacity style={f.cancelBtn} onPress={onClose}>
          <Text style={{ color: "rgba(255,255,255,0.6)", fontWeight: "600" }}>
            Cancel
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={f.saveBtn} onPress={save}>
          <Text style={{ color: "white", fontWeight: "700" }}>Save</Text>
        </TouchableOpacity>
      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

export default function PeopleScreen() {
  const { members, addMember, updateMember, removeMember } = useMembers();
  const [editing, setEditing] = useState<Member | null>(null);
  const [adding, setAdding] = useState(false);
  const [zoomUri, setZoomUri] = useState<string | null>(null);

  function handleSaveEdit(data: any) {
    if (editing) {
      updateMember({ ...editing, ...data });
      setEditing(null);
    }
  }

  function handleSaveAdd(data: any) {
    addMember({ id: Date.now(), ...data });
    setAdding(false);
  }

  function confirmDelete(m: Member) {
    Alert.alert("Remove", `Remove ${m.name} from Ensemble?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => removeMember(m.id),
      },
    ]);
  }

  return (
    <View style={p.root}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={p.scroll}
        showsVerticalScrollIndicator={false}
      >
        {members.map((m) => (
          <View key={m.id} style={p.card}>
            <TouchableOpacity onPress={() => m.photoUri ? setZoomUri(m.photoUri) : null}>
              {m.photoUri ? (
                <Image source={{ uri: m.photoUri }} style={p.avatarCircle} />
              ) : (
                <View
                  style={[
                    p.avatarCircle,
                    { backgroundColor: getAvatarColor(m.id) },
                  ]}
                >
                  <Text style={p.avatarInitial}>
                    {m.name[0].toUpperCase()}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={p.name}>{m.name}</Text>
              <Text style={p.sub}>
                {m.relationship} · {m.city}, {m.country}
              </Text>
              <Text style={p.tz}>{m.timezone}</Text>
            </View>
            <View style={{ gap: 8 }}>
              <TouchableOpacity style={p.editBtn} onPress={() => setEditing(m)}>
                <Text
                  style={{ color: "#a78bfa", fontSize: 12, fontWeight: "600" }}
                >
                  Edit
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={p.deleteBtn}
                onPress={() => confirmDelete(m)}
              >
                <Text
                  style={{ color: "#f87171", fontSize: 12, fontWeight: "600" }}
                >
                  Remove
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
        <TouchableOpacity style={p.addBtn} onPress={() => setAdding(true)}>
          <Text style={p.addText}>+ Add Person</Text>
        </TouchableOpacity>
        <View style={{ height: 100 }} />
      </ScrollView>

      <Modal
        visible={!!editing}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={{ flex: 1, backgroundColor: "#0f0f1e", padding: 24 }}>
          {editing && (
            <MemberForm
              initial={editing}
              onSave={handleSaveEdit}
              onClose={() => setEditing(null)}
            />
          )}
        </View>
      </Modal>

      <Modal
        visible={adding}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={{ flex: 1, backgroundColor: "#0f0f1e", padding: 24 }}>
          <MemberForm onSave={handleSaveAdd} onClose={() => setAdding(false)} />
        </View>
      </Modal>

      <Modal visible={!!zoomUri} transparent animationType="fade">
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' }}
          activeOpacity={1}
          onPress={() => setZoomUri(null)}
        >
          {zoomUri && (
            <Image
              source={{ uri: zoomUri }}
              style={{ width: '90%', aspectRatio: 1, borderRadius: 16 }}
              resizeMode="cover"
            />
          )}
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const p = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#07080f" },
  scroll: { padding: 16, gap: 12 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarInitial: {
    color: "white",
    fontWeight: "700",
    fontSize: 20,
  },
  name: { fontSize: 17, fontWeight: "700", color: "#f0f0f6" },
  sub: { fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 2 },
  tz: { fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 1 },
  editBtn: {
    backgroundColor: "rgba(124,106,247,0.15)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "rgba(124,106,247,0.3)",
  },
  deleteBtn: {
    backgroundColor: "rgba(239,68,68,0.1)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.2)",
  },
  addBtn: {
    backgroundColor: "rgba(124,106,247,0.15)",
    borderRadius: 18,
    padding: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(124,106,247,0.3)",
    borderStyle: "dashed",
  },
  addText: { color: "#a78bfa", fontSize: 15, fontWeight: "700" },
});

const f = StyleSheet.create({
  modal: { flex: 1 },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#f0f0f6",
    marginBottom: 24,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255,255,255,0.4)",
    letterSpacing: 1,
    marginBottom: 8,
  },
  photoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 20,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarInitial: {
    color: "white",
    fontWeight: "700",
    fontSize: 26,
  },
  uploadBtn: {
    backgroundColor: "rgba(124,106,247,0.2)",
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(124,106,247,0.4)",
  },
  uploadText: { color: "#c4b5fd", fontWeight: "600", fontSize: 14 },
  input: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    color: "#f0f0f6",
    fontSize: 15,
    padding: 13,
    marginBottom: 16,
  },
  dateBtn: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    padding: 13,
    marginBottom: 16,
  },
  dateBtnText: {
    color: "#f0f0f6",
    fontSize: 15,
  },
  importantDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  dateBtn2: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 13,
    minWidth: 90,
    alignItems: "center",
  },
  dateBtnText2: {
    color: "#f0f0f6",
    fontSize: 13,
  },
  removeBtn: {
    backgroundColor: "rgba(239,68,68,0.15)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.3)",
  },
  removeBtnText: {
    color: "#f87171",
    fontSize: 12,
    fontWeight: "700",
  },
  addDateBtn: {
    backgroundColor: "rgba(124,106,247,0.15)",
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(124,106,247,0.3)",
    marginBottom: 16,
  },
  addDateText: {
    color: "#a78bfa",
    fontSize: 13,
    fontWeight: "600",
  },
  relBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  relBtnActive: {
    backgroundColor: "rgba(124,106,247,0.25)",
    borderWidth: 1,
    borderColor: "rgba(124,106,247,0.5)",
  },
  relText: { fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: "500" },
  relTextActive: { color: "#c4b5fd" },
  searchBtn: {
    backgroundColor: "rgba(124,106,247,0.3)",
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(124,106,247,0.4)",
  },
  cityResult: {
    fontSize: 12,
    color: "#86efac",
    backgroundColor: "rgba(34,197,94,0.1)",
    borderRadius: 8,
    padding: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.2)",
  },
  resultsList: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginBottom: 10,
    overflow: "hidden",
  },
  resultRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  resultRowActive: {
    backgroundColor: "rgba(124,106,247,0.18)",
  },
  resultText: {
    color: "#f0f0f6",
    fontSize: 14,
    fontWeight: "600",
  },
  resultTz: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 11,
    marginTop: 2,
  },
  notFound: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 13,
    fontStyle: "italic",
    marginBottom: 14,
    textAlign: "center",
  },
  actions: { flexDirection: "row", gap: 12, marginTop: 24 },
  cancelBtn: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 14,
    padding: 15,
    alignItems: "center",
  },
  saveBtn: {
    flex: 1,
    backgroundColor: "#7c6af7",
    borderRadius: 14,
    padding: 15,
    alignItems: "center",
  },
});
