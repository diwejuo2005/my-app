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

export type Invite = {
  id: string;
  creatorUid: string;
  creatorName: string;
  creatorPhotoUrl: string | null;
  creatorCity: string;
  creatorCountry: string;
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
}

// ---------------------------------------------------------------------------
// Invites
// ---------------------------------------------------------------------------

export async function createInvite(
  creatorUid: string,
  creatorName: string,
  creatorPhotoUrl: string | null,
  creatorCity: string,
  creatorCountry: string
): Promise<string> {
  const expiresAt = Timestamp.fromDate(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  );
  const ref = await addDoc(collection(db, "invites"), {
    creatorUid,
    creatorName,
    creatorPhotoUrl,
    creatorCity,
    creatorCountry,
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

  // Create connection — starts as pending_label so creator can label acceptor too
  const ref = await addDoc(collection(db, "connections"), {
    users: [invite.creatorUid, acceptorUid],
    status: "pending_label",
    initiatorUid: invite.creatorUid,
    acceptorUid,
    labels: { [acceptorUid]: acceptorLabel },
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

export async function getConnectionsWithProfiles(
  uid: string
): Promise<Array<{ connection: Connection; profile: UserProfile }>> {
  const q = query(
    collection(db, "connections"),
    where("users", "array-contains", uid)
  );
  const snap = await getDocs(q);
  const connections = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Connection));

  const results: Array<{ connection: Connection; profile: UserProfile }> = [];
  for (const conn of connections) {
    const otherUid = conn.users.find((u) => u !== uid)!;
    const profile = await getUserProfile(otherUid);
    if (profile) results.push({ connection: conn, profile });
  }
  return results;
}

export function watchConnectionsWithProfiles(
  uid: string,
  cb: (items: Array<{ connection: Connection; profile: UserProfile }>) => void
) {
  const q = query(
    collection(db, "connections"),
    where("users", "array-contains", uid)
  );
  return onSnapshot(q, async (snap) => {
    const connections = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Connection));
    const results: Array<{ connection: Connection; profile: UserProfile }> = [];
    for (const conn of connections) {
      const otherUid = conn.users.find((u) => u !== uid)!;
      const profile = await getUserProfile(otherUid);
      if (profile) results.push({ connection: conn, profile });
    }
    cb(results);
  });
}
