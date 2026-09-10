import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
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

export type UserProfile = {
  uid: string;
  email: string;
  name: string;
  photoUrl: string | null;
  city: string;
  country: string;
  countryCode: string;
  timezone: string;
  lat: number;
  lon: number;
  wakeHour: number;
  sleepHour: number;
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
  city: string;
  country: string;
  timezone: string;
  lat: number;
  lon: number;
  wakeHour: number;
  sleepHour: number;
};

const SNAPSHOT_FIELDS: Array<keyof ProfileSnapshot> = [
  "name", "photoUrl", "city", "country", "timezone", "lat", "lon", "wakeHour", "sleepHour",
];

export function toProfileSnapshot(profile: UserProfile): ProfileSnapshot {
  return {
    uid: profile.uid,
    name: profile.name,
    photoUrl: profile.photoUrl,
    city: profile.city,
    country: profile.country,
    timezone: profile.timezone,
    lat: profile.lat,
    lon: profile.lon,
    wakeHour: profile.wakeHour,
    sleepHour: profile.sleepHour,
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
      city: "",
      country: "",
      countryCode: "",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
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
    ...(bothLabeled ? { acceptedAt: serverTimestamp() } : {}),
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
