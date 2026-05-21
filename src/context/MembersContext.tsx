import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

export type Member = {
  id: number;
  name: string;
  relationship: string;
  photoUri?: string;
  city: string;
  country: string;
  timezone: string;
  lat: number;
  lon: number;
  wakeHour: number;
  sleepHour: number;
  birthday?: string;        // "YYYY-MM-DD"
  anniversary?: string;     // "YYYY-MM-DD"
  hometown?: string;        // free text
  occupation?: string;      // free text
  importantDates?: Array<{ label: string; date: string }>; // up to 5
};

const DEFAULTS: Member[] = [
  {
    id: 1,
    name: "Mom",
    relationship: "Mother",
    city: "New York",
    country: "US",
    timezone: "America/New_York",
    lat: 40.7128,
    lon: -74.006,
    wakeHour: 7,
    sleepHour: 22,
  },
  {
    id: 2,
    name: "Dad",
    relationship: "Father",
    city: "Chicago",
    country: "US",
    timezone: "America/Chicago",
    lat: 41.8781,
    lon: -87.6298,
    wakeHour: 6,
    sleepHour: 21,
  },
  {
    id: 3,
    name: "Nani",
    relationship: "Grandmother",
    city: "Mumbai",
    country: "IN",
    timezone: "Asia/Kolkata",
    lat: 19.076,
    lon: 72.8777,
    wakeHour: 5,
    sleepHour: 21,
  },
  {
    id: 4,
    name: "Alex",
    relationship: "Sibling",
    city: "London",
    country: "GB",
    timezone: "Europe/London",
    lat: 51.5074,
    lon: -0.1278,
    wakeHour: 8,
    sleepHour: 23,
  },
];

type Ctx = {
  members: Member[];
  addMember: (m: Member) => void;
  updateMember: (m: Member) => void;
  removeMember: (id: number) => void;
};
const MembersContext = createContext<Ctx | null>(null);

export function MembersProvider({ children }: { children: React.ReactNode }) {
  const [members, setMembers] = useState<Member[]>(DEFAULTS);

  useEffect(() => {
    AsyncStorage.getItem("ensemble_members").then(async (d) => {
      if (!d) return;
      const parsed: Member[] = JSON.parse(d);
      let filled = parsed.map((stored) => {
        const def = DEFAULTS.find((x) => x.id === stored.id);
        return { ...def, ...stored, timezone: stored.timezone || def?.timezone || "UTC" };
      });

      // Auto-correct members whose timezone is "GMT" — this was incorrectly stored
      // by a bug in the city search fallback that used the weather API without timezone=auto.
      const needsFix = filled.some((m) => m.timezone === "GMT");
      if (needsFix) {
        filled = await Promise.all(
          filled.map(async (m) => {
            if (m.timezone !== "GMT") return m;
            try {
              const res = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${m.lat}&longitude=${m.lon}&current=temperature_2m&timezone=auto`,
              );
              const data = await res.json();
              if (data?.timezone && data.timezone !== "GMT") {
                return { ...m, timezone: data.timezone };
              }
            } catch {}
            return m;
          }),
        );
        AsyncStorage.setItem("ensemble_members", JSON.stringify(filled));
      }

      setMembers(filled);
    });
  }, []);

  const save = (list: Member[]) => {
    setMembers(list);
    AsyncStorage.setItem("ensemble_members", JSON.stringify(list));
  };

  return (
    <MembersContext.Provider
      value={{
        members,
        addMember: (m) => save([...members, m]),
        updateMember: (m) => save(members.map((x) => (x.id === m.id ? m : x))),
        removeMember: (id) => save(members.filter((x) => x.id !== id)),
      }}
    >
      {children}
    </MembersContext.Provider>
  );
}

export const useMembers = () => useContext(MembersContext)!;
