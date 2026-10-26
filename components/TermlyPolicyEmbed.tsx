"use client";

import { useEffect } from "react";

const POLICY_SCRIPT_ID = "termly-jssdk";
const POLICY_SCRIPT_SRC = "https://app.termly.io/embed-policy.min.js";

/**
 * Renders a Termly-hosted policy (Terms, Accessibility) without Termly's
 * consent banner. Termly's policy viewer script is added only after React has
 * hydrated the page: if it edits the placeholder before hydration, React sees
 * a mismatch, re-renders, and the policy ends up loaded twice and blank.
 */
export default function TermlyPolicyEmbed({ policyId }: { policyId: string }) {
  useEffect(() => {
    if (document.getElementById(POLICY_SCRIPT_ID)) return;
    const script = document.createElement("script");
    script.id = POLICY_SCRIPT_ID;
    script.src = POLICY_SCRIPT_SRC;
    script.async = true;
    document.body.appendChild(script);
  }, []);

  // Termly looks for <div name="termly-embed" data-id="…">; `name` is not a
  // standard div prop, so it is passed as a plain attribute.
  const termlyAttrs = { name: "termly-embed" } as Record<string, string>;
  return <div {...termlyAttrs} data-id={policyId} />;
}
