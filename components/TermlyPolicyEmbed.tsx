"use client";

import { useEffect, useRef } from "react";

const POLICY_SCRIPT_ID = "termly-jssdk";
const POLICY_SCRIPT_SRC = "https://app.termly.io/embed-policy.min.js";
const TERMLY_ORIGIN = "https://app.termly.io";

/**
 * Renders a Termly-hosted policy (Terms, Accessibility, Cookie Policy…).
 *
 * Termly's policy viewer script is added only after React has hydrated the
 * page: if it edits the placeholder before hydration, React sees a mismatch
 * and re-renders, and the policy ends up blank.
 *
 * On pages that also run Termly's consent blocker (the public site, not the
 * app's /embed pages), the blocker can detach the policy frame from the
 * viewer's resize handling: the frame loads and reports its height, but stays
 * at 0px under a spinner that never stops. So we also apply the frame's own
 * height report ("[iFrameSizer]<policyId>:<height>:…") ourselves.
 */
export default function TermlyPolicyEmbed({ policyId }: { policyId: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== TERMLY_ORIGIN || typeof e.data !== "string") return;
      const m = e.data.match(/^\[iFrameSizer\]([^:]+):(\d+(?:\.\d+)?):/);
      if (!m || m[1] !== policyId) return;
      const height = Math.ceil(Number(m[2]));
      if (!height) return;
      const root = ref.current;
      const frame = root?.querySelector<HTMLIFrameElement>("iframe");
      if (!root || !frame) return;
      frame.style.height = `${height}px`;
      root
        .querySelectorAll<HTMLElement>('[data-testid="policy-loading-spinner"]')
        .forEach((el) => {
          el.style.display = "none";
        });
    };
    window.addEventListener("message", onMessage);

    if (!document.getElementById(POLICY_SCRIPT_ID)) {
      const script = document.createElement("script");
      script.id = POLICY_SCRIPT_ID;
      script.src = POLICY_SCRIPT_SRC;
      script.async = true;
      document.body.appendChild(script);
    }

    return () => window.removeEventListener("message", onMessage);
  }, [policyId]);

  // Termly looks for <div name="termly-embed" data-id="…">; `name` is not a
  // standard div prop, so it is passed as a plain attribute.
  const termlyAttrs = { name: "termly-embed" } as Record<string, string>;
  return <div ref={ref} {...termlyAttrs} data-id={policyId} />;
}
