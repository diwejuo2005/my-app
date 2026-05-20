import { StatusBar, StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";
import { useMembers } from "../../context/MembersContext";

export default function GlobeScreen() {
  const { members } = useMembers();

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
  const globe = Globe()(document.getElementById('g'))
    .width(window.innerWidth)
    .height(window.innerHeight)
    .backgroundColor('#07080f')
    .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-night.jpg')
    .atmosphereColor('#7c6af7')
    .atmosphereAltitude(0.18)
    .pointsData(members)
    .pointLat('lat').pointLng('lon')
    .pointColor(() => '#a78bfa')
    .pointRadius(0.5).pointAltitude(0.02)
    .htmlElementsData(members)
    .htmlLat('lat')
    .htmlLng('lon')
    .htmlElement(d => {
      const colors = ['#2d3a5a','#2d4a3e','#3a2d4a','#4a3a2d','#2d4a4a'];
      const bg = colors[d.id % colors.length];
      const wrap = document.createElement('div');
      wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer';
      const circle = document.createElement('div');
      circle.style.cssText = 'width:36px;height:36px;border-radius:50%;background:' + bg + ';border:2px solid rgba(167,139,250,0.7);display:flex;align-items:center;justify-content:center;overflow:hidden;';
      if (d.photoUri) {
        const img = document.createElement('img');
        img.src = d.photoUri;
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
        img.onerror = function() { circle.innerHTML = '<span style="color:white;font-weight:700;font-size:14px;">' + d.name[0].toUpperCase() + '</span>'; };
        circle.appendChild(img);
      } else {
        circle.innerHTML = '<span style="color:white;font-weight:700;font-size:14px;">' + d.name[0].toUpperCase() + '</span>';
      }
      const label = document.createElement('div');
      label.style.cssText = 'color:white;font-size:10px;font-weight:600;text-shadow:0 1px 3px rgba(0,0,0,0.8);white-space:nowrap;';
      label.textContent = d.name;
      wrap.appendChild(circle);
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
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#07080f" },
  web: { flex: 1, backgroundColor: "#07080f" },
});
