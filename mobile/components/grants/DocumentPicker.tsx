import { Ionicons } from "@expo/vector-icons";
import * as ExpoDocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { BrandModal } from "@/components/ui/Modal";
import { Body, Caption, Label } from "@/components/ui/Typography";
import { colors, theme } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import { MAX_DOCUMENT_BYTES, resolveDocumentMime, type PendingDocument } from "@/lib/api/grants";

type Props = {
  documents: PendingDocument[];
  onChange: (docs: PendingDocument[]) => void;
  disabled?: boolean;
};

/**
 * Web: the "Supporting Documents (Optional)" block in components/GrantApplicationForm.tsx.
 * Mobile adds Take Photo / Choose from Library (receipts are usually photos on a phone).
 * Validation and the "File Not Attached" modal strings match the web exactly.
 */
export function DocumentPicker({ documents, onChange, disabled }: Props) {
  const [fileError, setFileError] = useState<string | null>(null);

  function addFiles(candidates: { uri: string; name: string; size: number | null | undefined; mimeType: string | null | undefined }[]) {
    const accepted: PendingDocument[] = [];
    for (const c of candidates) {
      const mime = resolveDocumentMime(c.mimeType, c.name);
      if (!mime) {
        setFileError(`"${c.name}" is not a supported file type. Please upload a PDF, image (JPEG, PNG, GIF), or Word document.`);
        return; // web: first failure aborts the whole selection
      }
      const size = c.size ?? 0;
      if (size > MAX_DOCUMENT_BYTES) {
        setFileError(`"${c.name}" is too large (${(size / 1048576).toFixed(1)}MB). Maximum file size is 10MB.`);
        return;
      }
      accepted.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, uri: c.uri, name: c.name, mimeType: mime, size });
    }
    if (accepted.length) onChange([...documents, ...accepted]);
  }

  async function pickFile() {
    const result = await ExpoDocumentPicker.getDocumentAsync({
      type: ["application/pdf", "image/*", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
      multiple: true,
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    addFiles(result.assets.map((a) => ({ uri: a.uri, name: a.name, size: a.size, mimeType: a.mimeType })));
  }

  async function pickFromLibrary() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Photo access needed", "Allow photo library access in Settings to attach photos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsMultipleSelection: true, quality: 0.85 });
    if (result.canceled) return;
    addFiles(result.assets.map((a, i) => ({ uri: a.uri, name: a.fileName ?? `photo-${Date.now()}-${i}.jpg`, size: a.fileSize, mimeType: a.mimeType ?? "image/jpeg" })));
  }

  async function takePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Camera access needed", "Allow camera access in Settings to photograph a document.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.85 });
    if (result.canceled) return;
    const a = result.assets[0];
    addFiles([{ uri: a.uri, name: a.fileName ?? `photo-${Date.now()}.jpg`, size: a.fileSize, mimeType: a.mimeType ?? "image/jpeg" }]);
  }

  return (
    <View style={styles.wrap}>
      <Label>
        Supporting Documents <Text style={styles.optional}>(Optional)</Text>
      </Label>
      <Caption>Upload receipts, quotes, or other supporting documents. PDF, JPG, PNG, DOC accepted.</Caption>

      <View style={styles.actions}>
        <SourceButton icon="document-attach-outline" label="Choose File" onPress={pickFile} disabled={disabled} />
        <SourceButton icon="camera-outline" label="Take Photo" onPress={takePhoto} disabled={disabled} />
        <SourceButton icon="images-outline" label="Library" onPress={pickFromLibrary} disabled={disabled} />
      </View>

      {documents.length > 0 && (
        <View style={styles.list}>
          {documents.map((d) => (
            <View key={d.id} style={styles.row}>
              <Ionicons name={d.mimeType.startsWith("image/") ? "image-outline" : "document-outline"} size={18} color={colors.aubergine} />
              <Text style={styles.fileName} numberOfLines={1}>
                {d.name} <Text style={styles.fileSize}>({(d.size / 1024).toFixed(1)} KB)</Text>
              </Text>
              {!disabled && (
                <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${d.name}`} hitSlop={8} onPress={() => onChange(documents.filter((x) => x.id !== d.id))}>
                  <Text style={styles.remove}>Remove</Text>
                </Pressable>
              )}
            </View>
          ))}
        </View>
      )}

      <BrandModal
        visible={!!fileError}
        title="File Not Attached"
        dismissable={false}
        footer={<Button label="OK" variant="primary" onPress={() => setFileError(null)} style={{ flex: 1 }} />}
      >
        <Body>{fileError}</Body>
      </BrandModal>
    </View>
  );
}

function SourceButton({ icon, label, onPress, disabled }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.source, pressed && styles.pressed, disabled && styles.disabled]}>
      <Ionicons name={icon} size={20} color={colors.aubergine} />
      <Text style={styles.sourceLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  optional: { fontFamily: fonts.ui, color: theme.textMuted, textTransform: "none", letterSpacing: 0 },
  actions: { flexDirection: "row", gap: 8, marginTop: 4 },
  source: { flex: 1, alignItems: "center", gap: 4, paddingVertical: 12, backgroundColor: colors.white, borderWidth: 1, borderColor: theme.border, borderStyle: "dashed" },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
  sourceLabel: { fontFamily: fonts.uiBold, fontSize: 11, color: colors.aubergine },
  list: { gap: 6, marginTop: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.dove, paddingHorizontal: 12, paddingVertical: 10 },
  fileName: { flex: 1, fontFamily: fonts.ui, fontSize: 14, color: theme.text },
  fileSize: { color: theme.textMuted },
  remove: { fontFamily: fonts.uiBold, fontSize: 12, color: colors.statusRed },
});
