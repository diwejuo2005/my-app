import { Ionicons } from "@expo/vector-icons";
import { Tabs, useRouter } from "expo-router";
import { SafeAreaView, Text, TouchableOpacity, View } from "react-native";

export default function TabLayout() {
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        header: ({ route, options }) => {
          const title = options.title ?? route.name;
          return (
            <SafeAreaView style={{ backgroundColor: "#07080f" }}>
              <View
                style={{
                  paddingTop: 8,
                  paddingBottom: 12,
                  paddingHorizontal: 16,
                  position: "relative",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: "#f0f0f6",
                    fontSize: 26,
                    fontWeight: "800",
                    letterSpacing: -0.5,
                  }}
                >
                  Ensemble
                </Text>
                <Text
                  style={{
                    color: "rgba(255,255,255,0.5)",
                    fontSize: 13,
                    fontWeight: "600",
                    marginTop: 2,
                    letterSpacing: 0.5,
                  }}
                >
                  {title}
                </Text>
                <TouchableOpacity
                  onPress={() => router.push("/settings")}
                  style={{ position: "absolute", right: 16, top: 8, padding: 6 }}
                >
                  <Ionicons name="settings-outline" size={22} color="#a78bfa" />
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          );
        },
        tabBarStyle: {
          position: "absolute",
          bottom: 24,
          left: 20,
          right: 20,
          borderRadius: 30,
          backgroundColor: "rgba(12,12,24,0.95)",
          borderTopWidth: 0,
          height: 65,
          paddingBottom: 8,
          shadowColor: "#7c6af7",
          shadowOpacity: 0.2,
          shadowRadius: 20,
          elevation: 10,
        },
        tabBarActiveTintColor: "#a78bfa",
        tabBarInactiveTintColor: "rgba(255,255,255,0.3)",
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600", marginBottom: 2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="globe"
        options={{
          title: "Globe",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="globe" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="news"
        options={{
          title: "News",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="newspaper" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="people"
        options={{
          title: "People",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
