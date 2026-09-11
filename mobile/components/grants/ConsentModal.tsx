import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { BrandModal } from "@/components/ui/Modal";
import { Body, Caption } from "@/components/ui/Typography";
import { colors, theme } from "@/constants/colors";
import { fonts } from "@/constants/fonts";

export const CONSENT_TEXT =
  "By submitting this application, I consent to National Fund for Women Foundation collecting, storing, and using the personal information I have provided, including any details I have voluntarily shared about my circumstances, for the purpose of reviewing and evaluating my grant application. My information will be accessed by National Fund for Women Foundation staff involved in the grant review process and will not be sold or shared with third parties. I may request deletion of my information by contacting National Fund for Women Foundation directly.";

type Props = {
  visible: boolean;
  submitting: boolean;
  uploading: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

/**
 * Web: the "Ready to Submit" confirmation modal in components/GrantApplicationForm.tsx.
 * Both checkboxes must be checked before "Confirm & Submit" enables. Copy is verbatim.
 */
export function ConsentModal({ visible, submitting, uploading, onConfirm, onClose }: Props) {
  const [certification, setCertification] = useState(false);
  const [consent, setConsent] = useState(false);
  const [showFull, setShowFull] = useState(false);
  const busy = submitting || uploading;

  return (
    <BrandModal
      visible={visible}
      title="Ready to Submit"
      dismissable={!busy}
      onRequestClose={onClose}
      footer={
        <>
          <Button label="Go Back" variant="ghost" disabled={busy} onPress={onClose} />
          <Button
            label={submitting ? "Submitting..." : uploading ? "Uploading..." : "Confirm & Submit"}
            variant="accent"
            disabled={!certification || !consent || busy}
            loading={busy}
            onPress={onConfirm}
            style={{ flex: 1 }}
          />
        </>
      }
    >
      <Body tone="muted">Before submitting, please read and consent to the following:</Body>

      <CheckRow
        checked={certification}
        onPress={() => setCertification((v) => !v)}
        disabled={busy}
        label="I certify that the information provided is accurate and understand NFW may request supporting documentation."
      />
      <CheckRow
        checked={consent}
        onPress={() => setConsent((v) => !v)}
        disabled={busy}
        label="I have read and consent to National Fund for Women Foundation collecting, storing, and using my personal information for the purpose of reviewing and evaluating my grant application."
      />

      <Pressable accessibilityRole="button" onPress={() => setShowFull((v) => !v)} style={styles.details}>
        <Ionicons name={showFull ? "chevron-down" : "chevron-forward"} size={16} color={colors.aubergine} />
        <Text style={styles.detailsLabel}>View full consent text</Text>
      </Pressable>
      {showFull && <Caption style={styles.fullText}>{CONSENT_TEXT}</Caption>}
    </BrandModal>
  );
}

function CheckRow({ checked, onPress, label, disabled }: { checked: boolean; onPress: () => void; label: string; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked, disabled }} disabled={disabled} onPress={onPress} style={styles.checkRow}>
      <View style={[styles.box, checked && styles.boxChecked]}>{checked && <Ionicons name="checkmark" size={14} color={colors.white} />}</View>
      <Text style={styles.checkLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  checkRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  box: { width: 22, height: 22, marginTop: 2, borderWidth: 1.5, borderColor: colors.aubergine, alignItems: "center", justifyContent: "center", backgroundColor: colors.white },
  boxChecked: { backgroundColor: colors.wisteria, borderColor: colors.wisteria },
  checkLabel: { flex: 1, fontFamily: fonts.serif, fontSize: 14, lineHeight: 20, color: theme.text },
  details: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  detailsLabel: { fontFamily: fonts.uiBold, fontSize: 13, color: colors.aubergine },
  fullText: { backgroundColor: colors.dove, padding: 12, lineHeight: 19 },
});
