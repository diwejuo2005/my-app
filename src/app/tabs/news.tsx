import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Member, useMembers } from "../../context/MembersContext";
import { notifyCritical } from "../../lib/notifications";

const AVATAR_COLORS = [
  "#2d3a5a",
  "#2d4a3e",
  "#3a2d4a",
  "#4a3a2d",
  "#2d4a4a",
];

function getAvatarColor(id: number) {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

const COUNTRY_TAG: Record<string, string> = {
  US: "world/united-states",
  GB: "world/uk",
  IN: "world/india",
  AU: "world/australia",
  CA: "world/canada",
  FR: "world/france",
  DE: "world/germany",
  JP: "world/japan",
  CN: "world/china",
  BR: "world/brazil",
  MX: "world/mexico",
  NG: "world/nigeria",
  ZA: "world/south-africa",
  IT: "world/italy",
  ES: "world/spain",
  PK: "world/pakistan",
  GH: "world/ghana",
  KE: "world/kenya",
  EG: "world/egypt",
  ET: "world/ethiopia",
  RU: "world/russia",
  UA: "world/ukraine",
  IL: "world/israel",
  IR: "world/iran",
  SA: "world/saudiarabia",
  AE: "world/uae",
  TR: "world/turkey",
  GR: "world/greece",
  PT: "world/portugal",
  NL: "world/netherlands",
  BE: "world/belgium",
  CH: "world/switzerland",
  AT: "world/austria",
  SE: "world/sweden",
  NO: "world/norway",
  DK: "world/denmark",
  FI: "world/finland",
  IE: "world/ireland",
  PL: "world/poland",
  RO: "world/romania",
  HU: "world/hungary",
  CZ: "world/czech-republic",
  KR: "world/south-korea",
  KP: "world/north-korea",
  TH: "world/thailand",
  VN: "world/vietnam",
  ID: "world/indonesia",
  PH: "world/philippines",
  MY: "world/malaysia",
  SG: "world/singapore",
  NZ: "world/new-zealand",
  AR: "world/argentina",
  CL: "world/chile",
  CO: "world/colombia",
  PE: "world/peru",
  VE: "world/venezuela",
  BD: "world/bangladesh",
  LK: "world/sri-lanka",
  NP: "world/nepal",
  MM: "world/burma",
  AF: "world/afghanistan",
  IQ: "world/iraq",
  SY: "world/syria",
  LB: "world/lebanon",
  JO: "world/jordan",
  YE: "world/yemen",
  MA: "world/morocco",
  DZ: "world/algeria",
  TN: "world/tunisia",
  LY: "world/libya",
  SD: "world/sudan",
  SS: "world/southsudan",
  SO: "world/somalia",
  UG: "world/uganda",
  TZ: "world/tanzania",
  RW: "world/rwanda",
  CM: "world/cameroon",
  CI: "world/ivorycoast",
  SN: "world/senegal",
  ZW: "world/zimbabwe",
  ZM: "world/zambia",
  MZ: "world/mozambique",
};

const COUNTRY_NAME: Record<string, string> = {
  US: "United States",
  GB: "United Kingdom",
  IN: "India",
  AU: "Australia",
  CA: "Canada",
  FR: "France",
  DE: "Germany",
  JP: "Japan",
  CN: "China",
  BR: "Brazil",
  MX: "Mexico",
  NG: "Nigeria",
  ZA: "South Africa",
  IT: "Italy",
  ES: "Spain",
  PK: "Pakistan",
  GH: "Ghana",
  KE: "Kenya",
  EG: "Egypt",
  ET: "Ethiopia",
  RU: "Russia",
  UA: "Ukraine",
  IL: "Israel",
  IR: "Iran",
  SA: "Saudi Arabia",
  AE: "United Arab Emirates",
  TR: "Turkey",
  GR: "Greece",
  PT: "Portugal",
  NL: "Netherlands",
  BE: "Belgium",
  CH: "Switzerland",
  AT: "Austria",
  SE: "Sweden",
  NO: "Norway",
  DK: "Denmark",
  FI: "Finland",
  IE: "Ireland",
  PL: "Poland",
  RO: "Romania",
  HU: "Hungary",
  CZ: "Czech Republic",
  KR: "South Korea",
  KP: "North Korea",
  TH: "Thailand",
  VN: "Vietnam",
  ID: "Indonesia",
  PH: "Philippines",
  MY: "Malaysia",
  SG: "Singapore",
  NZ: "New Zealand",
  AR: "Argentina",
  CL: "Chile",
  CO: "Colombia",
  PE: "Peru",
  VE: "Venezuela",
  BD: "Bangladesh",
  LK: "Sri Lanka",
  NP: "Nepal",
  MM: "Myanmar",
  AF: "Afghanistan",
  IQ: "Iraq",
  SY: "Syria",
  LB: "Lebanon",
  JO: "Jordan",
  YE: "Yemen",
  MA: "Morocco",
  DZ: "Algeria",
  TN: "Tunisia",
  LY: "Libya",
  SD: "Sudan",
  SS: "South Sudan",
  SO: "Somalia",
  UG: "Uganda",
  TZ: "Tanzania",
  RW: "Rwanda",
  CM: "Cameroon",
  CI: "Ivory Coast",
  SN: "Senegal",
  ZW: "Zimbabwe",
  ZM: "Zambia",
  MZ: "Mozambique",
  KW: "Kuwait",
  QA: "Qatar",
  BH: "Bahrain",
  OM: "Oman",
  CU: "Cuba",
  HT: "Haiti",
  DO: "Dominican Republic",
  JM: "Jamaica",
  PR: "Puerto Rico",
  TT: "Trinidad and Tobago",
  BS: "Bahamas",
  BZ: "Belize",
  CR: "Costa Rica",
  PA: "Panama",
  NI: "Nicaragua",
  HN: "Honduras",
  SV: "El Salvador",
  GT: "Guatemala",
  EC: "Ecuador",
  BO: "Bolivia",
  PY: "Paraguay",
  UY: "Uruguay",
  GY: "Guyana",
  SR: "Suriname",
  IS: "Iceland",
  LU: "Luxembourg",
  MC: "Monaco",
  MT: "Malta",
  CY: "Cyprus",
  EE: "Estonia",
  LV: "Latvia",
  LT: "Lithuania",
  SK: "Slovakia",
  SI: "Slovenia",
  HR: "Croatia",
  BA: "Bosnia and Herzegovina",
  RS: "Serbia",
  ME: "Montenegro",
  MK: "North Macedonia",
  AL: "Albania",
  BG: "Bulgaria",
  MD: "Moldova",
  BY: "Belarus",
  GE: "Georgia",
  AM: "Armenia",
  AZ: "Azerbaijan",
  KZ: "Kazakhstan",
  UZ: "Uzbekistan",
  TM: "Turkmenistan",
  KG: "Kyrgyzstan",
  TJ: "Tajikistan",
  MN: "Mongolia",
  BT: "Bhutan",
  MV: "Maldives",
  BN: "Brunei",
  TL: "Timor-Leste",
  LA: "Laos",
  KH: "Cambodia",
  TW: "Taiwan",
  HK: "Hong Kong",
  MO: "Macau",
  FJ: "Fiji",
  PG: "Papua New Guinea",
  SB: "Solomon Islands",
  VU: "Vanuatu",
  NC: "New Caledonia",
  PF: "French Polynesia",
  WS: "Samoa",
  TO: "Tonga",
  KI: "Kiribati",
  PW: "Palau",
  FM: "Micronesia",
  MH: "Marshall Islands",
  NR: "Nauru",
  TV: "Tuvalu",
  AO: "Angola",
  BW: "Botswana",
  NA: "Namibia",
  SZ: "Eswatini",
  LS: "Lesotho",
  MG: "Madagascar",
  MU: "Mauritius",
  SC: "Seychelles",
  KM: "Comoros",
  DJ: "Djibouti",
  ER: "Eritrea",
  GA: "Gabon",
  GQ: "Equatorial Guinea",
  CG: "Republic of the Congo",
  CD: "Democratic Republic of the Congo",
  CF: "Central African Republic",
  TD: "Chad",
  NE: "Niger",
  ML: "Mali",
  BF: "Burkina Faso",
  GN: "Guinea",
  GW: "Guinea-Bissau",
  SL: "Sierra Leone",
  LR: "Liberia",
  TG: "Togo",
  BJ: "Benin",
  MR: "Mauritania",
  GM: "Gambia",
  CV: "Cape Verde",
  ST: "Sao Tome and Principe",
  BI: "Burundi",
  MW: "Malawi",
};

const CRITICAL = [
  "earthquake",
  "flood",
  "hurricane",
  "tornado",
  "explosion",
  "attack",
  "shooting",
  "terrorism",
  "disaster",
  "emergency",
  "evacuation",
  "outbreak",
  "pandemic",
  "riot",
  "coup",
  "curfew",
  "wildfire",
  "tsunami",
  "volcano",
];
const IMPORTANT = [
  "election",
  "protest",
  "strike",
  "war",
  "conflict",
  "recession",
  "scandal",
  "arrested",
  "indicted",
  "sanctions",
  "crisis",
];

function classify(title: string, desc: string) {
  const t = (title + " " + desc).toLowerCase();
  if (CRITICAL.some((k) => t.includes(k))) return "critical";
  if (IMPORTANT.some((k) => t.includes(k))) return "important";
  return "normal";
}

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return `${Math.round(diff / 86400)}d ago`;
}

function mapGuardianResults(json: any) {
  return (json.response?.results || []).map((item: any) => ({
    title: item.webTitle,
    section: item.sectionName,
    link: item.webUrl,
    pubDate: item.webPublicationDate,
    desc: item.fields?.trailText?.replace(/<[^>]+>/g, "") || "",
    level: classify(item.webTitle, item.fields?.trailText || ""),
  }));
}

async function fetchGuardian(url: string) {
  try {
    const res = await fetch(url);
    const data = await res.json();
    return mapGuardianResults(data);
  } catch {
    return [];
  }
}

async function fetchNews(member: Member) {
  const tag = COUNTRY_TAG[member.country];
  const name = COUNTRY_NAME[member.country];

  let primaryUrl: string;
  if (tag) {
    primaryUrl = `https://content.guardianapis.com/search?tag=${tag}&api-key=test&show-fields=trailText&page-size=15&order-by=newest`;
  } else if (name) {
    const q = encodeURIComponent(`"${name}"`);
    primaryUrl = `https://content.guardianapis.com/search?q=${q}&section=world&api-key=test&show-fields=trailText&page-size=15&order-by=newest`;
  } else {
    primaryUrl = `https://content.guardianapis.com/search?q=${encodeURIComponent(member.country)}&api-key=test&show-fields=trailText&page-size=15&order-by=newest`;
  }

  let results = await fetchGuardian(primaryUrl);

  if (results.length < 5 && member.city) {
    const cityUrl = `https://content.guardianapis.com/search?q=${encodeURIComponent(`"${member.city}"`)}&api-key=test&show-fields=trailText&page-size=15&order-by=newest`;
    const supplemental = await fetchGuardian(cityUrl);
    const seen = new Set(results.map((r: any) => r.link));
    for (const item of supplemental) {
      if (!seen.has(item.link)) {
        results.push(item);
        seen.add(item.link);
      }
    }
  }

  return results;
}

export default function NewsScreen() {
  const { members } = useMembers();
  const [active, setActive] = useState(0);
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!members[active]) return;
    const member = members[active];
    setLoading(true);
    setNews([]);

    const rank: Record<string, number> = { critical: 0, important: 1, normal: 2 };

    const sortItems = (items: any[]) =>
      items.sort((a: any, b: any) => {
        const r = (rank[a.level] ?? 2) - (rank[b.level] ?? 2);
        if (r !== 0) return r;
        return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime();
      });

    const load = async () => {
      const items = await fetchNews(member);
      const sorted = sortItems(items);
      setNews(sorted);
      for (const article of sorted) {
        if (article.level === "critical") {
          notifyCritical(member, {
            title: article.title,
            link: article.link,
            desc: article.desc,
          }).catch(() => {});
        }
      }
    };

    load().finally(() => setLoading(false));
    const t = setInterval(() => {
      load().catch(() => {});
    }, 60000);
    return () => clearInterval(t);
  }, [active, members.length]);

  const cardBorderColor = (level: string) =>
    level === "critical" ? "#ef4444" :
    level === "important" ? "#f59e0b" :
    "rgba(34,197,94,0.45)";
  const titleColor = (level: string) =>
    level === "critical" ? "#fca5a5" :
    level === "important" ? "#fde68a" :
    "rgba(255,255,255,0.9)";

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.tabs}
        contentContainerStyle={{
          paddingHorizontal: 16,
          gap: 8,
          paddingVertical: 12,
        }}
      >
        {members.map((m, i) => (
          <TouchableOpacity
            key={m.id}
            onPress={() => setActive(i)}
            style={[s.tab, active === i && s.tabActive]}
          >
            {m.photoUri ? (
              <Image source={{ uri: m.photoUri }} style={s.tabAvatar} />
            ) : (
              <View style={[s.tabAvatar, { backgroundColor: getAvatarColor(m.id) }]}>
                <Text style={s.tabAvatarInitial}>{m.name[0].toUpperCase()}</Text>
              </View>
            )}
            <Text style={[s.tabName, active === i && s.tabNameActive]}>
              {m.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {members[active] && (
        <View style={s.liveBadge}>
          <View style={s.liveDot} />
          <Text style={s.liveText}>LIVE · {members[active].city}</Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {loading && (
          <ActivityIndicator color="#a78bfa" style={{ marginTop: 40 }} />
        )}
        {!loading && news.length === 0 && (
          <Text style={s.empty}>No recent headlines found</Text>
        )}
        {news.map((article, i) => (
          <TouchableOpacity
            key={i}
            style={[s.card, { borderColor: cardBorderColor(article.level), borderWidth: article.level !== 'normal' ? 2 : 1 }]}
            onPress={() => Linking.openURL(article.link)}
          >
            <Text style={s.section}>{article.section}</Text>
            <Text style={[s.title, { color: titleColor(article.level) }]}>
              {article.title}
            </Text>
            {article.desc ? (
              <Text style={s.desc} numberOfLines={2}>
                {article.desc}
              </Text>
            ) : null}
            <View style={s.meta}>
              <Text style={s.source}>The Guardian</Text>
              <Text style={s.metaDot}>·</Text>
              <Text style={s.ago}>{timeAgo(article.pubDate)}</Text>
            </View>
          </TouchableOpacity>
        ))}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#07080f" },
  tabs: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
    flexGrow: 0,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  tabActive: {
    backgroundColor: "rgba(124,106,247,0.25)",
    borderWidth: 1,
    borderColor: "rgba(124,106,247,0.4)",
  },
  tabAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  tabAvatarInitial: {
    color: "white",
    fontWeight: "700",
    fontSize: 11,
  },
  tabName: { fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.45)" },
  tabNameActive: { color: "#c4b5fd" },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#ef4444" },
  liveText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#ef4444",
    letterSpacing: 1,
  },
  scroll: { padding: 16, gap: 12 },
  card: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 14,
    padding: 14,
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  section: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255,255,255,0.35)",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 5,
  },
  title: { fontSize: 14, fontWeight: "600", lineHeight: 20, marginBottom: 6 },
  desc: {
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
    lineHeight: 17,
    marginBottom: 8,
  },
  meta: { flexDirection: "row", alignItems: "center", gap: 5 },
  source: { fontSize: 11, fontWeight: "700", color: "#a78bfa" },
  metaDot: { color: "rgba(255,255,255,0.25)", fontSize: 10 },
  ago: { fontSize: 11, color: "rgba(255,255,255,0.35)" },
  empty: {
    textAlign: "center",
    color: "rgba(255,255,255,0.3)",
    marginTop: 60,
    fontSize: 14,
  },
});
