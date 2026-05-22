import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
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
  onboardingComplete: boolean;
  createdAt: any;
};

export type Connection = {
  id: string;
  users: [string, string];
  status: "pending" | "accepted";
  initiatorUid: string;
  label: Record<string, string>; // uid → label they gave the other person
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
// Connections
// ---------------------------------------------------------------------------

export async function getConnections(uid: string): Promise<Connection[]> {
  const q = query(
    collection(db, "connections"),
    where("users", "array-contains", uid),
    where("status", "==", "accepted")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Connection));
}

export function watchConnections(uid: string, cb: (c: Connection[]) => void) {
  const q = query(
    collection(db, "connections"),
    where("users", "array-contains", uid),
    where("status", "==", "accepted")
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Connection)));
  });
}
