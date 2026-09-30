import { Alert, Platform } from "react-native";

// Alert.alert()'s multi-button confirmation form is a silent no-op on
// react-native-web — tapping "Delete", "Sign out", etc. would do nothing at
// all there. window.confirm() is the real browser equivalent, and since
// every call site here fires synchronously from the user's own tap/long-press
// (no `await` first), it isn't subject to the gesture-timing issue that
// makes window.alert() unreliable when called after an async gap.
export function confirmAction(
  title: string,
  message: string | undefined,
  confirmLabel: string,
  onConfirm: () => void,
  destructive: boolean = true
) {
  if (Platform.OS === "web") {
    if (window.confirm(message ? `${title}\n\n${message}` : title)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: "Cancel", style: "cancel" },
    { text: confirmLabel, style: destructive ? "destructive" : "default", onPress: onConfirm },
  ]);
}

// Single-button informational alert. Only safe to use right where the old
// Alert.alert(title, message) call was — synchronously, with no `await`
// beforehand — since window.alert() after an async gap gets silently
// dropped by some mobile browsers (see login.tsx, which uses an inline
// error message instead for exactly that reason).
export function notifyMessage(title: string, message?: string) {
  if (Platform.OS === "web") {
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}
