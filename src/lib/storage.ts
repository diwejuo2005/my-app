import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "../config/firebase";

// A local file:// URI only exists on the device that picked it — it means
// nothing to another user's phone. Upload it to Storage and hand back a
// real https:// URL that anyone can load, so profile photos actually show
// up for connections.
export async function uploadProfilePhoto(uid: string, localUri: string): Promise<string> {
  const response = await fetch(localUri);
  const blob = await response.blob();
  const photoRef = ref(storage, `profile-photos/${uid}.jpg`);
  await uploadBytes(photoRef, blob);
  return getDownloadURL(photoRef);
}

// Chat images/videos/voice notes are local file:// URIs on the sender's
// device until uploaded — the recipient's phone can't load those directly.
export async function uploadChatMedia(
  chatId: string,
  localUri: string,
  kind: "image" | "video" | "audio"
): Promise<string> {
  const response = await fetch(localUri);
  const blob = await response.blob();
  const ext = kind === "video" ? "mp4" : kind === "audio" ? "m4a" : "jpg";
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const mediaRef = ref(storage, `chat-media/${chatId}/${id}.${ext}`);
  await uploadBytes(mediaRef, blob);
  return getDownloadURL(mediaRef);
}
