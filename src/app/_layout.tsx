import { Stack, useRouter, useSegments } from "expo-router";
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
      if (!inAuth) router.replace("/(auth)/login");
      return;
    }

    if (!profile?.onboardingComplete) {
      if (!inOnboarding) router.replace("/(onboarding)/location");
      return;
    }

    if (inAuth || inOnboarding) router.replace("/tabs");
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
  return (
    <AuthProvider>
      <MembersProvider>
        <AuthGate />
      </MembersProvider>
    </AuthProvider>
  );
}
