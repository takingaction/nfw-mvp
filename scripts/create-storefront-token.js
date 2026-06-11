const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createStorefrontToken() {
  // Get admin token from Supabase
  const { data, error } = await supabase
    .from('shopify_tokens')
    .select('access_token')
    .eq('shop', 'nfw-checkout.myshopify.com')
    .single();

  if (error || !data?.access_token) {
    console.error('Failed to get admin token:', error);
    return;
  }

  const adminToken = data.access_token;
  console.log('Got admin token');

  // Create storefront access token via Shopify Admin API
  const response = await fetch(
    'https://nfw-checkout.myshopify.com/admin/api/2026-01/storefront_access_tokens.json',
    {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': adminToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        storefront_access_token: { title: 'NFW Storefront Token' }
      })
    }
  );

  if (!response.ok) {
    const err = await response.text();
    console.error('Failed to create storefront token:', err);
    return;
  }

  const result = await response.json();
  const storefrontToken = result.storefront_access_token?.access_token;
  
  if (storefrontToken) {
    console.log('\n=== STOREFRONT TOKEN ===');
    console.log(storefrontToken);
    console.log('=== END TOKEN ===\n');
    console.log('Add this to Vercel as SHOPIFY_STOREFRONT_TOKEN');
  } else {
    console.error('No storefront token in response:', result);
  }
}

createStorefrontToken();