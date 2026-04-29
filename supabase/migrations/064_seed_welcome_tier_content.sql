-- Migration: Populate welcome email template content for tier-based emails
-- Date: 2026-04-28
-- Purpose: Add HTML content for welcome-free, welcome-contributing, and welcome-founding templates

-- Update welcome-free template
UPDATE email_templates
SET html_content = '
<table width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td style="padding: 20px; background-color: rgba(255,255,255,0.1); border-radius: 8px;">
      <p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 14px; font-weight: 700; color: #FFFFFF; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 0.05em;">
        Your membership snapshot
      </p>
      <p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 14px; color: #FFFFFF; margin: 0 0 5px 0;">
        <strong>Email:</strong> {{email}}
      </p>
      <p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 14px; color: #FFFFFF; margin: 0 0 5px 0;">
        <strong>Membership Tier:</strong> {{membership_tier}}
      </p>
    </td>
  </tr>
</table>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 20px 0 20px 0;">
  Welcome to the National Fund for Women! We couldn''t be more excited to have you join our community.
</p>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">
  At NFW, we believe that women deserve real support when they need it. Asking for help shouldn''t come with added barriers or additional stress. Our goal is to provide immediate, practical support for women at every stage of their lives, while building collective power along the way. We hope you find plenty of support, connection, and joy here — we''ve got your back!
</p>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 14px; font-weight: 700; color: #FFFFFF; margin: 20px 0 10px 0; text-transform: uppercase; letter-spacing: 0.05em;">
  Check out what you just unlocked
</p>
<ul style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 14px; color: #FFFFFF; margin: 0 0 20px 0; padding-left: 20px;">
  <li style="margin-bottom: 8px;">Browse our current <a href="{{grants_url}}" style="color: #F8F19A;">microgrant offerings</a> and apply in just a few minutes.</li>
  <li style="margin-bottom: 8px;">Explore thousands of <a href="{{perks_url}}" style="color: #F8F19A;">perks and discounts</a> and start saving on items you were already buying.</li>
  <li style="margin-bottom: 8px;">Shop the <a href="{{store_url}}" style="color: #F8F19A;">Zero Dollar Store</a> where every item is — completely free. Items drop daily so check back often!</li>
</ul>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 14px; color: #FFFFFF; margin: 20px 0;">
  Your membership dashboard is your home base. Here you can track your savings, find your favorite perks, and see what other NFW members are up to. <a href="{{dashboard_url}}" style="color: #F8F19A;">Log in and get started!</a>
</p>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 14px; color: #FFFFFF; margin: 20px 0;">
  Ready to level up your impact? Consider becoming a <a href="{{signup_url}}" style="color: #F8F19A;">Contributing Member</a> — 100% of membership dues go towards improving the lives of American women.
</p>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 14px; color: #FFFFFF; margin: 20px 0 0 0;">
  Need a hand? Visit our <a href="{{faq_url}}" style="color: #F8F19A;">FAQ page</a> for quick answers, or reach out to <a href="mailto:hello@nationalfundforwomen.org" style="color: #F8F19A;">hello@nationalfundforwomen.org</a> any time.
</p>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; font-style: italic; color: #FFFFFF; margin: 30px 0 0 0;">
  Thank you for showing up for women,
</p>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; font-style: italic; color: #FFFFFF; margin: 5px 0 0 0;">
  The NFW Team
</p>
'
WHERE slug = 'welcome-free';

-- Update welcome-contributing template
UPDATE email_templates
SET html_content = '
<table width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td style="padding: 15px 20px; background-color: rgba(255,255,255,0.1); border-radius: 8px;">
      <p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 14px; font-weight: 700; color: #FFFFFF; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 0.05em;">
        Your membership snapshot
      </p>
      <p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 14px; color: #FFFFFF; margin: 0 0 5px 0;">
        <strong>Email:</strong> {{email}}
      </p>
      <p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 14px; color: #FFFFFF; margin: 0 0 5px 0;">
        <strong>Membership Tier:</strong> {{membership_tier}}
      </p>
      <p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 14px; color: #FFFFFF; margin: 0;">
        <strong>Renewal Date:</strong> {{renewal_date}}
      </p>
    </td>
  </tr>
</table>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 20px 0 20px 0;">
  Welcome to the National Fund for Women! We couldn''t be more excited to have you join our community.
</p>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">
  At NFW, we believe that women deserve real support when they need it. As a Contributing Member, your membership helps make that possible for you and for every woman who comes after you. You''re supporting women simply by belonging, while building a future where women''s needs are impossible to ignore. To that, we say: thank YOU!
</p>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 14px; font-weight: 700; color: #FFFFFF; margin: 20px 0 10px 0; text-transform: uppercase; letter-spacing: 0.05em;">
  Check out what you just unlocked
</p>
<ul style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 14px; color: #FFFFFF; margin: 0 0 20px 0; padding-left: 20px;">
  <li style="margin-bottom: 8px;">Browse our current <a href="{{grants_url}}" style="color: #F8F19A;">microgrant offerings</a> and apply in just a few minutes.</li>
  <li style="margin-bottom: 8px;">Explore thousands of <a href="{{perks_url}}" style="color: #F8F19A;">perks and discounts</a> and start saving on items you were already buying.</li>
  <li style="margin-bottom: 8px;">Shop the <a href="{{store_url}}" style="color: #F8F19A;">Zero Dollar Store</a> where every item is — completely free. Items drop daily so check back often!</li>
</ul>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 14px; color: #FFFFFF; margin: 20px 0;">
  Your membership dashboard is your home base. Here you can track your savings, find your favorite perks, and see what other NFW members are up to. <a href="{{dashboard_url}}" style="color: #F8F19A;">Log in and get started!</a>
</p>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 14px; color: #FFFFFF; margin: 20px 0;">
  Want to spread the love? <a href="{{gift_url}}" style="color: #F8F19A;">Share a year of community, resources, and support</a> by gifting a membership to a woman in your life.
</p>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 14px; color: #FFFFFF; margin: 20px 0 0 0;">
  Need a hand? Visit our <a href="{{faq_url}}" style="color: #F8F19A;">FAQ page</a> for quick answers, or reach out to <a href="mailto:hello@nationalfundforwomen.org" style="color: #F8F19A;">hello@nationalfundforwomen.org</a> any time.
</p>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; font-style: italic; color: #FFFFFF; margin: 30px 0 0 0;">
  Thank you for showing up for women,
</p>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; font-style: italic; color: #FFFFFF; margin: 5px 0 0 0;">
  The NFW Team
</p>
'
WHERE slug = 'welcome-contributing';

-- Update welcome-founding template
UPDATE email_templates
SET html_content = '
<table width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td style="padding: 15px 20px; background-color: rgba(255,255,255,0.1); border-radius: 8px;">
      <p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 14px; font-weight: 700; color: #FFFFFF; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 0.05em;">
        Your membership snapshot
      </p>
      <p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 14px; color: #FFFFFF; margin: 0 0 5px 0;">
        <strong>Email:</strong> {{email}}
      </p>
      <p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 14px; color: #FFFFFF; margin: 0 0 5px 0;">
        <strong>Membership Tier:</strong> {{membership_tier}}
      </p>
      <p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 14px; color: #FFFFFF; margin: 0;">
        <strong>Renewal Date:</strong> {{renewal_date}}
      </p>
    </td>
  </tr>
</table>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 20px 0 20px 0;">
  Welcome to the National Fund for Women! We couldn''t be more excited to have you join our community.
</p>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">
  At NFW, we believe that women deserve real support when they need it. As a Founding Member, you''re helping us power our programs and multiply our impact for women across the country. You''re supporting women simply by belonging, while building a future where women''s needs are impossible to ignore. To that, we say: thank YOU!
</p>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 14px; font-weight: 700; color: #FFFFFF; margin: 20px 0 10px 0; text-transform: uppercase; letter-spacing: 0.05em;">
  Check out what you just unlocked
</p>
<ul style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 14px; color: #FFFFFF; margin: 0 0 20px 0; padding-left: 20px;">
  <li style="margin-bottom: 8px;">Browse our current <a href="{{grants_url}}" style="color: #F8F19A;">microgrant offerings</a> and apply in just a few minutes.</li>
  <li style="margin-bottom: 8px;">Explore thousands of <a href="{{perks_url}}" style="color: #F8F19A;">perks and discounts</a> and start saving on items you were already buying.</li>
  <li style="margin-bottom: 8px;">Shop the <a href="{{store_url}}" style="color: #F8F19A;">Zero Dollar Store</a> where every item is — completely free. Items drop daily so check back often!</li>
</ul>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 14px; color: #FFFFFF; margin: 20px 0;">
  Your membership dashboard is your home base. Here you can track your savings, find your favorite perks, and see what other NFW members are up to. <a href="{{dashboard_url}}" style="color: #F8F19A;">Log in and get started!</a>
</p>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 14px; color: #FFFFFF; margin: 20px 0;">
  Want to spread the love? <a href="{{gift_url}}" style="color: #F8F19A;">Share a year of community, resources, and support</a> by gifting a membership to a woman in your life.
</p>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 14px; color: #FFFFFF; margin: 20px 0 0 0;">
  Need a hand? Visit our <a href="{{faq_url}}" style="color: #F8F19A;">FAQ page</a> for quick answers, or reach out to <a href="mailto:hello@nationalfundforwomen.org" style="color: #F8F19A;">hello@nationalfundforwomen.org</a> any time.
</p>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; font-style: italic; color: #FFFFFF; margin: 30px 0 0 0;">
  Thank you for showing up for women,
</p>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; font-style: italic; color: #FFFFFF; margin: 5px 0 0 0;">
  The NFW Team
</p>
'
WHERE slug = 'welcome-founding';

NOTIFY pgrst, 'reload';