import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "../config/firebase";

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserProfile = {
  uid: string;
  email: string;
  name: string;
  photoUrl?: string;
  city: string;
  country: string;
  countryCode: string;
  timezone: string;
  lat: number;
  lon: number;
  wakeHour: number;
  sleepHour: number;
  onboardingComplete?: boolean;
};

export type Connection = {
  id: string;
  users: string[];
  status: "pending_label" | "accepted";
  labels?: Record<string, string>;
  createdAt: Timestamp;
};

export type Invite = {
  id: string;
  creatorUid: string;
  creatorName: string;
  creatorPhotoUrl?: string;
  creatorCity?: string;
  creatorCountry?: string;
  status: "pending" | "used";
  createdAt: Timestamp;
};

export type ChatMessage = {
  id: string;
  senderUid: string;
  text?: string | null;
  imageUrl?: string | null;
  sentAt: Timestamp;
  editedAt?: Timestamp;
};

export type PulseEntry = {
  id: string;
  date: string;
  score: number;
  notes?: string | null;
  createdAt: Timestamp;
};

export type ScheduleEvent = {
  id: string;
  title: string;
  date: string;
  time?: string | null;
  allDay: boolean;
  notes?: string | null;
  createdAt: Timestamp;
};

// ─── User Profiles ────────────────────────────────────────────────────────────

export async function createUserProfile(uid: string, email: string): Promise<void> {
  const docRef = doc(db, "users", uid);
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    await setDoc(docRef, {
      uid,
      email,
      name: "",
      city: "",
      country: "",
      countryCode: "",
      timezone: "UTC",
      lat: 0,
      lon: 0,
      wakeHour: 7,
      sleepHour: 22,
      onboardingComplete: false,
    });
  }
}

export function watchUserProfile(uid: string, cb: (p: UserProfile | null) => void): () => void {
  return onSnapshot(doc(db, "users", uid), (snap) =>
    cb(snap.exists() ? (snap.data() as UserProfile) : null)
  );
}

export async function updateUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
  await updateDoc(doc(db, "users", uid), data as any);
}

// ─── Invites ──────────────────────────────────────────────────────────────────

export async function createInvite(creatorUid: string, profile: UserProfile): Promise<string> {
  const newRef = doc(collection(db, "invites"));
  await setDoc(newRef, {
    id: newRef.id,
    creatorUid,
    creatorName: profile.name,
    creatorPhotoUrl: profile.photoUrl ?? null,
    creatorCity: profile.city ?? null,
    creatorCountry: profile.country ?? null,
    status: "pending",
    createdAt: serverTimestamp(),
  });
  return newRef.id;
}

export async function getInvite(inviteId: string): Promise<Invite | null> {
  const snap = await getDoc(doc(db, "invites", inviteId));
  return snap.exists() ? (snap.data() as Invite) : null;
}

export async function acceptInvite(
  inviteId: string,
  invite: Invite,
  acceptorUid: string,
  relationshipLabel: string
): Promise<void> {
  await updateDoc(doc(db, "invites", inviteId), { status: "used" });
  const connRef = doc(collection(db, "connections"));
  await setDoc(connRef, {
    id: connRef.id,
    users: [invite.creatorUid, acceptorUid],
    status: "pending_label",
    labels: { [acceptorUid]: relationshipLabel },
    createdAt: serverTimestamp(),
  });
}

export async function labelConnection(
  connectionId: string,
  uid: string,
  label: string
): Promise<void> {
  await updateDoc(doc(db, "connections", connectionId), {
    [`labels.${uid}`]: label,
    status: "accepted",
  });
}

// ─── Connections + Profiles ───────────────────────────────────────────────────

export function watchConnectionsWithProfiles(
  uid: string,
  cb: (items: Array<{ connection: Connection; profile: UserProfile }>) => void
): () => void {
  const q = query(collection(db, "connections"), where("users", "array-contains", uid));
  return onSnapshot(q, async (snap) => {
    const results = await Promise.all(
      snap.docs.map(async (d) => {
        const conn = d.data() as Connection;
        const otherUid = conn.users.find((u) => u !== uid);
        if (!otherUid) return null;
        const profileSnap = await getDoc(doc(db, "users", otherUid));
        if (!profileSnap.exists()) return null;
        return { connection: conn, profile: profileSnap.data() as UserProfile };
      })
    );
    cb(results.filter(Boolean) as Array<{ connection: Connection; profile: UserProfile }>);
  });
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export function chatId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join("_");
}

export function watchChatMessages(
  myUid: string,
  theirUid: string,
  cb: (msgs: ChatMessage[]) => void
): () => void {
  const cid = chatId(myUid, theirUid);
  const q = query(collection(db, "chats", cid, "messages"), orderBy("sentAt", "asc"));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChatMessage)));
  });
}

export async function sendChatMessage(
  myUid: string,
  theirUid: string,
  text: string,
  imageUrl?: string
): Promise<void> {
  const cid = chatId(myUid, theirUid);
  await setDoc(doc(db, "chats", cid), { participants: [myUid, theirUid] }, { merge: true });
  await addDoc(collection(db, "chats", cid, "messages"), {
    senderUid: myUid,
    text: text || null,
    imageUrl: imageUrl || null,
    sentAt: serverTimestamp(),
  });
}

export async function editChatMessage(
  myUid: string,
  theirUid: string,
  msgId: string,
  newText: string
): Promise<void> {
  const cid = chatId(myUid, theirUid);
  await updateDoc(doc(db, "chats", cid, "messages", msgId), {
    text: newText,
    editedAt: serverTimestamp(),
  });
}

export async function deleteChatMessage(
  myUid: string,
  theirUid: string,
  msgId: string
): Promise<void> {
  const cid = chatId(myUid, theirUid);
  await deleteDoc(doc(db, "chats", cid, "messages", msgId));
}

export async function uploadChatMedia(
  myUid: string,
  theirUid: string,
  localUri: string
): Promise<string> {
  const cid = chatId(myUid, theirUid);
  const filename = `chats/${cid}/${Date.now()}_${myUid}`;
  const blob = await (await fetch(localUri)).blob();
  const storageRef = ref(storage, filename);
  await uploadBytes(storageRef, blob);
  return getDownloadURL(storageRef);
}

// ─── Pulse ────────────────────────────────────────────────────────────────────

export function watchPulseWeek(uid: string, cb: (entries: PulseEntry[]) => void): () => void {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const q = query(
    collection(db, "pulseData", uid, "entries"),
    where("date", ">=", cutoffStr),
    orderBy("date", "asc")
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as PulseEntry)));
  });
}

export async function logPulseScore(
  uid: string,
  date: string,
  score: number,
  notes?: string
): Promise<void> {
  const entryRef = doc(db, "pulseData", uid, "entries", date);
  await setDoc(
    entryRef,
    { id: date, date, score, notes: notes ?? null, createdAt: serverTimestamp() },
    { merge: true }
  );
}

// ─── Schedule ─────────────────────────────────────────────────────────────────

export function watchSchedule(uid: string, cb: (events: ScheduleEvent[]) => void): () => void {
  const today = new Date().toISOString().slice(0, 10);
  const q = query(
    collection(db, "scheduleData", uid, "events"),
    where("date", ">=", today),
    orderBy("date", "asc")
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ScheduleEvent)));
  });
}

export async function addScheduleEvent(
  uid: string,
  event: Omit<ScheduleEvent, "id" | "createdAt">
): Promise<void> {
  const eventRef = doc(collection(db, "scheduleData", uid, "events"));
  await setDoc(eventRef, { ...event, id: eventRef.id, createdAt: serverTimestamp() });
}

export async function deleteScheduleEvent(uid: string, eventId: string): Promise<void> {
  await deleteDoc(doc(db, "scheduleData", uid, "events", eventId));
}
