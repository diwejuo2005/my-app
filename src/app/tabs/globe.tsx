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
    .labelsData(members)
    .labelLat('lat').labelLng('lon')
    .labelText(d => d.emoji + ' ' + d.name)
    .labelSize(1.4).labelColor(() => '#ffffff')
    .labelDotRadius(0.4)
    .labelDotOrientation(() => 'bottom');
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
