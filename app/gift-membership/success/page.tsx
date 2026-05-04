import { createClient } from "@supabase/supabase-js";
import { Check, Mail, Gift } from "lucide-react";
import Link from "next/link";
import { CopyableCode } from "@/components/gift/CopyableCode";

export const metadata = {
  title: "Gift Membership Purchased",
  description: "Your gift membership purchase is complete.",
};

async function getGiftCodes(sessionId: string) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  try {
    const { data: purchase } = await supabaseAdmin
      .from("gift_membership_purchases")
      .select(`
        id,
        buyer_name,
        buyer_email,
        quantity,
        created_at,
        gift_membership_codes (
          code,
          redeemed_at
        )
      `)
      .eq("stripe_session_id", sessionId)
      .maybeSingle();

    return purchase;
  } catch (error) {
    console.error("Error fetching gift codes:", error);
    return null;
  }
}

export default async function GiftMembershipSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;

  if (!session_id) {
    return (
      <main className="min-h-screen bg-nfw-dove flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-nfw-aubergine mb-4 font-serif">
            Invalid session
          </h1>
          <Link href="/gift-membership" className="text-nfw-wisteria hover:underline">
            Return to gift membership page
          </Link>
        </div>
      </main>
    );
  }

  const purchase = await getGiftCodes(session_id);

  if (!purchase) {
    return (
      <main className="min-h-screen bg-nfw-dove flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-nfw-aubergine mb-4 font-serif">
            Processing your order...
          </h1>
          <p className="text-nfw-blackberry/60">
            Your codes will be emailed to you shortly.
          </p>
        </div>
      </main>
    );
  }

  const codes = purchase.gift_membership_codes?.map((c: { code: string }) => c.code) || [];

  return (
    <main className="min-h-screen bg-nfw-dove">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-nfw-wisteria/20 rounded-full mb-6">
            <Check className="w-8 h-8 text-nfw-wisteria" />
          </div>

          <h1 className="text-3xl lg:text-4xl font-black text-nfw-aubergine mb-4 font-serif">
            Thank you, {purchase.buyer_name}!
          </h1>

          <p className="text-lg text-nfw-blackberry/70">
            Your {purchase.quantity} gift {purchase.quantity === 1 ? "code" : "codes"} have been sent to{" "}
            <span className="font-semibold">{purchase.buyer_email}</span>
          </p>
        </div>

        <div className="bg-white border border-nfw-blackberry/10 rounded-2xl p-6 lg:p-8 shadow-lg mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Gift className="w-5 h-5 text-nfw-wisteria" />
            <h2 className="text-lg font-bold text-nfw-aubergine">
              Your Gift Code{purchase.quantity > 1 ? "s" : ""}
            </h2>
          </div>

          <div className="space-y-3">
            {codes.map((code: string) => (
              <CopyableCode key={code} code={code} />
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-nfw-blackberry/10">
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-nfw-blackberry/40 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-nfw-blackberry mb-1">
                  Check your email
                </p>
                <p className="text-sm text-nfw-blackberry/60">
                  We&apos;ve sent your gift codes to {purchase.buyer_email}. 
                  Forward the email or copy the codes to share with your friends.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-nfw-lilac/20 border border-nfw-lilac/30 rounded-xl p-5 mb-8">
          <h3 className="font-semibold text-nfw-blackberry mb-3">
            How your friends redeem their gift:
          </h3>
          <ol className="space-y-2 text-sm text-nfw-blackberry/70">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-nfw-wisteria text-white text-xs font-bold rounded-full flex items-center justify-center">1</span>
              <span>Create a free account at nationalfundforwomen.org/auth/sign-up</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-nfw-wisteria text-white text-xs font-bold rounded-full flex items-center justify-center">2</span>
              <span>Enter their code on the membership step</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-nfw-wisteria text-white text-xs font-bold rounded-full flex items-center justify-center">3</span>
              <span>Enjoy 1 year of membership!</span>
            </li>
          </ol>
        </div>

        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-nfw-wisteria font-semibold hover:underline"
          >
            Return to homepage
          </Link>
        </div>
      </div>
    </main>
  );
}