/**
 * Persistent banner shown at the top of every page when an admin is using
 * "View as Member" (cookie-based; nfw_view_as cookie).
 *
 * Mounted once in app/layout.tsx so it persists across all internal
 * navigations without the user having to re-trigger it. Calls the stop
 * endpoint on click, which clears the cookie.
 *
 * Visual: red background, z-index 60 (sits above the aubergine nav at
 * z-50, including dropdown overflows).
 *
 * This file is the server component wrapper. The interactive
 * ("use client") piece lives in ViewingAsMemberBannerClient.tsx.
 */
import { getImpersonationContext } from "@/lib/impersonation";
import ViewingAsMemberBannerClient from "./ViewingAsMemberBannerClient";

interface Props {
  initialPage: string; // default page to return to on exit
}

export default async function ViewingAsMemberBanner({ initialPage }: Props) {
  const ctx = await getImpersonationContext();
  if (!ctx) return null;
  return (
    <ViewingAsMemberBannerClient
      targetUserName={ctx.targetFullName}
      targetUserEmail={ctx.targetEmail}
      initialPage={initialPage}
    />
  );
}
