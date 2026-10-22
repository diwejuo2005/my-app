import React, { createContext, useContext, useEffect, useState } from "react";
import {
  CalendarVisibility,
  Connection,
  ImportantDate,
  ProfileSnapshot,
  SharedCalendarEvent,
  watchConnectionsWithProfiles,
} from "../lib/firestore";
import { useAuth } from "./AuthContext";

// A person the signed-in user is connected to, derived from the other
// participant's profile snapshot embedded on the shared connection doc.
export type Member = {
  id: number; // stable numeric hash of uid — used for avatar colors, list keys, etc.
  uid: string;
  connectionId: string;
  name: string;
  relationship: string; // the label the signed-in user gave this person
  photoUri?: string;
  city: string;
  country: string;
  timezone: string;
  lat: number;
  lon: number;
  wakeHour: number;
  sleepHour: number;
  birthday?: string;    // "YYYY-MM-DD"
  anniversary?: string; // "YYYY-MM-DD"
  hometown?: string;
  occupation?: string;
  importantDates?: ImportantDate[];
  pulseScores?: Record<string, number>;
  weeklyNote?: string;
  calendarVisibility?: CalendarVisibility;
  calendarEvents?: SharedCalendarEvent[];
};

function uidToNum(uid: string): number {
  let h = 0;
  for (let i = 0; i < uid.length; i++) h = Math.imul(31, h) + uid.charCodeAt(i) | 0;
  return Math.abs(h);
}

function profileToMember(profile: ProfileSnapshot, connection: Connection, myUid: string): Member {
  return {
    id: uidToNum(profile.uid),
    uid: profile.uid,
    connectionId: connection.id,
    name: profile.name,
    relationship: connection.labels?.[myUid] ?? "Connection",
    photoUri: profile.photoUrl ?? undefined,
    city: profile.city,
    country: profile.country,
    timezone: profile.timezone || "UTC",
    lat: profile.lat ?? 0,
    lon: profile.lon ?? 0,
    wakeHour: profile.wakeHour ?? 7,
    sleepHour: profile.sleepHour ?? 22,
    birthday: profile.birthday || undefined,
    anniversary: profile.anniversary || undefined,
    hometown: profile.hometown || undefined,
    occupation: profile.occupation || undefined,
    importantDates: profile.importantDates ?? [],
    pulseScores: profile.pulseScores ?? {},
    weeklyNote: profile.weeklyNote ?? "",
    calendarVisibility: profile.calendarVisibility ?? "full",
    calendarEvents: profile.calendarEvents ?? [],
  };
}

type Ctx = { members: Member[]; loading: boolean };
const MembersContext = createContext<Ctx>({ members: [], loading: true });

export function MembersProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  // Tagged with the uid it was loaded for, so a sign-out or account switch
  // never shows the previous user's members while the new snapshot loads.
  const [loaded, setLoaded] = useState<{ uid: string; members: Member[] } | null>(null);

  useEffect(() => {
    if (!uid) return;
    return watchConnectionsWithProfiles(uid, (items) => {
      // Include pending_label too so both people see each other right after an invite is accepted
      const connected = items.filter(
        (i) => i.connection.status === "accepted" || i.connection.status === "pending_label"
      );
      setLoaded({ uid, members: connected.map(({ connection, profile }) => profileToMember(profile, connection, uid)) });
    });
  }, [uid]);

  const current = uid && loaded?.uid === uid ? loaded.members : null;
  const value = { members: current ?? [], loading: uid !== null && current === null };

  return <MembersContext.Provider value={value}>{children}</MembersContext.Provider>;
}

export const useMembers = () => useContext(MembersContext);
