import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { ActionSheetIOS, Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Caption } from "@/components/ui/Typography";
import { colors, theme } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import { ApiError } from "@/lib/api";
import { AVATAR_MAX_BYTES, deleteAvatar, uploadAvatar } from "@/lib/api/profile";
import { initials } from "@/lib/format";
import { useAuthStore } from "@/stores/auth";

/**
 * Web: components/profile/AvatarUpload.tsx — "Profile Photo", Add/Change Photo, Remove Photo,
 * "JPEG, PNG, or WebP. Max 2MB. Auto-cropped to square." Server crops to 400² WebP.
 * Mobile: camera or library, square crop in the picker, JPEG at 0.8 quality (well under 2 MB).
 */
export function AvatarPicker() {
  const profile = useAuthStore((s) => s.profile);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const [busy, setBusy] = useState<"upload" | "delete" | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const current = profile?.avatar_url ?? null;

  async function pick(source: "camera" | "library") {
    const perm = source === "camera" ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(source === "camera" ? "Camera access needed" : "Photo access needed", "Allow access in Settings to set a profile photo.");
      return;
    }
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.8 };
    const result = source === "camera" ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (result.canceled) return;
    const a = result.assets[0];
    if ((a.fileSize ?? 0) > AVATAR_MAX_BYTES) {
      setMessage({ kind: "error", text: "File too large. Maximum size is 2MB." });
      return;
    }
    setBusy("upload");
    setMessage(null);
    try {
      await uploadAvatar({ uri: a.uri, name: a.fileName ?? `avatar-${Date.now()}.jpg`, type: a.mimeType ?? "image/jpeg" });
      await refreshProfile();
      setMessage({ kind: "ok", text: "Photo updated!" });
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof ApiError ? err.message : "Failed to upload avatar" });
    } finally {
      setBusy(null);
    }
  }

  function choose() {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ["Cancel", "Take Photo", "Choose from Library"], cancelButtonIndex: 0 },
        (i) => {
          if (i === 1) void pick("camera");
          if (i === 2) void pick("library");
        },
      );
    } else {
      Alert.alert("Profile photo", undefined, [
        { text: "Take Photo", onPress: () => pick("camera") },
        { text: "Choose from Library", onPress: () => pick("library") },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  }

  function remove() {
    Alert.alert("Remove your profile photo?", undefined, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          setBusy("delete");
          setMessage(null);
          try {
            await deleteAvatar();
            await refreshProfile();
          } catch (err) {
            setMessage({ kind: "error", text: err instanceof ApiError ? err.message : "Failed to delete avatar" });
          } finally {
            setBusy(null);
          }
        },
      },
    ]);
  }

  return (
    <View style={styles.wrap}>
      <Pressable accessibilityRole="button" accessibilityLabel="Change profile photo" onPress={choose} disabled={busy !== null} style={styles.avatarWrap}>
        {current ? (
          <Image source={{ uri: current }} style={styles.avatar} contentFit="cover" transition={150} />
        ) : (
          <View style={[styles.avatar, styles.fallback]}>
            {profile?.full_name && profile.full_name !== "Member" ? <Text style={styles.initials}>{initials(profile.full_name)}</Text> : <Ionicons name="camera" size={32} color={colors.white} />}
          </View>
        )}
        <View style={styles.editBadge}>
          <Ionicons name="camera" size={14} color={colors.white} />
        </View>
      </Pressable>
      <View style={styles.actions}>
        <Button label={busy === "upload" ? "Uploading..." : current ? "Change Photo" : "Add Photo"} variant="primary" size="sm" onPress={choose} loading={busy === "upload"} disabled={busy !== null} />
        {current ? <Button label={busy === "delete" ? "Removing..." : "Remove Photo"} variant="ghost" size="sm" onPress={remove} loading={busy === "delete"} disabled={busy !== null} /> : null}
      </View>
      <Caption style={styles.center}>JPEG, PNG, or WebP. Max 2MB. Auto-cropped to square.</Caption>
      {message ? <Text style={[styles.message, message.kind === "error" && styles.error]}>{message.text}</Text> : null}
    </View>
  );
}

const SIZE = 112;

const styles = StyleSheet.create({
  wrap: { alignItems: "center", gap: 10 },
  avatarWrap: { width: SIZE, height: SIZE },
  avatar: { width: SIZE, height: SIZE, borderRadius: SIZE / 2 },
  fallback: { backgroundColor: colors.lilac, alignItems: "center", justifyContent: "center" },
  initials: { fontFamily: fonts.uiBlack, fontSize: 36, color: colors.white },
  editBadge: { position: "absolute", right: 0, bottom: 0, width: 30, height: 30, borderRadius: 15, backgroundColor: colors.aubergine, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: theme.background },
  actions: { flexDirection: "row", gap: 8 },
  center: { textAlign: "center" },
  message: { fontFamily: fonts.ui, fontSize: 13, color: "#16A34A" },
  error: { color: colors.statusRed },
});
