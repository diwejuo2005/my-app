import { ActivityIndicator, View } from "react-native";

export default function ConnectScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: "#07080f", justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator color="#a78bfa" size="large" />
    </View>
  );
}
