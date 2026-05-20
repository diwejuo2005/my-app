import { Stack } from "expo-router";
import { MembersProvider } from "../context/MembersContext";

export default function RootLayout() {
  return (
    <MembersProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </MembersProvider>
  );
}
