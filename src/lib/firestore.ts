import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../config/firebase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ImportantDate = { label: string; date: string }; // date: "YYYY-MM-DD"

export type CalendarVisibility = "full" | "availability" | "hidden";

export type SharedCalendarEvent = {
  id: string;
  title: string;
  date: string; // "YYYY-MM-DD"
  startTime: string; // "HH:MM" 24h
  endTime: string; // "HH:MM" 24h
  color: string;
  notes?: string;
};

export type UserProfile = {
  uid: string;
  email: string;
  name: string;
  photoUrl: string | null;
  bio: string;
  // Not part of ProfileSnapshot — private to the owner, never shared with connections.
  phone: string;
  pronouns: string;
  city: string;
  region: string; // state / province, e.g. "North Carolina"
  country: string;
  countryCode: string;
  timezone: string;
  lat: number;
  lon: number;
  wakeHour: number;
  sleepHour: number;
  birthday: string;    // "YYYY-MM-DD"
  anniversary: string; // "YYYY-MM-DD"
  hometown: string;
  occupation: string;
  importantDates: ImportantDate[];
  pulseScores: Record<string, number>; // "YYYY-MM-DD" -> 1-5, current week only
  weeklyNote: string;
  // Same visibility level applied to every connection — not per-connection.
  calendarVisibility: CalendarVisibility;
  calendarEvents: SharedCalendarEvent[]; // already redacted per calendarVisibility before being stored
  onboardingComplete: boolean;
  createdAt: any;
};

// The subset of a profile that's safe to embed on a shared doc (invite,
// connection) so the other party can display it without needing Firestore
// read access to a stranger's `users/{uid}` document — only self-reads and
// reads of docs you're already a participant in are ever needed.
export type ProfileSnapshot = {
  uid: string;
  name: string;
  photoUrl: string | null;
  bio: string;
  city: string;
  region: string;
  country: string;
  countryCode: string;
  timezone: string;
  lat: number;
  lon: number;
  wakeHour: number;
  sleepHour: number;
  birthday: string;
  anniversary: string;
  hometown: string;
  occupation: string;
  importantDates: ImportantDate[];
  pulseScores: Record<string, number>;
  weeklyNote: string;
  calendarVisibility: CalendarVisibility;
  calendarEvents: SharedCalendarEvent[];
};

const SNAPSHOT_FIELDS: Array<keyof ProfileSnapshot> = [
  "name", "photoUrl", "bio", "city", "region", "country", "countryCode", "timezone", "lat", "lon", "wakeHour", "sleepHour",
  "birthday", "anniversary", "hometown", "occupation", "importantDates", "pulseScores", "weeklyNote",
  "calendarVisibility", "calendarEvents",
];

export function toProfileSnapshot(profile: UserProfile): ProfileSnapshot {
  return {
    uid: profile.uid,
    name: profile.name,
    photoUrl: profile.photoUrl,
    bio: profile.bio ?? "",
    city: profile.city,
    region: profile.region ?? "",
    country: profile.country,
    countryCode: profile.countryCode ?? "",
    timezone: profile.timezone,
    lat: profile.lat,
    lon: profile.lon,
    wakeHour: profile.wakeHour,
    sleepHour: profile.sleepHour,
    birthday: profile.birthday ?? "",
    anniversary: profile.anniversary ?? "",
    hometown: profile.hometown ?? "",
    occupation: profile.occupation ?? "",
    importantDates: profile.importantDates ?? [],
    pulseScores: profile.pulseScores ?? {},
    weeklyNote: profile.weeklyNote ?? "",
    calendarVisibility: profile.calendarVisibility ?? "full",
    calendarEvents: profile.calendarEvents ?? [],
  };
}

export type Invite = {
  id: string;
  creatorUid: string;
  creatorProfile: ProfileSnapshot;
  status: "pending" | "used" | "expired";
  usedByUid: string | null;
  createdAt: any;
  expiresAt: any;
};

export type Connection = {
  id: string;
  users: [string, string];
  status: "pending_label" | "accepted";
  initiatorUid: string;
  acceptorUid: string;
  labels: Record<string, string>; // uid → label they gave the other person
  nicknames?: Record<string, string>; // uid → private display name they gave the other person
  profiles: Record<string, ProfileSnapshot>; // uid → their profile snapshot, kept fresh by updateUserProfile
  createdAt: any;
  acceptedAt?: any;
};

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export async function createUserProfile(uid: string, email: string) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      uid,
      email,
      name: "",
      photoUrl: null,
      bio: "",
      phone: "",
      pronouns: "",
      city: "",
      region: "",
      country: "",
      countryCode: "",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      wakeHour: 7,
      sleepHour: 22,
      birthday: "",
      anniversary: "",
      hometown: "",
      occupation: "",
      importantDates: [],
      pulseScores: {},
      weeklyNote: "",
      calendarVisibility: "full",
      calendarEvents: [],
      onboardingComplete: false,
      createdAt: serverTimestamp(),
    });
  }
  return (await getDoc(ref)).data() as UserProfile;
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

export function watchUserProfile(uid: string, cb: (p: UserProfile | null) => void) {
  return onSnapshot(doc(db, "users", uid), (snap) => {
    cb(snap.exists() ? (snap.data() as UserProfile) : null);
  });
}

export async function updateUserProfile(uid: string, data: Partial<UserProfile>) {
  await updateDoc(doc(db, "users", uid), data as any);

  // Keep this user's embedded snapshot fresh on every connection they're
  // part of, so a connection partner never needs read access to this
  // user's own profile doc — only to the connection doc they already share.
  const changedFields = SNAPSHOT_FIELDS.filter((f) => f in data);
  if (changedFields.length === 0) return;

  const q = query(collection(db, "connections"), where("users", "array-contains", uid));
  const snap = await getDocs(q);
  await Promise.all(
    snap.docs.map((d) => {
      const updates: Record<string, any> = {};
      for (const f of changedFields) updates[`profiles.${uid}.${f}`] = (data as any)[f];
      return updateDoc(d.ref, updates);
    })
  );
}

// ---------------------------------------------------------------------------
// Invites
// ---------------------------------------------------------------------------

export async function createInvite(
  creatorUid: string,
  creatorProfile: ProfileSnapshot
): Promise<string> {
  const expiresAt = Timestamp.fromDate(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  );
  const ref = await addDoc(collection(db, "invites"), {
    creatorUid,
    creatorProfile,
    status: "pending",
    usedByUid: null,
    createdAt: serverTimestamp(),
    expiresAt,
  });
  return ref.id;
}

export async function getInvite(inviteId: string): Promise<Invite | null> {
  const snap = await getDoc(doc(db, "invites", inviteId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Invite;
}

// ---------------------------------------------------------------------------
// Connections
// ---------------------------------------------------------------------------

export async function acceptInvite(
  inviteId: string,
  invite: Invite,
  acceptorUid: string,
  acceptorLabel: string, // what the acceptor calls the creator (e.g. "Dad")
): Promise<string> {
  // Mark invite as used
  await updateDoc(doc(db, "invites", inviteId), {
    status: "used",
    usedByUid: acceptorUid,
  });

  // Self-read only — building the acceptor's own snapshot to embed.
  const acceptorProfile = await getUserProfile(acceptorUid);

  // Create connection — starts as pending_label so creator can label acceptor too
  const ref = await addDoc(collection(db, "connections"), {
    users: [invite.creatorUid, acceptorUid],
    status: "pending_label",
    initiatorUid: invite.creatorUid,
    acceptorUid,
    labels: { [acceptorUid]: acceptorLabel },
    profiles: {
      [invite.creatorUid]: invite.creatorProfile,
      ...(acceptorProfile ? { [acceptorUid]: toProfileSnapshot(acceptorProfile) } : {}),
    },
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function labelConnection(
  connectionId: string,
  uid: string,
  label: string
): Promise<void> {
  const ref = doc(db, "connections", connectionId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data();
  const updatedLabels = { ...(data.labels ?? {}), [uid]: label };
  const bothLabeled = data.users.every((u: string) => updatedLabels[u]);
  await updateDoc(ref, {
    [`labels.${uid}`]: label,
    status: bothLabeled ? "accepted" : "pending_label",
    // Only stamp the first time it becomes accepted, not on every relabel.
    ...(bothLabeled && data.status !== "accepted" ? { acceptedAt: serverTimestamp() } : {}),
  });
}

// The name `uid` sees for the other person, like a saved contact name. Blank
// clears it so they're shown by the name they set on their own profile.
export async function setConnectionNickname(
  connectionId: string,
  uid: string,
  nickname: string
): Promise<void> {
  const trimmed = nickname.trim();
  await updateDoc(doc(db, "connections", connectionId), {
    [`nicknames.${uid}`]: trimmed ? trimmed : deleteField(),
  });
}

export function watchConnections(uid: string, cb: (c: Connection[]) => void) {
  const q = query(
    collection(db, "connections"),
    where("users", "array-contains", uid)
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Connection)));
  });
}

function connectionsToProfiles(
  connections: Connection[],
  uid: string
): Array<{ connection: Connection; profile: ProfileSnapshot }> {
  const results: Array<{ connection: Connection; profile: ProfileSnapshot }> = [];
  for (const conn of connections) {
    const otherUid = conn.users.find((u) => u !== uid)!;
    const profile = conn.profiles?.[otherUid];
    if (profile) results.push({ connection: conn, profile });
  }
  return results;
}

export async function getConnectionsWithProfiles(
  uid: string
): Promise<Array<{ connection: Connection; profile: ProfileSnapshot }>> {
  const q = query(
    collection(db, "connections"),
    where("users", "array-contains", uid)
  );
  const snap = await getDocs(q);
  const connections = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Connection));
  return connectionsToProfiles(connections, uid);
}

export function watchConnectionsWithProfiles(
  uid: string,
  cb: (items: Array<{ connection: Connection; profile: ProfileSnapshot }>) => void
) {
  const q = query(
    collection(db, "connections"),
    where("users", "array-contains", uid)
  );
  return onSnapshot(q, (snap) => {
    const connections = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Connection));
    cb(connectionsToProfiles(connections, uid));
  });
}

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

export type ChatMessage = {
  id: string;
  senderId: string;
  text: string;
  imageUrl: string | null;
  videoUrl: string | null;
  audioUrl: string | null;
  timestamp: any;
  editedAt?: any;
};

// Deterministic from the two participants' uids alone, so security rules
// can validate access from the chat ID itself with no extra document reads.
export function chatIdFor(uidA: string, uidB: string): string {
  return [uidA, uidB].sort().join("_");
}

export function watchMessages(chatId: string, cb: (messages: ChatMessage[]) => void) {
  const q = query(collection(db, "chats", chatId, "messages"), orderBy("timestamp", "asc"));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChatMessage)));
  });
}

export async function sendMessage(
  chatId: string,
  senderId: string,
  data: { text?: string; imageUrl?: string; videoUrl?: string; audioUrl?: string }
): Promise<string> {
  const ref = await addDoc(collection(db, "chats", chatId, "messages"), {
    senderId,
    text: data.text ?? "",
    imageUrl: data.imageUrl ?? null,
    videoUrl: data.videoUrl ?? null,
    audioUrl: data.audioUrl ?? null,
    timestamp: serverTimestamp(),
  });
  return ref.id;
}

export async function editMessage(chatId: string, messageId: string, text: string) {
  await updateDoc(doc(db, "chats", chatId, "messages", messageId), {
    text,
    editedAt: serverTimestamp(),
  });
}

export async function deleteMessage(chatId: string, messageId: string) {
  await deleteDoc(doc(db, "chats", chatId, "messages", messageId));
}
