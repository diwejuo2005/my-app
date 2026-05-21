import { useMemo, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  Modal,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import WebView from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { Member, useMembers } from "../../context/MembersContext";

// ─── Flat-map fallback (used when globe.gl CDN is unreachable) ──────────────

const { width: MAP_W, height: MAP_H } = Dimensions.get("window");

const AVATAR_COLORS = ["#2d3a5a", "#2d4a3e", "#3a2d4a", "#4a3a2d", "#2d4a4a"];
function getAvatarColor(id: number) {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

function latLonToXY(lat: number, lon: number) {
  const x = ((lon + 180) / 360) * MAP_W;
  const y = ((90 - lat) / 180) * MAP_H;
  return { x, y };
}

type Cluster = { city: string; lat: number; lon: number; members: Member[] };

function Pin({ cluster, onPress }: { cluster: Cluster; onPress: () => void }) {
  const isMulti = cluster.members.length > 1;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={s.pinContainer}>
      <View style={s.pinHead}>
        {isMulti ? (
          <Text style={s.pinCount}>{cluster.members.length}</Text>
        ) : (
          <Ionicons name="location" size={18} color="white" />
        )}
      </View>
      <View style={s.pinTail} />
      <Text style={s.pinLabel} numberOfLines={1}>{cluster.city}</Text>
    </TouchableOpacity>
  );
}

function MemberRow({ member }: { member: Member }) {
  const bg = getAvatarColor(member.id);
  return (
    <View style={s.memberRow}>
      {member.photoUri ? (
        <Image source={{ uri: member.photoUri }} style={s.memberAvatar} />
      ) : (
        <View style={[s.memberAvatar, { backgroundColor: bg }]}>
          <Text style={s.memberInitial}>{member.name[0].toUpperCase()}</Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={s.memberName}>{member.name}</Text>
        <Text style={s.memberRel}>{member.relationship}</Text>
      </View>
    </View>
  );
}

function FlatMapView({
  members,
  onCityPress,
}: {
  members: Member[];
  onCityPress: (city: string, memberIds: number[]) => void;
}) {
  const clusters = useMemo<Cluster[]>(() => {
    const map: Record<string, Cluster> = {};
    members.forEach((m) => {
      if (!map[m.city])
        map[m.city] = { city: m.city, lat: m.lat, lon: m.lon, members: [] };
      map[m.city].members.push(m);
    });
    return Object.values(map);
  }, [members]);

  const gridLats = [-60, -30, 30, 60];
  const gridLons = [-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150];

  return (
    <View style={s.mapArea}>
      {gridLats.map((lat) => {
        const { y } = latLonToXY(lat, 0);
        return <View key={lat} style={[s.gridH, { top: y }]} />;
      })}
      {gridLons.map((lon) => {
        const { x } = latLonToXY(0, lon);
        return <View key={lon} style={[s.gridV, { left: x }]} />;
      })}
      <View style={[s.equator, { top: MAP_H / 2 }]} />

      {clusters.map((cluster) => {
        const { x, y } = latLonToXY(cluster.lat, cluster.lon);
        return (
          <View key={cluster.city} style={[s.pinAnchor, { left: x, top: y }]}>
            <Pin
              cluster={cluster}
              onPress={() =>
                onCityPress(
                  cluster.city,
                  cluster.members.map((m) => m.id)
                )
              }
            />
          </View>
        );
      })}
    </View>
  );
}

// ─── Globe HTML template ─────────────────────────────────────────────────────

const GLOBE_HTML_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:#07080f; overflow:hidden; }
</style>
</head>
<body>
<div id="g" style="width:100vw;height:100vh"></div>
<script>
var MEMBERS = __MEMBERS_DATA__;
var started = false;

var killTimer = setTimeout(function() {
  if (!started) {
    try { window.ReactNativeWebView.postMessage(JSON.stringify({type:'error',msg:'timeout'})); } catch(e) {}
  }
}, 14000);

function startGlobe() {
  try {
    started = true;
    clearTimeout(killTimer);

    var el = document.getElementById('g');
    var myGlobe = Globe()(el);

    myGlobe
      .width(window.innerWidth)
      .height(window.innerHeight)
      .backgroundColor('#07080f')
      .globeImageUrl('https://cdn.jsdelivr.net/npm/three-globe@2/example/img/earth-night.jpg')
      .showAtmosphere(true)
      .atmosphereColor('#3a2d8a')
      .atmosphereAltitude(0.22);

    myGlobe.renderer().setPixelRatio(window.devicePixelRatio || 2);

    // Cluster by city
    var cityMap = {};
    MEMBERS.forEach(function(m) {
      if (!cityMap[m.city]) cityMap[m.city] = { lat: m.lat, lng: m.lon, city: m.city, ids: [] };
      cityMap[m.city].ids.push(m.id);
    });
    var clusters = Object.values(cityMap);

    // Custom map-pin HTML elements
    myGlobe
      .htmlElementsData(clusters)
      .htmlLat(function(d) { return d.lat; })
      .htmlLng(function(d) { return d.lng; })
      .htmlAltitude(0.01)
      .htmlTransitionDuration(0)
      .htmlElement(function(d) {
        var count = d.ids.length;
        var pinInner = count > 1
          ? '<span style="color:rgba(255,255,255,0.95);font-weight:800;font-size:13px;font-family:-apple-system,sans-serif;line-height:1">' + count + '</span>'
          : '<svg viewBox="0 0 24 24" width="22" height="22" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>';
        var wrap = document.createElement('div');
        wrap.style.cssText = 'position:relative;transform:translate(-50%,-50%);cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:3px';
        wrap.innerHTML =
          '<div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#2d1b8a,#7c6af7);border:2.5px solid rgba(167,139,250,0.85);display:flex;align-items:center;justify-content:center;box-shadow:0 0 16px rgba(124,106,247,0.75),0 2px 8px rgba(0,0,0,0.6)">' +
          pinInner +
          '</div>' +
          '<div style="background:rgba(10,8,30,0.75);border-radius:6px;padding:2px 7px;white-space:nowrap;color:rgba(255,255,255,0.95);font-size:10px;font-weight:700;font-family:-apple-system,sans-serif;border:1px solid rgba(124,106,247,0.4)">' + d.city + '</div>';
        wrap.addEventListener('click', function(e) {
          e.stopPropagation();
          try { window.ReactNativeWebView.postMessage(JSON.stringify({type:'pin-click', city:d.city, memberIds:d.ids})); } catch(ex) {}
        });
        return wrap;
      });

    var ctrl = myGlobe.controls();
    ctrl.autoRotate = true;
    ctrl.autoRotateSpeed = 0.5;
    ctrl.enableZoom = true;
    ctrl.minDistance = 150;
    ctrl.maxDistance = 600;

    window.addEventListener('resize', function() {
      myGlobe.width(window.innerWidth).height(window.innerHeight);
    });
  } catch(err) {
    try { window.ReactNativeWebView.postMessage(JSON.stringify({type:'error',msg:String(err)})); } catch(e) {}
  }
}

function tryLoad(src, onOk, onFail) {
  var s = document.createElement('script');
  s.src = src;
  s.onload = onOk;
  s.onerror = onFail;
  document.head.appendChild(s);
}

tryLoad(
  'https://cdn.jsdelivr.net/npm/globe.gl@2/dist/globe.gl.min.js',
  startGlobe,
  function() {
    tryLoad(
      'https://unpkg.com/globe.gl@2/dist/globe.gl.min.js',
      startGlobe,
      function() {
        try { window.ReactNativeWebView.postMessage(JSON.stringify({type:'error',msg:'cdn-failed'})); } catch(e) {}
      }
    );
  }
);
</script>
</body>
</html>`;

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function GlobeScreen() {
  const { members } = useMembers();
  const [useFlatMap, setUseFlatMap] = useState(false);
  const [selectedCity, setSelectedCity] = useState<{
    city: string;
    memberIds: number[];
  } | null>(null);

  const cityMembers = selectedCity
    ? members.filter((m) => selectedCity.memberIds.includes(m.id))
    : [];

  const html = useMemo(() => {
    const data = JSON.stringify(
      members.map((m) => ({
        id: m.id,
        name: m.name,
        city: m.city,
        lat: m.lat,
        lon: m.lon,
        relationship: m.relationship,
      }))
    );
    return GLOBE_HTML_TEMPLATE.replace("__MEMBERS_DATA__", data);
  }, [members]);

  function handleMessage(event: { nativeEvent: { data: string } }) {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === "error") {
        setUseFlatMap(true);
      } else if (msg.type === "pin-click") {
        setSelectedCity({ city: msg.city, memberIds: msg.memberIds });
      }
    } catch {}
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />

      {useFlatMap ? (
        <FlatMapView
          members={members}
          onCityPress={(city, memberIds) => setSelectedCity({ city, memberIds })}
        />
      ) : (
        <WebView
          source={{ html }}
          style={{ flex: 1, backgroundColor: "#07080f" }}
          onMessage={handleMessage}
          javaScriptEnabled
          originWhitelist={["*"]}
          mixedContentMode="always"
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          onError={() => setUseFlatMap(true)}
          onHttpError={() => setUseFlatMap(true)}
        />
      )}

      <Modal
        visible={selectedCity !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedCity(null)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={s.modalCity}>{selectedCity?.city}</Text>
                <Text style={s.modalSub}>
                  {cityMembers.length}{" "}
                  {cityMembers.length === 1 ? "person" : "people"} here
                </Text>
              </View>
              <TouchableOpacity
                style={s.closeBtn}
                onPress={() => setSelectedCity(null)}
              >
                <Ionicons name="close" size={22} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={cityMembers}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={{ paddingBottom: 40 }}
              renderItem={({ item }) => <MemberRow member={item} />}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#07080f" },
  mapArea: { flex: 1, backgroundColor: "#07080f" },
  gridH: {
    position: "absolute",
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  gridV: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  equator: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(167,139,250,0.3)",
  },
  pinAnchor: {
    position: "absolute",
    transform: [{ translateX: -17 }, { translateY: -56 }],
  },
  pinContainer: { alignItems: "center" },
  pinHead: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#7c6af7",
    borderWidth: 2.5,
    borderColor: "rgba(167,139,250,0.85)",
    shadowColor: "#7c6af7",
    shadowOpacity: 0.7,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  pinCount: { color: "white", fontWeight: "800", fontSize: 13 },
  pinTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 11,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#7c6af7",
    marginTop: -1,
  },
  pinLabel: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 9,
    fontWeight: "600",
    textAlign: "center",
    maxWidth: 80,
    marginTop: 2,
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalSheet: {
    backgroundColor: "#0f1020",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 20,
    maxHeight: "70%",
    borderWidth: 1,
    borderColor: "rgba(167,139,250,0.2)",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  modalCity: { color: "#f0f0f6", fontSize: 22, fontWeight: "800" },
  modalSub: { color: "rgba(255,255,255,0.5)", fontSize: 13, marginTop: 3 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  memberInitial: { color: "white", fontWeight: "700", fontSize: 20 },
  memberName: { color: "#f0f0f6", fontSize: 16, fontWeight: "700" },
  memberRel: { color: "rgba(255,255,255,0.45)", fontSize: 13, marginTop: 2 },
});
