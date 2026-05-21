import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useFonts, DancingScript_700Bold } from '@expo-google-fonts/dancing-script';
import { Tabs, useRouter } from "expo-router";
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

function ScrollableTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  return (
    <View
      style={{
        position: "absolute",
        bottom: 24,
        left: 20,
        right: 20,
        borderRadius: 30,
        backgroundColor: "rgba(12,12,24,0.95)",
        shadowColor: "#7c6af7",
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 10,
        height: 65,
        overflow: "hidden",
      }}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 8,
          height: 65,
        }}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const label = (options.title ?? route.name) as string;
          const color = isFocused ? "#a78bfa" : "rgba(255,255,255,0.3)";

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={{
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 14,
                height: 65,
                gap: 3,
              }}
              activeOpacity={0.7}
            >
              {options.tabBarIcon?.({ color, size: 22, focused: isFocused })}
              <Text
                style={{
                  color,
                  fontSize: 10,
                  fontWeight: "600",
                  letterSpacing: 0.2,
                }}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

export default function TabLayout() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({ DancingScript_700Bold });

  return (
    <Tabs
      tabBar={(props) => <ScrollableTabBar {...props} />}
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
                <TouchableOpacity
                  onPress={() => router.push("/about")}
                  style={{ position: "absolute", left: 16, top: 8, padding: 6 }}
                >
                  <Ionicons name="information-circle-outline" size={22} color="#a78bfa" />
                </TouchableOpacity>
                <Text
                  style={{
                    color: "#f0f0f6",
                    fontSize: 32,
                    fontFamily: fontsLoaded ? 'DancingScript_700Bold' : undefined,
                    fontWeight: fontsLoaded ? undefined : "800",
                    letterSpacing: 0,
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
        name="calendar"
        options={{
          title: "Calendar",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="connect"
        options={{
          title: "Pulse",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="heart-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="news"
        options={{
          href: null,
          title: "News",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="newspaper" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="people"
        options={{
          href: null,
          title: "People",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          href: null,
          title: "Chat",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="moments"
        options={{
          href: null,
          title: "Moments",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="images-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
