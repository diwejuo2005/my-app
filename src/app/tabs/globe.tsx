import { useState } from "react";
import {
  FlatList,
  Image,
  Modal,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { Member, useMembers } from "../../context/MembersContext";

const AVATAR_COLORS = ["#2d3a5a", "#2d4a3e", "#3a2d4a", "#4a3a2d", "#2d4a4a"];

function getAvatarColor(id: number) {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

export default function GlobeScreen() {
  const { members } = useMembers();
  const [selectedCity, setSelectedCity] = useState<{
    city: string;
    memberIds: number[];
  } | null>(null);

  const cityMembers =
    selectedCity !== null
      ? members.filter((m) => selectedCity.memberIds.includes(m.id))
      : [];

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:#07080f; overflow:hidden; }
</style>
</head>
<body>
<div id="g"></div>
<script src="https://unpkg.com/globe.gl@2"></script>
<script>
  const members = ${JSON.stringify(members)};
  const colors = ['#2d3a5a','#2d4a3e','#3a2d4a','#4a3a2d','#2d4a4a'];

  // Group by city
  const cityMap = {};
  members.forEach(m => {
    if (!cityMap[m.city]) cityMap[m.city] = { city: m.city, lat: m.lat, lon: m.lon, members: [] };
    cityMap[m.city].members.push(m);
  });
  const clusters = Object.values(cityMap);

  const globe = Globe()(document.getElementById('g'))
    .width(window.innerWidth)
    .height(window.innerHeight)
    .backgroundColor('#07080f')
    .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-night.jpg')
    .atmosphereColor('#7c6af7')
    .atmosphereAltitude(0.18)
    .htmlElementsData(clusters)
    .htmlLat('lat')
    .htmlLng('lon')
    .htmlElement(d => {
      const wrap = document.createElement('div');
      wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;';

      const circle = document.createElement('div');
      const isCluster = d.members.length > 1;
      circle.style.cssText = 'width:40px;height:40px;border-radius:50%;background:' + (isCluster ? '#7c6af7' : colors[d.members[0].id % colors.length]) + ';border:2px solid rgba(167,139,250,0.8);display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative;';

      if (isCluster) {
        circle.innerHTML = '<span style="color:white;font-weight:800;font-size:15px;">' + d.members.length + '</span>';
      } else {
        const m = d.members[0];
        if (m.photoUri) {
          const img = document.createElement('img');
          img.src = m.photoUri;
          img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
          img.onerror = () => { circle.innerHTML = '<span style="color:white;font-weight:700;font-size:15px;">' + m.name[0].toUpperCase() + '</span>'; };
          circle.appendChild(img);
        } else {
          circle.innerHTML = '<span style="color:white;font-weight:700;font-size:15px;">' + m.name[0].toUpperCase() + '</span>';
        }
      }

      // Location pin dot below circle
      const pin = document.createElement('div');
      pin.style.cssText = 'width:8px;height:8px;background:#a78bfa;border-radius:50%;margin-top:-4px;';

      const label = document.createElement('div');
      label.style.cssText = 'color:white;font-size:9px;font-weight:600;text-shadow:0 1px 3px rgba(0,0,0,0.9);white-space:nowrap;max-width:80px;text-align:center;overflow:hidden;text-overflow:ellipsis;';
      label.textContent = d.city;

      wrap.onclick = () => {
        const ids = d.members.map(m => m.id);
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'pinClick', memberIds: ids, city: d.city }));
      };

      wrap.appendChild(circle);
      wrap.appendChild(pin);
      wrap.appendChild(label);
      return wrap;
    });

  globe.controls().autoRotate = true;
  globe.controls().autoRotateSpeed = 0.6;
  globe.controls().enableZoom = true;
  globe.pointOfView({ lat: 20, lng: 0, altitude: 2.2 });
  window.addEventListener('resize', () => globe.width(window.innerWidth).height(window.innerHeight));
</script>
</body>
</html>`;

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />
      <WebView
        source={{ html }}
        style={s.web}
        scrollEnabled={false}
        javaScriptEnabled
        originWhitelist={["*"]}
        allowUniversalAccessFromFileURLs
        onMessage={(e) => {
          try {
            const d = JSON.parse(e.nativeEvent.data);
            if (d.type === "pinClick") {
              setSelectedCity({ city: d.city, memberIds: d.memberIds });
            }
          } catch {}
        }}
      />

      <Modal
        visible={selectedCity !== null}
        transparent
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedCity(null)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={s.modalCity}>{selectedCity?.city}</Text>
                <Text style={s.modalSubtitle}>
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
              contentContainerStyle={{ paddingBottom: 32 }}
              renderItem={({ item }) => (
                <MemberRow member={item} />
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

function MemberRow({ member }: { member: Member }) {
  const avatarColor = getAvatarColor(member.id);
  return (
    <View style={s.memberRow}>
      {member.photoUri ? (
        <Image source={{ uri: member.photoUri }} style={s.memberAvatar} />
      ) : (
        <View style={[s.memberAvatar, { backgroundColor: avatarColor }]}>
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

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#07080f" },
  web: { flex: 1, backgroundColor: "#07080f" },
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
  modalCity: {
    color: "#f0f0f6",
    fontSize: 22,
    fontWeight: "800",
  },
  modalSubtitle: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 13,
    marginTop: 3,
  },
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
  memberInitial: {
    color: "white",
    fontWeight: "700",
    fontSize: 20,
  },
  memberName: {
    color: "#f0f0f6",
    fontSize: 16,
    fontWeight: "700",
  },
  memberRel: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 13,
    marginTop: 2,
  },
});
