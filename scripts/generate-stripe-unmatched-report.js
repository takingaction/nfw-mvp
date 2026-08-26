/**
 * Report B: Match Stripe Customers to the 35 Unmatched Profiles
 * 
 * This script:
 * 1. Gets the 35 unmatched profile emails from stripe_backfill_status
 * 2. Finds Stripe customers whose email matches one of the 35 (case-insensitive)
 * 3. Calculates total paid per matched Stripe customer
 * 4. Outputs CSV showing which Stripe customer belongs to which unmatched profile
 * 
 * Run: node scripts/generate-stripe-unmatched-report.js
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

async function generateReport() {
  console.log('Step 1: Getting the 35 unmatched profile emails...\n');
  
  // Get the 35 unmatched profile emails
  const { data: unmatchedProfiles } = await supabase
    .from('stripe_backfill_status')
    .select(`
      profile_id,
      email,
      profiles!inner(
        full_name,
        membership_level
      )
    `)
    .eq('status', 'not_found');

  if (!unmatchedProfiles || unmatchedProfiles.length === 0) {
    console.log('No unmatched profiles found');
    return;
  }

  // Build a map of normalized email → profile
  const profileByNormalizedEmail = new Map();
  const profileEmails = [];

  for (const record of unmatchedProfiles) {
    const profile = Array.isArray(record.profiles) ? record.profiles[0] : record.profiles;
    const normalizedEmail = record.email?.toLowerCase().trim();
    profileByNormalizedEmail.set(normalizedEmail, {
      profileId: record.profile_id,
      profileEmail: record.email,
      fullName: profile?.full_name,
      membershipLevel: profile?.membership_level,
    });
    profileEmails.push(normalizedEmail);
  }

  console.log(`Found ${unmatchedProfiles.length} unmatched profiles\n`);
  console.log('Unmatched profile emails:');
  for (const [normalized, profile] of profileByNormalizedEmail) {
    console.log(`  ${profile.profileEmail} (${profile.fullName}) - ${profile.membershipLevel}`);
  }
  console.log('');

  console.log('Step 2: Fetching all Stripe customers...\n');
  
  // Build email → stripe_customer_id map from Stripe (normalized for comparison)
  const stripeByNormalizedEmail = new Map();
  let cursor;
  
  do {
    const params = { limit: 100 };
    if (cursor) params.starting_after = cursor;
    
    const customers = await stripe.customers.list(params);
    
    for (const customer of customers.data) {
      if (customer.email) {
        const normalizedEmail = customer.email.toLowerCase().trim();
        // Only store if this email matches one of our unmatched profiles
        if (profileEmails.includes(normalizedEmail)) {
          stripeByNormalizedEmail.set(normalizedEmail, {
            id: customer.id,
            email: customer.email, // Original for display
            name: customer.name,
          });
          console.log(`  Found match: ${customer.email}`);
        }
      }
    }
    
    cursor = customers.data.length === 100 ? customers.data[99].id : undefined;
    await new Promise(r => setTimeout(r, 10)); // Rate limit
  } while (cursor);
  
  console.log(`Found ${stripeByNormalizedEmail.size} Stripe customers matching the 35 unmatched profiles\n`);

  // Now calculate total paid for each matching Stripe customer
  console.log('Step 3: Calculating total paid per matching Stripe customer...\n');
  
  const matches = [];
  
  for (const [normalizedEmail, stripeCustomer] of stripeByNormalizedEmail) {
    const profile = profileByNormalizedEmail.get(normalizedEmail);
    
    try {
      const charges = await stripe.charges.list({
        customer: stripeCustomer.id,
        limit: 100,
      });
      
      const totalPaid = charges.data
        .filter(c => c.status === 'succeeded')
        .reduce((sum, c) => sum + (c.amount / 100), 0);
      
      matches.push({
        profileEmail: profile.profileEmail,
        profileName: profile.fullName,
        membershipLevel: profile.membershipLevel,
        stripeEmail: stripeCustomer.email,
        stripeName: stripeCustomer.name,
        stripeCustomerId: stripeCustomer.id,
        totalPaid,
      });
      
      console.log(`MATCH: ${profile.profileEmail} → ${stripeCustomer.email} ($${totalPaid.toFixed(2)})`);
      
    } catch (error) {
      console.error(`Error fetching charges for ${stripeCustomer.email}:`, error.message);
      matches.push({
        profileEmail: profile.profileEmail,
        profileName: profile.fullName,
        membershipLevel: profile.membershipLevel,
        stripeEmail: stripeCustomer.email,
        stripeName: stripeCustomer.name,
        stripeCustomerId: stripeCustomer.id,
        totalPaid: 0,
        error: error.message,
      });
    }
    
    await new Promise(r => setTimeout(r, 25)); // Rate limit
  }

  // Sort by total paid descending
  matches.sort((a, b) => b.totalPaid - a.totalPaid);

  // Output CSV
  console.log('\n--- CSV OUTPUT ---\n');
  console.log('profile_email,profile_name,membership_level,stripe_email,stripe_name,total_paid,stripe_customer_id');
  
  for (const match of matches) {
    const profileName = (match.profileName || '').replace(/,/g, ' ');
    const stripeName = (match.stripeName || '').replace(/,/g, ' ');
    console.log(`${match.profileEmail},${profileName},${match.membershipLevel},${match.stripeEmail},${stripeName},${match.totalPaid.toFixed(2)},${match.stripeCustomerId}`);
  }
  
  const totalMatchedPaid = matches.reduce((sum, m) => sum + m.totalPaid, 0);
  console.log(`\nTotal matched: ${matches.length}`);
  console.log(`Total paid by matched: $${totalMatchedPaid.toFixed(2)}`);
  
  // Also show profiles with NO Stripe match
  const stillNoStripeMatch = [];
  for (const [normEmail, profile] of profileByNormalizedEmail) {
    if (!stripeByNormalizedEmail.has(normEmail)) {
      stillNoStripeMatch.push({
        ...profile,
        normEmail,
      });
    }
  }
  
  console.log(`\n${stillNoStripeMatch.length} profiles still have NO Stripe match:`);
  console.log('profile_email,profile_name,membership_level,normalized_email');
  for (const p of stillNoStripeMatch) {
    console.log(`${p.profileEmail},${p.fullName},${p.membershipLevel},${p.normEmail}`);
  }
}

generateReport().catch(console.error);
