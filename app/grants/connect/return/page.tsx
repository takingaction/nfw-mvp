import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Check, AlertTriangle } from "lucide-react";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface PageProps {
  searchParams: Promise<{ grantId?: string }>;
}

export default async function ConnectReturnPage({ searchParams }: PageProps) {
  const { grantId } = await searchParams;

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  let detailsSubmitted = false;
  let stripeAccountId: string | null = null;

  if (grantId) {
    const { data: grant } = await supabaseAdmin
      .from("grants")
      .select("stripe_connect_account_id")
      .eq("id", grantId)
      .single();

    stripeAccountId = grant?.stripe_connect_account_id || null;

    if (stripeAccountId) {
      const account = await stripe.accounts.retrieve(stripeAccountId);
      detailsSubmitted = !!account.details_submitted;

      if (detailsSubmitted) {
        await supabaseAdmin
          .from("grants")
          .update({ status: "payment_pending" })
          .eq("id", grantId);
      }
    }
  }

  if (!detailsSubmitted && stripeAccountId) {
    return (
      <main className="min-h-screen bg-[#2d1239] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 bg-nfw-citrine rounded-full flex items-center justify-center mx-auto mb-8">
            <AlertTriangle className="w-10 h-10 text-[#2d1239]" strokeWidth={3} />
          </div>
          <h1
            className="text-3xl font-black text-white mb-4"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            Setup Incomplete
          </h1>
          <p className="text-[#bcafcf] mb-8">
            You didn&apos;t complete the Stripe setup. Please continue your onboarding to receive your grant funds.
          </p>
          <Link
            href={`/grants/connect/refresh?grantId=${grantId}`}
            className="inline-flex items-center justify-center px-8 py-4 bg-[#fdf493] text-[#2d1239] rounded-xl font-bold hover:bg-[#fdf493]/90 transition-all"
          >
            Continue Onboarding →
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#2d1239] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 bg-[#d4f1ad] rounded-full flex items-center justify-center mx-auto mb-8">
          <Check className="w-10 h-10 text-[#2d1239]" strokeWidth={3} />
        </div>
        <h1
          className="text-3xl font-black text-white mb-4"
          style={{ fontFamily: "Montserrat, sans-serif" }}
        >
          Bank account connected!
        </h1>
        <p className="text-[#bcafcf] mb-8">
          Your bank account has been successfully connected. Our team will
          process your payment shortly.
        </p>
        <Link
          href={grantId ? `/grants/view/${grantId}` : "/grants/my-applications"}
          className="inline-flex items-center justify-center px-8 py-4 bg-[#fdf493] text-[#2d1239] rounded-xl font-bold hover:bg-[#fdf493]/90 transition-all"
        >
          View My Application →
        </Link>
      </div>
    </main>
  );
}