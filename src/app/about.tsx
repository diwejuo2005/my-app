import { Ionicons } from "@expo/vector-icons";
import { useFonts, DancingScript_700Bold } from '@expo-google-fonts/dancing-script';
import { Stack, useRouter } from "expo-router";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const FEATURES = [
  "Real-time local time for each person in your life",
  "Live weather where they are",
  "Country-specific news and safety alerts",
  "Birthday and anniversary reminders",
  "Interactive globe showing where everyone is",
  "Push notifications for events that matter",
];

export default function AboutScreen() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({ DancingScript_700Bold });

  return (
    <View style={a.root}>
      <StatusBar barStyle="light-content" />
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'About',
          headerStyle: { backgroundColor: '#07080f' },
          headerTintColor: '#f0f0f6',
        }}
      />
      <ScrollView
        contentContainerStyle={a.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={a.hero}>
          <Text
            style={[
              a.heroTitle,
              {
                fontFamily: fontsLoaded ? 'DancingScript_700Bold' : undefined,
                fontWeight: fontsLoaded ? undefined : '800',
              },
            ]}
          >
            Ensemble
          </Text>
          <Text style={a.heroSlogan}>everyone, everywhere, all together</Text>
        </View>

        {/* Our Mission */}
        <View style={a.card}>
          <Text style={a.sectionTitle}>Our Mission</Text>
          <Text style={a.body}>
            Ensemble bridges the distance between you and the people you love. Built for a world where families are spread across cities, time zones, and continents — we make staying close feel effortless. No mental math, no scattered apps. Just your people, at a glance.
          </Text>
        </View>

        {/* What Ensemble Can Do */}
        <View style={a.card}>
          <Text style={a.sectionTitle}>What Ensemble Can Do</Text>
          {FEATURES.map((feature, i) => (
            <View key={i} style={a.featureRow}>
              <Ionicons name="checkmark-circle" size={16} color="#a78bfa" style={{ marginTop: 2 }} />
              <Text style={a.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        {/* Countries We Support */}
        <View style={a.card}>
          <Text style={a.sectionTitle}>Countries We Support</Text>
          <Text style={a.body}>
            Ensemble supports locations in over 180 countries — from the United States and United Kingdom to India, Nigeria, Brazil, Japan, and everywhere in between. Our news coverage spans major regions worldwide with local context for each.
          </Text>
        </View>

        {/* A Note From the Founder */}
        <View style={a.card}>
          <Text style={a.sectionTitle}>A Note From the Founder</Text>
          <Text style={a.quote}>
            Distance is a fact. Disconnection is a choice. Ensemble was built because staying close to family should not require effort — it should be as natural as looking at your phone. We built this for every student studying abroad, every immigrant starting over, every parent watching their child move across the world. You are not alone.
          </Text>
        </View>

        {/* Footer */}
        <View style={a.footer}>
          <Text style={a.footerText}>Ensemble · v0.1 · Made with care</Text>
        </View>
        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const a = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#07080f' },
  scroll: { padding: 20, gap: 16 },
  hero: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  heroTitle: {
    fontSize: 56,
    color: '#f0f0f6',
    letterSpacing: 0,
  },
  heroSlogan: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 6,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  sectionTitle: {
    color: '#a78bfa',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  body: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 15,
    lineHeight: 24,
  },
  quote: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 15,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  featureText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
    lineHeight: 22,
    flex: 1,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 12,
    letterSpacing: 0.5,
  },
});
