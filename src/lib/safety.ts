// Safety feed: things near a person that could affect their safety or
// wellbeing — official alerts (weather, earthquakes, disasters) plus local
// news about violence, crime, fires and the like. Replaces the old Guardian
// headlines, which had no local coverage (and whose shared key now 401s).

export type Severity = "urgent" | "warning";

export type SafetyItem = {
  id: string;
  kind: "alert" | "news";
  category: string; // e.g. "Weather", "Violence", "Crime"
  severity: Severity;
  title: string;
  source: string;
  url: string;
  publishedAt: string; // ISO
  extraSources: number; // other outlets reporting the same story
};

// Only what the feed needs, so both Member and other callers can pass it.
export type SafetyPlace = {
  city: string;
  region?: string;
  country: string;
  countryCode?: string;
  lat: number;
  lon: number;
};

const MAX_AGE_MS = 72 * 3600 * 1000;
const FETCH_TIMEOUT_MS = 8000;

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ─── Threat scoring ──────────────────────────────────────────────────────────

type Rule = { category: string; severity: Severity; phrases: string[] };

// Matched as whole words/phrases, so "shot" in "screenshot" never counts.
// Bare "shot" / "attack" / "dead" are deliberately absent — they're mostly
// sports, health or idioms; only unambiguous phrasings are listed.
const RULES: Rule[] = [
  {
    category: "Violence",
    severity: "urgent",
    phrases: [
      "shooting", "shootings", "shooter", "active shooter", "gunman", "gunmen", "gunfire", "shots fired",
      "shot dead", "fatally shot", "shoots", "shot at", "was shot", "were shot", "people shot", "shot and killed", "stabbing",
      "stabbed", "homicide", "murder", "murdered", "killed", "massacre", "hostage", "kidnapped", "kidnapping",
      "abducted", "abduction", "terror attack", "terrorist", "bombing", "explosion", "lockdown",
      "shelter in place", "riot", "riots",
    ],
  },
  {
    category: "Disaster",
    severity: "urgent",
    phrases: [
      "tornado", "hurricane", "cyclone", "typhoon", "earthquake", "tsunami", "wildfire", "wildfires",
      "evacuation", "evacuate", "evacuated", "state of emergency", "building collapse", "collapsed",
      "flash flood", "landslide", "mudslide",
    ],
  },
  {
    category: "Crime",
    severity: "warning",
    phrases: [
      "robbery", "robberies", "robbed", "armed robbery", "burglary", "break-in", "carjacking", "carjacked",
      "assault", "assaulted", "mugging", "mugged", "home invasion", "kidnap",
    ],
  },
  {
    category: "Fire",
    severity: "warning",
    phrases: ["fire", "fires", "blaze", "house fire", "tanker fire", "inferno", "gas leak"],
  },
  {
    category: "Weather",
    severity: "warning",
    phrases: [
      "flood", "floods", "flooding", "severe weather", "severe storm", "storm warning", "heat wave", "heatwave",
      "blizzard", "winter storm", "ice storm", "power outage", "power outages", "boil water",
    ],
  },
  {
    category: "Health",
    severity: "warning",
    phrases: ["outbreak", "cholera", "contaminated", "contamination", "epidemic"],
  },
  {
    category: "Missing person",
    severity: "warning",
    phrases: ["missing person", "missing child", "missing teen", "missing woman", "missing man", "amber alert"],
  },
  {
    category: "Traffic",
    severity: "warning",
    phrases: ["fatal crash", "deadly crash", "road crash", "car crash", "crash that killed", "pileup", "multi-vehicle crash"],
  },
];

// Phrases that contain a threat word but aren't threats.
const EXCLUDE = [
  "heart attack", "panic attack", "fire sale", "fired up", "on fire", "firing on all cylinders",
  "brainstorm", "perfect storm", "storm the charts", "took by storm", "flood of", "killed it",
  "box office", "grateful dead", "dead heat", "murder mystery", "true crime",
];

// A threat word alongside these is almost always sports or entertainment.
const SPORTS_OR_ENTERTAINMENT = [
  "game", "season", "coach", "playoff", "playoffs", "touchdown", "quarterback", "nba", "nfl", "mlb", "nhl",
  "basketball", "football", "soccer", "tournament", "league", "championship", "match", "movie", "film",
  "album", "series", "episode", "trailer", "novel",
];

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function phraseRegex(phrases: string[]) {
  return new RegExp(`\\b(${phrases.map(escapeRegex).join("|")})\\b`, "i");
}

const RULE_REGEXES = RULES.map((r) => ({ ...r, re: phraseRegex(r.phrases) }));
const EXCLUDE_RE = phraseRegex(EXCLUDE);
const SPORTS_RE = phraseRegex(SPORTS_OR_ENTERTAINMENT);

// Generic words like "killed" or "explosion" sit under Violence, so a more
// specific category (e.g. Traffic for "crash that killed") wins the label.
const CATEGORY_PRIORITY = ["Disaster", "Traffic", "Fire", "Missing person", "Health", "Weather", "Crime", "Violence"];

export function scoreArticle(text: string): { category: string; severity: Severity } | null {
  const cleaned = text.replace(EXCLUDE_RE, " ");
  const hits = RULE_REGEXES.filter((r) => r.re.test(cleaned));
  if (hits.length === 0) return null;
  if (SPORTS_RE.test(cleaned)) return null;
  const severity: Severity = hits.some((h) => h.severity === "urgent") ? "urgent" : "warning";
  const category = CATEGORY_PRIORITY.find((c) => hits.some((h) => h.category === c)) ?? hits[0].category;
  return { category, severity };
}

function mentionsCity(text: string, city: string) {
  return city.trim() !== "" && phraseRegex([city.trim()]).test(text);
}

// ─── Official alerts ─────────────────────────────────────────────────────────

// US National Weather Service — returns nothing outside the US.
async function fetchWeatherAlerts(p: SafetyPlace): Promise<SafetyItem[]> {
  if (p.countryCode && p.countryCode !== "US") return [];
  const res = await fetchWithTimeout(
    `https://api.weather.gov/alerts/active?point=${p.lat.toFixed(4)},${p.lon.toFixed(4)}`,
    { headers: { Accept: "application/geo+json", "User-Agent": "inStereo (instereo.app)" } }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.features ?? [])
    .map((f: any) => f.properties)
    .filter((a: any) => ["Extreme", "Severe", "Moderate"].includes(a.severity))
    .map((a: any): SafetyItem => ({
      id: `nws:${a.id}`,
      kind: "alert",
      category: "Weather",
      severity: a.severity === "Moderate" ? "warning" : "urgent",
      title: a.headline || a.event,
      source: a.senderName || "National Weather Service",
      url: `https://forecast.weather.gov/MapClick.php?lat=${p.lat}&lon=${p.lon}`,
      publishedAt: a.sent,
      extraSources: 0,
    }));
}

// USGS — magnitude 4+ within 300 km in the last 3 days, worldwide.
async function fetchQuakes(p: SafetyPlace): Promise<SafetyItem[]> {
  const since = new Date(Date.now() - MAX_AGE_MS).toISOString();
  const res = await fetchWithTimeout(
    `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&latitude=${p.lat}&longitude=${p.lon}` +
      `&maxradiuskm=300&minmagnitude=4&starttime=${since}`
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.features ?? []).map((f: any): SafetyItem => ({
    id: `usgs:${f.id}`,
    kind: "alert",
    category: "Earthquake",
    severity: f.properties.mag >= 5.5 ? "urgent" : "warning",
    title: f.properties.title,
    source: "USGS",
    url: f.properties.url,
    publishedAt: new Date(f.properties.time).toISOString(),
    extraSources: 0,
  }));
}

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

const GDACS_TYPES: Record<string, string> = {
  TC: "Cyclone", EQ: "Earthquake", FL: "Flood", VO: "Volcano", WF: "Wildfire", DR: "Drought", TS: "Tsunami",
};

// GDACS — orange/red global disasters within ~500 km. Droughts are skipped:
// they're slow-moving and their point location says little about one city.
async function fetchDisasters(p: SafetyPlace): Promise<SafetyItem[]> {
  const from = new Date(Date.now() - 7 * 86400 * 1000).toISOString().slice(0, 10);
  const res = await fetchWithTimeout(
    `https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?alertlevel=Orange;Red&fromdate=${from}`
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.features ?? [])
    .filter((f: any) => f.properties.eventtype !== "DR" && f.geometry?.type === "Point")
    .filter((f: any) => {
      const [lon, lat] = f.geometry.coordinates;
      return distanceKm(p.lat, p.lon, lat, lon) <= 500;
    })
    .map((f: any): SafetyItem => {
      const e = f.properties;
      return {
        id: `gdacs:${e.eventtype}${e.eventid}`,
        kind: "alert",
        category: GDACS_TYPES[e.eventtype] ?? "Disaster",
        severity: e.alertlevel === "Red" ? "urgent" : "warning",
        title: e.name,
        source: "GDACS",
        url: `https://www.gdacs.org/report.aspx?eventtype=${e.eventtype}&eventid=${e.eventid}`,
        publishedAt: new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(e.fromdate) ? e.fromdate : e.fromdate + "Z").toISOString(),
        extraSources: 0,
      };
    });
}

// ─── Local news ──────────────────────────────────────────────────────────────

const NEWS_TERMS = [
  "shooting", "shot", "stabbing", "robbery", "killed", "fire", "flood", "storm", "warning", "evacuation",
  "explosion", "missing", "crash", "collapse", "outbreak",
];

function decodeXml(s: string) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function tag(item: string, name: string) {
  const m = item.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  return m ? decodeXml(m[1]).trim() : "";
}

// Google News search RSS — unofficial but has real local outlets in almost
// every city. Fine for beta; swap for a licensed news API before launch.
async function fetchLocalNews(p: SafetyPlace): Promise<SafetyItem[]> {
  if (!p.city.trim()) return [];
  const cc = (p.countryCode || "US").toUpperCase();
  const where = p.region ? `"${p.region}"` : `"${p.country}"`;
  const q = `"${p.city}" ${where} (${NEWS_TERMS.join(" OR ")}) when:3d`;
  const res = await fetchWithTimeout(
    `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-${cc}&gl=${cc}&ceid=${cc}:en`
  );
  if (!res.ok) return [];
  const xml = await res.text();
  const items: SafetyItem[] = [];
  for (const raw of xml.match(/<item>[\s\S]*?<\/item>/g) ?? []) {
    // Some feeds put the outlet's URL where its name should be.
    const rawSource = tag(raw, "source");
    const source = /^https?:\/\//.test(rawSource) ? rawSource.replace(/^https?:\/\/(www\.)?/, "").split("/")[0] : rawSource;
    let title = tag(raw, "title");
    if (source && title.endsWith(` - ${source}`)) title = title.slice(0, -(source.length + 3));
    const published = new Date(tag(raw, "pubDate"));
    if (isNaN(published.getTime())) continue;
    const publishedAt = published.toISOString();
    // Headlines must name the city — the search also matches passing mentions.
    if (!mentionsCity(title, p.city)) continue;
    const score = scoreArticle(title);
    if (!score) continue;
    items.push({
      id: `news:${tag(raw, "guid") || tag(raw, "link")}`,
      kind: "news",
      category: score.category,
      severity: score.severity,
      title,
      source: source || "News",
      url: tag(raw, "link"),
      publishedAt,
      extraSources: 0,
    });
  }
  return items;
}

// ─── Feed ────────────────────────────────────────────────────────────────────

const STOPWORDS = new Set(["the", "and", "for", "with", "after", "near", "from", "that", "this", "into", "over", "says", "police"]);

function titleWords(title: string) {
  return new Set(
    title.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 3 && !STOPWORDS.has(w))
  );
}

function sameStory(a: Set<string>, b: Set<string>) {
  let shared = 0;
  for (const w of a) if (b.has(w)) shared++;
  return shared / Math.min(a.size, b.size || 1) >= 0.5;
}

// Several outlets covering one event become a single item ("+3 sources").
function dedupeStories(items: SafetyItem[]): SafetyItem[] {
  const kept: { item: SafetyItem; words: Set<string> }[] = [];
  for (const item of [...items].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))) {
    const words = titleWords(item.title);
    const match = item.kind === "news" && kept.find((k) => k.item.kind === "news" && sameStory(k.words, words));
    if (match) match.item.extraSources++;
    else kept.push({ item: { ...item }, words });
  }
  return kept.map((k) => k.item);
}

export async function getSafetyFeed(p: SafetyPlace): Promise<SafetyItem[]> {
  // allSettled: one source being down never empties the whole feed.
  const results = await Promise.allSettled([
    fetchWeatherAlerts(p),
    fetchQuakes(p),
    fetchDisasters(p),
    fetchLocalNews(p),
  ]);
  const cutoff = Date.now() - MAX_AGE_MS;
  const all = results
    .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
    // Official alerts stay while active; news ages out after 72 h.
    .filter((i) => i.kind === "alert" || new Date(i.publishedAt).getTime() >= cutoff);
  const rank: Record<Severity, number> = { urgent: 0, warning: 1 };
  return dedupeStories(all).sort(
    (a, b) => rank[a.severity] - rank[b.severity] || b.publishedAt.localeCompare(a.publishedAt)
  );
}
