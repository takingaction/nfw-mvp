import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { getValidatedNextUrl } from "@/lib/redirect-utils";

/**
 * Email link landing for signup confirmation, password reset and email change.
 *
 * GET never verifies the token. It only renders a page with a button. Mail
 * security scanners (Outlook Safe Links, university gateways) open every link in
 * an email before the person does; when GET verified, the scanner spent the
 * single-use token and got the session, and the member's own click then failed
 * with "expired". Scanners load pages but don't submit forms, so verification
 * now happens on POST, when the person presses the button.
 *
 * The page is plain HTML from this handler (no root layout, so no analytics or
 * ad tags see the still-valid token in the address). The route stays excluded
 * from the proxy's URL vault (lib/url-vault.ts).
 *
 * The mobile app claims /auth/confirm as a universal link and verifies the token
 * in-app (mobile/app/auth/callback.tsx); this page is the web fallback.
 */

const ALLOWED_TYPES: EmailOtpType[] = ["email", "signup", "recovery", "email_change", "invite", "magiclink"];

const DEFAULT_NEXT: Partial<Record<EmailOtpType, string>> = {
  email: "/auth/sign-up?step=1",
  signup: "/auth/sign-up?step=1",
  recovery: "/auth/update-password",
};

function readType(value: string | null): EmailOtpType | null {
  return value && (ALLOWED_TYPES as string[]).includes(value) ? (value as EmailOtpType) : null;
}

function errorRedirect(request: NextRequest, error: string) {
  const url = new URL("/auth/error", request.url);
  url.searchParams.set("error", error);
  return NextResponse.redirect(url, 303);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = readType(searchParams.get("type"));
  const next = searchParams.get("next") ?? "";

  if (!tokenHash || !type) {
    return errorRedirect(request, "Missing token or type parameter");
  }

  return new NextResponse(renderPage({ tokenHash, type, next }), {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow",
      "X-Frame-Options": "DENY",
    },
  });
}

export async function POST(request: NextRequest) {
  // Only accept the form from our own page (blocks cross-site login CSRF with
  // someone else's token). Browsers always send Origin on form POSTs.
  const origin = request.headers.get("origin");
  if (origin) {
    let sameHost = false;
    try {
      sameHost = new URL(origin).host === request.headers.get("host");
    } catch {}
    if (!sameHost) {
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  const form = await request.formData();
  const tokenHash = String(form.get("token_hash") ?? "");
  const type = readType(String(form.get("type") ?? ""));
  const nextParam = String(form.get("next") ?? "") || null;

  if (!tokenHash || !type) {
    return errorRedirect(request, "Missing token or type parameter");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

  if (error) {
    console.warn("[auth/confirm] verifyOtp failed", { type, code: error.code, message: error.message });
    // otp_expired covers both "used already" and "too old". Tell the error page
    // which kind of link it was so it can point to the right next step.
    if (error.code === "otp_expired" || /expired|invalid/i.test(error.message)) {
      return errorRedirect(request, `link_invalid:${type === "recovery" ? "recovery" : "email"}`);
    }
    return errorRedirect(request, error.message || "Invalid or expired token");
  }

  const nextUrl = getValidatedNextUrl(nextParam, null, DEFAULT_NEXT[type] ?? "/dashboard");
  // 303 so the browser follows with GET, not a re-POST.
  return NextResponse.redirect(new URL(nextUrl, request.url), 303);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function copyFor(type: EmailOtpType) {
  switch (type) {
    case "recovery":
      return {
        title: "Reset your password",
        body: "Press the button below to continue to setting a new password.",
        button: "Continue",
      };
    case "email_change":
      return {
        title: "Confirm your new email",
        body: "Press the button below to confirm the change to your email address.",
        button: "Confirm new email",
      };
    default:
      return {
        title: "Confirm your email",
        body: "One more step: press the button below to confirm your email address and finish creating your National Fund for Women account.",
        button: "Confirm my email",
      };
  }
}

function renderPage({ tokenHash, type, next }: { tokenHash: string; type: EmailOtpType; next: string }) {
  const copy = copyFor(type);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${escapeHtml(copy.title)} | National Fund for Women</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px 16px;background:#F6F5F0;color:#2E1F38;font-family:system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
  main{width:100%;max-width:400px;background:#fff;border:1px solid rgba(46,31,56,.1);border-radius:16px;padding:32px;box-shadow:0 1px 2px rgba(0,0,0,.04)}
  h1{font-family:Georgia,"Times New Roman",serif;font-weight:400;font-size:26px;margin:0 0 8px}
  p{font-size:14px;line-height:1.5;color:rgba(46,31,56,.65);margin:0 0 24px}
  button{width:100%;padding:14px 16px;border:0;border-radius:12px;background:#2E1F38;color:#fff;font-family:inherit;font-weight:700;font-size:14px;line-height:1;cursor:pointer}
  button:hover{background:rgba(46,31,56,.9)}
  button:disabled{opacity:.6;cursor:default}
  button:focus-visible{outline:2px solid #B693C0;outline-offset:2px}
  .brand{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#3E145F;margin:0 0 16px}
</style>
</head>
<body>
<main>
  <p class="brand">National Fund for Women</p>
  <h1>${escapeHtml(copy.title)}</h1>
  <p>${escapeHtml(copy.body)}</p>
  <form method="post" action="/auth/confirm" onsubmit="this.querySelector('button').disabled=true">
    <input type="hidden" name="token_hash" value="${escapeHtml(tokenHash)}">
    <input type="hidden" name="type" value="${escapeHtml(type)}">
    <input type="hidden" name="next" value="${escapeHtml(next)}">
    <button type="submit">${escapeHtml(copy.button)}</button>
  </form>
</main>
</body>
</html>`;
}
