/**
 * Backfill Historical Payments into membership_payments
 * 
 * This script:
 * 1. Gets all matched profiles from stripe_backfill_status
 * 2. For each one, fetches their Stripe charges
 * 3. Inserts them into membership_payments table
 * 4. Updates profiles.lifetime_value to sum of membership_payments
 * 
 * Run: node scripts/backfill-historical-payments.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-01-28.clover',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function backfillPayments() {
  console.log('Starting historical payment backfill...\n');

  // Get all matched profiles with their stripe_customer_id
  const { data: matchedProfiles } = await supabase
    .from('stripe_backfill_status')
    .select(`
      profile_id,
      stripe_customer_id,
      profiles!inner(
        email,
        full_name,
        membership_level
      )
    `)
    .eq('status', 'matched')
    .not('stripe_customer_id', 'is', null);

  console.log(`Found ${matchedProfiles?.length || 0} matched profiles to process\n`);

  let totalInserted = 0;
  let totalErrors = 0;

  for (const record of matchedProfiles || []) {
    const { profile_id, stripe_customer_id, profiles } = record;
    const profile = Array.isArray(profiles) ? profiles[0] : profiles;
    
    if (!stripe_customer_id) continue;

    console.log(`Processing: ${profile?.email} (${profile?.full_name})`);

    try {
      // Fetch all charges for this customer
      const charges = await stripe.charges.list({
        customer: stripe_customer_id,
        limit: 100,
      });

      const succeededCharges = charges.data.filter(c => c.status === 'succeeded');

      if (succeededCharges.length === 0) {
        console.log(`  No successful charges found\n`);
        continue;
      }

      // Sort by created date to determine first charge
      succeededCharges.sort((a, b) => a.created - b.created);

      let isFirstCharge = true;
      const insertedForProfile = [];

      for (const charge of succeededCharges) {
        // Determine payment type
        let paymentType = 'renewal';
        
        if (charge.refunded) {
          paymentType = 'refund';
        } else if (isFirstCharge) {
          paymentType = 'signup';
          isFirstCharge = false;
        }

        // Check if this looks like an upgrade (amount = 85)
        const amountDollars = charge.amount / 100;
        if (amountDollars === 85 && paymentType === 'signup') {
          paymentType = 'upgrade';
        }

        const chargeDate = new Date(charge.created * 1000).toISOString();

        // Check if this payment already exists (idempotency)
        const { data: existing } = await supabase
          .from('membership_payments')
          .select('id')
          .eq('stripe_payment_id', charge.id)
          .single();

        if (existing) {
          console.log(`  Skipping duplicate: ${charge.id} (${chargeDate})`);
          continue;
        }

        // Insert the payment
        const { error: insertError } = await supabase
          .from('membership_payments')
          .insert({
            user_id: profile_id,
            amount: amountDollars,
            payment_type: paymentType,
            stripe_payment_id: charge.id,
            created_at: chargeDate,
          });

        if (insertError) {
          console.error(`  Error inserting charge ${charge.id}:`, insertError.message);
          totalErrors++;
        } else {
          console.log(`  Inserted: $${amountDollars} (${paymentType}) - ${charge.id}`);
          insertedForProfile.push(amountDollars);
          totalInserted++;
        }

        // Rate limit protection
        await new Promise(r => setTimeout(r, 25));
      }

      // Update profiles.lifetime_value to sum of membership_payments
      if (insertedForProfile.length > 0) {
        const { data: sumResult } = await supabase
          .from('membership_payments')
          .select('amount')
          .eq('user_id', profile_id);

        const lifetimeValue = sumResult?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

        await supabase
          .from('profiles')
          .update({ lifetime_value: lifetimeValue })
          .eq('id', profile_id);

        console.log(`  Updated lifetime_value to $${lifetimeValue.toFixed(2)}\n`);
      }

    } catch (error) {
      console.error(`  Error processing ${profile?.email}:`, error.message);
      totalErrors++;
    }
  }

  console.log('\n=== Backfill Complete ===');
  console.log(`Total payments inserted: ${totalInserted}`);
  console.log(`Total errors: ${totalErrors}`);
}

backfillPayments().catch(console.error);
