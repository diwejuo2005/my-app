import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { MembersProvider } from "../context/MembersContext";
import { createUserProfile, UserProfile, watchUserProfile } from "../lib/firestore";
import { migrateLegacyStorageKeys } from "../lib/migrateStorage";

const PENDING_INVITE_KEY = "pendingInviteId";

function AuthGate() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null | "loading">("loading");

  useEffect(() => {
    if (loading) return;
    if (!user) { setProfile(null); return; }
    setProfile("loading");
    let unsub: (() => void) | null = null;
    createUserProfile(user.uid, user.email ?? "").then(() => {
      unsub = watchUserProfile(user.uid, (p) => setProfile(p ?? null));
    });
    return () => { unsub?.(); };
  }, [user, loading]);

  useEffect(() => {
    if (loading || profile === "loading") return;

    const inAuth = segments[0] === "(auth)";
    const inOnboarding = segments[0] === "(onboarding)";
    const inInvite = segments[0] === "invite";

    if (!user) {
      // Let the invite screen handle its own unauthenticated state
      if (!inAuth && !inInvite) router.replace("/(auth)/login");
      return;
    }

    if (!profile?.onboardingComplete) {
      if (!inOnboarding) router.replace("/(onboarding)/location");
      return;
    }

    // Fully authenticated and onboarded. Read pendingInvite fresh right here
    // instead of from state set once at mount — the invite screen can write
    // it during this same live session (when the user taps "Sign In /
    // Create Account"), well after AuthGate already mounted and did its one
    // read, so a stale state value would never see it.
    if (inAuth || inOnboarding) {
      AsyncStorage.getItem(PENDING_INVITE_KEY).then((pendingInvite) => {
        if (pendingInvite) {
          AsyncStorage.removeItem(PENDING_INVITE_KEY);
          router.replace(`/invite/${pendingInvite}` as any);
        } else {
          router.replace("/tabs");
        }
      });
    }
  }, [user, loading, profile, segments]);

  if (loading || profile === "loading") {
    return (
      <View style={{ flex: 1, backgroundColor: "#07080f", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="#a78bfa" size="large" />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  // Screens read local storage on mount, so finish renaming legacy keys first.
  const [storageReady, setStorageReady] = useState(false);
  useEffect(() => {
    migrateLegacyStorageKeys()
      .catch((err) => console.warn("[inStereo] Storage migration failed:", err))
      .finally(() => setStorageReady(true));
  }, []);

  if (!storageReady) {
    return <View style={{ flex: 1, backgroundColor: "#07080f" }} />;
  }

  return (
    <AuthProvider>
      <MembersProvider>
        <AuthGate />
      </MembersProvider>
    </AuthProvider>
  );
}
