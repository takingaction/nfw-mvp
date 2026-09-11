import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Linking, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { ConsentModal } from "@/components/grants/ConsentModal";
import { DocumentPicker } from "@/components/grants/DocumentPicker";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { BrandModal } from "@/components/ui/Modal";
import { ErrorScreen, LoadingScreen, Screen } from "@/components/ui/Screen";
import { Body, Caption, Heading, Label } from "@/components/ui/Typography";
import { colors, theme } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import { ApiError } from "@/lib/api";
import { logGrantError, uploadGrantDocument, type PendingDocument } from "@/lib/api/grants";
import { env } from "@/lib/env";
import { decodeHtml, formatCurrency, formatDateLong } from "@/lib/format";
import { useCreateGrant, useOpenGrantCycles } from "@/lib/queries/grants";
import { useAuthStore } from "@/stores/auth";
import type { GrantCycle } from "@/types/grants";
import { canAccessMemberBenefits } from "@/types/profile";

const REMINDERS = [
  "Applicants must be 18 or older and a U.S. citizen or permanent resident.",
  "Applicants may apply for up to 3 grants, but can only be awarded 1 grant per cycle.",
  "Applications cannot be edited after submission.",
  "Some grants require additional documentation, please read the grant descriptions carefully.",
  "There are no nominations this grant cycle. Keep an eye out for future nomination-only grants!",
];

type UploadState = { doc: PendingDocument; status: "pending" | "uploading" | "done" | "failed"; error?: string };

/**
 * Web equivalent:
 *   - app/grants/apply/page.tsx
 *   - components/GrantApplicationForm.tsx
 *   - POST /api/grants/create, POST /api/grants/upload-document
 * Build phase: 3
 *
 * Same field labels/helpers/placeholders/limits, validation order and error strings as web.
 * Upload happens AFTER create (the API requires a grantId). Failed uploads can be retried
 * or skipped; the application itself is already submitted at that point.
 */
export default function GrantApplyScreen() {
  const router = useRouter();
  const { cycleId } = useLocalSearchParams<{ cycleId?: string }>();
  const profile = useAuthStore((s) => s.profile);
  const user = useAuthStore((s) => s.user);
  const cycles = useOpenGrantCycles();
  const createGrant = useCreateGrant();

  const [selectedCycleId, setSelectedCycleId] = useState<string>(cycleId ?? "");
  const [whoAreYou, setWhoAreYou] = useState("");
  const [challenge, setChallenge] = useState("");
  const [fundUsage, setFundUsage] = useState("");
  const [documents, setDocuments] = useState<PendingDocument[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showConsent, setShowConsent] = useState(false);
  const [uploads, setUploads] = useState<UploadState[] | null>(null);
  const [grantId, setGrantId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Pre-select when only one cycle is open (web parity) — derived, not synced.
  const effectiveCycleId = selectedCycleId || (cycles.data?.length === 1 ? cycles.data[0].id : "");
  const eligible = canAccessMemberBenefits(profile);
  const selectedCycle = cycles.data?.find((c) => c.id === effectiveCycleId);

  if (cycles.isLoading) return <LoadingScreen />;
  if (cycles.isError) return <ErrorScreen message={(cycles.error as Error).message} onRetry={() => cycles.refetch()} />;

  // ----- validation (same order + strings as handleOpenConfirm) -------------
  function validate(): string | null {
    if (!effectiveCycleId) return "Please select a grant";
    if (whoAreYou.trim().length < 10) return "Please provide a description of at least 10 characters";
    if (challenge.trim().length < 10) return "Please describe your challenge in at least 10 characters";
    if (fundUsage.trim().length < 10) return "Please describe fund usage in at least 10 characters";
    return null;
  }

  function handleContinue() {
    const v = validate();
    setError(v);
    if (!v) setShowConsent(true);
  }

  // ----- submit → create → uploads → success -------------------------------
  async function handleConfirmSubmit() {
    setError(null);
    try {
      const { grantId: id } = await createGrant.mutateAsync({
        cycle_id: effectiveCycleId,
        who_are_you: whoAreYou.trim(),
        biggest_challenge: challenge.trim(),
        fund_usage: fundUsage.trim(),
        certification_consent: true,
      });
      setGrantId(id);
      setShowConsent(false);

      if (documents.length === 0) {
        router.replace({ pathname: "/(tabs)/grants/application-success", params: { id } });
        return;
      }
      const initial: UploadState[] = documents.map((doc) => ({ doc, status: "pending" }));
      setUploads(initial);
      await runUploads(id, initial);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Failed to submit application";
      setShowConsent(false);
      setError(message);
      if (user?.id) {
        void logGrantError({
          userId: user.id,
          userEmail: user.email,
          cycleId: effectiveCycleId,
          cycleName: selectedCycle?.cycle_name ?? "unknown",
          errorMessage: message,
          errorCode: err instanceof ApiError ? String(err.status) : undefined,
          stack: err instanceof Error ? err.stack : undefined,
        });
      }
    }
  }

  async function runUploads(id: string, states: UploadState[]) {
    setUploading(true);
    const next = [...states];
    for (let i = 0; i < next.length; i++) {
      if (next[i].status === "done") continue;
      next[i] = { ...next[i], status: "uploading", error: undefined };
      setUploads([...next]);
      try {
        await uploadGrantDocument(id, next[i].doc);
        next[i] = { ...next[i], status: "done" };
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Upload failed";
        next[i] = { ...next[i], status: "failed", error: msg };
      }
      setUploads([...next]);
    }
    setUploading(false);
    if (next.every((u) => u.status === "done")) {
      router.replace({ pathname: "/(tabs)/grants/application-success", params: { id } });
    }
  }

  const failedUploads = uploads?.filter((u) => u.status === "failed") ?? [];

  // ----- render -------------------------------------------------------------
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      <Screen>
        <Heading>Apply for a Microgrant</Heading>
        <Body tone="muted" style={styles.intro}>
          NFW microgrants help with real-life needs like childcare, medical costs, car repairs, and more.
        </Body>

        {!eligible && (
          <Card surface="citrine" bordered={false} style={styles.notice}>
            <Label>Membership required</Label>
            <Caption tone="default">
              {profile?.membership_level === "waitlist"
                ? "You're on the free membership waitlist. Upgrade to apply for microgrants now."
                : "Your free membership is pending approval. Upgrade to apply for microgrants now."}
            </Caption>
            <Button label="Upgrade" variant="primary" size="sm" onPress={() => Linking.openURL(`${env.siteUrl}/auth/sign-up?step=3`)} style={styles.noticeButton} />
          </Card>
        )}

        <Card surface="wisteria" bordered={false} style={styles.reminder}>
          <Label tone="inverse">Quick reminder before you apply:</Label>
          {REMINDERS.map((r) => (
            <Body key={r} tone="inverse" style={styles.bullet}>
              • {r}
            </Body>
          ))}
        </Card>
        <Card surface="aubergine" bordered={false} style={{ marginBottom: 20 }}>
          <Body tone="inverse" style={styles.bullet}>
            To keep microgrants fair and accessible to as many members as possible, members are not eligible to receive a grant two months in a row. For example, if you received a grant in August, you&apos;ll be eligible to receive another grant beginning in October. In the meantime, we encourage you to explore our other programs!
          </Body>
        </Card>

        {(cycles.data?.length ?? 0) === 0 ? (
          <Card>
            <EmptyState icon="calendar-outline" title="No Grant Cycles Available" message="There are currently no open grant cycles. Please check back later or contact us for more information." actionLabel="Contact Us" actionVariant="ghost" onAction={() => router.push("/contact")} />
          </Card>
        ) : (
          <>
            {/* Cycle selection */}
            <FieldLabel required>Which grant are you applying for?</FieldLabel>
            <View style={styles.cycleList}>
              {cycles.data!.map((c) => (
                <CycleCard key={c.id} cycle={c} selected={c.id === effectiveCycleId} onPress={() => setSelectedCycleId(c.id)} disabled={!!uploads} />
              ))}
            </View>

            {/* Text fields */}
            <TextField
              label="Who are you?"
              helper="Tell us a little about yourself — your situation, your life, what matters to you."
              placeholder="I'm a single mom living in Atlanta..."
              value={whoAreYou}
              onChangeText={setWhoAreYou}
              maxLength={500}
              rows={4}
              disabled={!!uploads}
            />
            <TextField
              label="What's the biggest challenge you're facing right now?"
              helper="Be specific. The more we understand the situation, the better we can help."
              placeholder="My car broke down last month and I can't get to work without it..."
              value={challenge}
              onChangeText={setChallenge}
              maxLength={1000}
              rows={5}
              disabled={!!uploads}
            />
            <TextField
              label="What would you do with the microgrant funds?"
              helper="Tell us exactly how you'd use the money and what difference it would make."
              placeholder="I would use the funds to repair my car so I can get back to work..."
              value={fundUsage}
              onChangeText={setFundUsage}
              maxLength={500}
              rows={4}
              disabled={!!uploads}
            />

            <View style={styles.section}>
              <DocumentPicker documents={documents} onChange={setDocuments} disabled={!!uploads} />
            </View>

            {error && (
              <Card style={[styles.section, styles.errorCard]}>
                <Body style={{ color: "#991B1B" }}>{error}</Body>
              </Card>
            )}

            {!uploads && (
              <View style={styles.section}>
                <Button
                  label={createGrant.isPending ? "Submitting..." : "Continue →"}
                  variant="accent"
                  disabled={!eligible || !effectiveCycleId || createGrant.isPending}
                  loading={createGrant.isPending}
                  onPress={handleContinue}
                  fullWidth
                />
                <Button label="Cancel" variant="ghost" onPress={() => router.push("/(tabs)/grants/my-applications")} fullWidth style={{ marginTop: 8 }} />
                <Caption style={styles.footnote}>Your application will be reviewed by our team. You cannot edit it after submission.</Caption>
              </View>
            )}
          </>
        )}

        <ConsentModal visible={showConsent} submitting={createGrant.isPending} uploading={false} onConfirm={handleConfirmSubmit} onClose={() => setShowConsent(false)} />

        {/* Post-create upload progress / retry */}
        <BrandModal
          visible={!!uploads}
          title={uploading ? "Uploading Documents..." : failedUploads.length ? "Some Uploads Failed" : "Documents Uploaded"}
          dismissable={false}
          footer={
            uploading ? undefined : failedUploads.length ? (
              <>
                <Button label="Continue without them" variant="ghost" onPress={() => grantId && router.replace({ pathname: "/(tabs)/grants/application-success", params: { id: grantId } })} />
                <Button label="Retry" variant="accent" onPress={() => grantId && uploads && runUploads(grantId, uploads)} style={{ flex: 1 }} />
              </>
            ) : undefined
          }
        >
          <Caption>Your application has been submitted. {uploading ? "Please keep the app open while your documents upload." : ""}</Caption>
          {(uploads ?? []).map((u) => (
            <View key={u.doc.id} style={styles.uploadRow}>
              <Ionicons
                name={u.status === "done" ? "checkmark-circle" : u.status === "failed" ? "alert-circle" : u.status === "uploading" ? "cloud-upload-outline" : "ellipse-outline"}
                size={18}
                color={u.status === "done" ? "#16A34A" : u.status === "failed" ? colors.statusRed : colors.aubergine}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.uploadName} numberOfLines={1}>{u.doc.name}</Text>
                {u.error ? <Caption style={{ color: colors.statusRed }}>{u.error}</Caption> : null}
              </View>
            </View>
          ))}
        </BrandModal>
      </Screen>
    </KeyboardAvoidingView>
  );
}

// ----- sub-components -------------------------------------------------------------

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <Text style={styles.fieldLabel}>
      {children}
      {required ? <Text style={styles.required}> *</Text> : null}
    </Text>
  );
}

function CycleCard({ cycle, selected, onPress, disabled }: { cycle: GrantCycle; selected: boolean; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ selected, disabled }} disabled={disabled} onPress={onPress} style={[styles.cycleCard, selected && styles.cycleCardSelected]}>
      <View style={[styles.radio, selected && styles.radioSelected]}>{selected ? <View style={styles.radioDot} /> : null}</View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.cycleName}>{decodeHtml(cycle.cycle_name)}</Text>
        <Caption>Deadline: {cycle.end_date ? formatDateLong(cycle.end_date) : "TBD"}</Caption>
        {cycle.description ? <Caption style={{ marginTop: 4 }}>{decodeHtml(cycle.description)}</Caption> : null}
      </View>
      <Text style={styles.cycleAmount}>{formatCurrency(cycle.amount_per_grant)}</Text>
    </Pressable>
  );
}

function TextField({ label, helper, placeholder, value, onChangeText, maxLength, rows, disabled }: { label: string; helper: string; placeholder: string; value: string; onChangeText: (v: string) => void; maxLength: number; rows: number; disabled?: boolean }) {
  return (
    <View style={styles.section}>
      <FieldLabel required>{label}</FieldLabel>
      <Caption style={{ marginBottom: 6 }}>{helper}</Caption>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(46,31,56,0.35)"
        multiline
        maxLength={maxLength}
        editable={!disabled}
        textAlignVertical="top"
        style={[styles.textarea, { minHeight: rows * 24 + 24 }]}
      />
      <Text style={styles.counter}>
        {value.length}/{maxLength}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  intro: { marginTop: 6, marginBottom: 16 },
  notice: { gap: 6, marginBottom: 16 },
  noticeButton: { alignSelf: "flex-start", marginTop: 4 },
  reminder: { gap: 6, marginBottom: 12 },
  bullet: { fontSize: 14, lineHeight: 21 },
  fieldLabel: { fontFamily: fonts.serif, fontSize: 17, color: theme.text, marginBottom: 4 },
  required: { color: colors.lilac },
  cycleList: { gap: 8, marginTop: 6 },
  cycleCard: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14, backgroundColor: colors.white, borderWidth: 1.5, borderColor: theme.border },
  cycleCardSelected: { borderColor: colors.blackberry, backgroundColor: "rgba(46,31,56,0.05)" },
  radio: { width: 18, height: 18, marginTop: 2, borderWidth: 1.5, borderColor: colors.blackberry, alignItems: "center", justifyContent: "center" },
  radioSelected: { borderColor: colors.blackberry },
  radioDot: { width: 9, height: 9, backgroundColor: colors.blackberry },
  cycleName: { fontFamily: fonts.serifSemiBold, fontSize: 17, color: theme.text },
  cycleAmount: { fontFamily: fonts.uiBlack, fontSize: 16, color: colors.aubergine },
  section: { marginTop: 24 },
  textarea: { fontFamily: fonts.serif, fontSize: 15, lineHeight: 22, color: theme.text, backgroundColor: colors.white, borderWidth: 1, borderColor: theme.border, padding: 12 },
  counter: { fontFamily: fonts.ui, fontSize: 11, color: theme.textMuted, textAlign: "right", marginTop: 4 },
  errorCard: { borderColor: "#FCA5A5", backgroundColor: "#FEF2F2" },
  footnote: { textAlign: "center", marginTop: 12 },
  uploadRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
  uploadName: { fontFamily: fonts.ui, fontSize: 14, color: theme.text },
});
