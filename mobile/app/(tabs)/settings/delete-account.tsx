import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingScreen, Screen } from "@/components/ui/Screen";
import { Body, Caption, Heading, Label } from "@/components/ui/Typography";
import { colors } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import { ApiError } from "@/lib/api";
import { cancelDeletion, getDeletionRequest, requestDeletion } from "@/lib/api/profile";
import { formatDateLong } from "@/lib/format";
import { useAuthStore } from "@/stores/auth";

const REMOVED = [
  "Your personal information will be anonymized",
  "Your profile and social data will be removed",
  "Your grant applications will be anonymized",
  "Your perk redemptions and store claims will be anonymized",
];
const RETAINED = "Your financial records (payments, memberships) will be retained for tax purposes";

/**
 * Web equivalent: components/profile/DeleteAccountModal.tsx + /api/profile/request-deletion + /cancel-deletion
 * Build phase: 6
 *
 * Improvement over web: a pending request can be cancelled here (the API exists; the web modal
 * only tells the member to contact support). Required by App Store Guideline 5.1.1(v).
 */
export default function DeleteAccountScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const profile = useAuthStore((s) => s.profile);
  const existing = useQuery({ queryKey: ["deletion-request"], queryFn: getDeletionRequest });
  const [busy, setBusy] = useState<"request" | "cancel" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  if (existing.isLoading) return <LoadingScreen />;

  const pending = existing.data?.hasRequest && ["pending", "verified"].includes(existing.data.request.status) ? existing.data.request : null;
  const activePaid = (profile?.membership_level === "contributing" || profile?.membership_level === "founding") && profile?.subscription_status === "active";

  function confirmDelete() {
    Alert.alert("Delete Your Account", "Are you sure you want to delete your account? This action cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete My Account",
        style: "destructive",
        onPress: async () => {
          setBusy("request");
          setError(null);
          try {
            await requestDeletion();
            setSubmitted(true);
            void qc.invalidateQueries({ queryKey: ["deletion-request"] });
          } catch (err) {
            setError(err instanceof ApiError ? err.message : "Failed to submit deletion request");
          } finally {
            setBusy(null);
          }
        },
      },
    ]);
  }

  async function handleCancel() {
    setBusy("cancel");
    setError(null);
    try {
      await cancelDeletion();
      setSubmitted(false);
      void qc.invalidateQueries({ queryKey: ["deletion-request"] });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to cancel deletion request");
    } finally {
      setBusy(null);
    }
  }

  if (submitted) {
    return (
      <Screen>
        <View style={styles.center}>
          <Ionicons name="checkmark-circle" size={48} color="#16A34A" />
          <Heading style={{ textAlign: "center" }}>Request Submitted</Heading>
          <Body tone="muted" style={{ textAlign: "center" }}>Your account deletion request has been submitted. An administrator will review it shortly.</Body>
          <Button label="Close" variant="ghost" onPress={() => router.back()} fullWidth style={{ marginTop: 12 }} />
        </View>
      </Screen>
    );
  }

  if (pending) {
    return (
      <Screen>
        <Heading>Delete Your Account</Heading>
        <Card style={[styles.card, styles.pendingCard]}>
          <View style={styles.row}>
            <Ionicons name="time-outline" size={20} color={colors.blackberry} />
            <Label>Deletion request pending</Label>
          </View>
          <Body>You have already submitted a deletion request. Your account is pending review by an administrator.</Body>
          <Caption>Requested {formatDateLong(pending.requested_at)}</Caption>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label={busy === "cancel" ? "Cancelling..." : "Cancel deletion request"} variant="primary" onPress={handleCancel} loading={busy === "cancel"} />
        </Card>
        <Button label="Back" variant="ghost" onPress={() => router.back()} fullWidth style={{ marginTop: 16 }} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Heading>Delete Your Account</Heading>
      <Body tone="muted" style={{ marginTop: 6 }}>Are you sure you want to delete your account? This action cannot be undone.</Body>

      <Card style={styles.card}>
        <Label>What happens when your account is deleted:</Label>
        {REMOVED.map((t) => (
          <View key={t} style={styles.bullet}>
            <Text style={[styles.sign, { color: colors.statusRed }]}>−</Text>
            <Caption tone="default" style={{ flex: 1 }}>{t}</Caption>
          </View>
        ))}
        <View style={styles.bullet}>
          <Text style={[styles.sign, { color: "#16A34A" }]}>+</Text>
          <Caption tone="default" style={{ flex: 1 }}>{RETAINED}</Caption>
        </View>
      </Card>

      <Card surface="citrine" bordered={false} style={styles.card}>
        <Caption tone="default">Note: If you have an active subscription, you must cancel it first before you can delete your account.</Caption>
        {activePaid ? <Button label="Manage Subscription" variant="primary" size="sm" onPress={() => router.push("/(tabs)/settings/membership")} style={{ alignSelf: "flex-start" }} /> : null}
      </Card>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.actions}>
        <Button label="Cancel" variant="ghost" onPress={() => router.back()} style={{ flex: 1 }} />
        <Button label={busy === "request" ? "Submitting..." : "Delete My Account"} variant="danger" onPress={confirmDelete} loading={busy === "request"} disabled={!!activePaid || busy !== null} style={{ flex: 1 }} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10, marginTop: 16 },
  pendingCard: { borderColor: colors.citrine, backgroundColor: "rgba(248,241,154,0.2)" },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  bullet: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  sign: { fontFamily: fonts.uiBlack, fontSize: 14, width: 12 },
  error: { fontFamily: fonts.ui, fontSize: 13, color: colors.statusRed, marginTop: 12 },
  actions: { flexDirection: "row", gap: 10, marginTop: 20 },
  center: { alignItems: "center", gap: 10, paddingTop: 32 },
});
