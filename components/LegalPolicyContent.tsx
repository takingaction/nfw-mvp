import TermlyPolicyEmbed from "@/components/TermlyPolicyEmbed";
import { termlyPolicyId } from "@/lib/termly";

/**
 * Shows a legal page's saved Termly code (Admin → Legal).
 *
 * A Termly "embed" snippet is rendered through TermlyPolicyEmbed, which loads
 * Termly's policy script only after React has hydrated. Rendering the snippet
 * as raw HTML let its script run first and edit the page before hydration,
 * so pages randomly came up blank or with a spinner that never stopped.
 * A static HTML copy of a policy is shown as is.
 */
export default function LegalPolicyContent({ embedCode }: { embedCode: string }) {
  if (!embedCode.trim()) {
    return <p className="text-nfw-blackberry/70">This policy is being updated. Please check back shortly.</p>;
  }
  const policyId = termlyPolicyId(embedCode);
  return policyId ? (
    <TermlyPolicyEmbed policyId={policyId} />
  ) : (
    <div dangerouslySetInnerHTML={{ __html: embedCode }} />
  );
}
