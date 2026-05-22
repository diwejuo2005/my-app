import { Slot, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { MembersProvider } from "../context/MembersContext";
import { createUserProfile, UserProfile } from "../lib/firestore";

function AuthGate() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null | "loading">("loading");

  // Whenever auth user changes, load (or create) their Firestore profile
  useEffect(() => {
    if (loading) return;
    if (!user) { setProfile(null); return; }
    setProfile("loading");
    createUserProfile(user.uid, user.email ?? "").then(setProfile);
  }, [user, loading]);

  useEffect(() => {
    if (loading || profile === "loading") return;

    const inAuth = segments[0] === "(auth)";
    const inOnboarding = segments[0] === "(onboarding)";

    if (!user) {
      // Not logged in → login screen
      if (!inAuth) router.replace("/(auth)/login");
      return;
    }

    if (!profile?.onboardingComplete) {
      // Logged in but hasn't finished onboarding
      if (!inOnboarding) router.replace("/(onboarding)/profile");
      return;
    }

    // Fully set up → main app
    if (inAuth || inOnboarding) router.replace("/tabs");
  }, [user, loading, profile, segments]);

  if (loading || profile === "loading") {
    return (
      <View style={{ flex: 1, backgroundColor: "#07080f", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="#a78bfa" size="large" />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <MembersProvider>
        <AuthGate />
      </MembersProvider>
    </AuthProvider>
  );
}
