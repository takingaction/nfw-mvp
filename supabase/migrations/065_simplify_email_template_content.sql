-- Migration: Simplify email template content to body-only fragments
-- Date: 2026-04-29
-- Purpose: Templates now receive body content via buildEmailHtml() wrapper
--          These should be inner body fragments, NOT full HTML documents

UPDATE email_templates SET html_content = '
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">Dear {{name}},</p>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">Welcome to the National Fund for Women! We couldn''t be more excited to have you join our community.</p>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">At NFW, we believe that women deserve real support when they need it. Asking for help shouldn''t come with added barriers or additional stress. Our goal is to provide immediate, practical support for women at every stage of their lives, while building collective power along the way. We hope you find plenty of support, connection, and joy here — we''ve got your back!</p>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 14px; font-weight: 700; color: #FFFFFF; margin: 20px 0 10px 0; text-transform: uppercase; letter-spacing: 0.05em;">Check out what you just unlocked</p>
<ul style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 14px; color: #FFFFFF; margin: 0 0 20px 0; padding-left: 20px;">
  <li style="margin-bottom: 8px;">Browse our current microgrant offerings and apply in just a few minutes.</li>
  <li style="margin-bottom: 8px;">Explore thousands of perks and discounts and start saving on items you were already buying.</li>
  <li style="margin-bottom: 8px;">Shop the Zero Dollar Store where every item is — completely free. Items drop daily so check back often!</li>
</ul>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 14px; color: #FFFFFF; margin: 20px 0;">Your membership dashboard is your home base. Log in and get started!</p>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 14px; color: #FFFFFF; margin: 20px 0;">Ready to level up your impact? Consider becoming a Contributing Member.</p>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 14px; color: #FFFFFF; margin: 20px 0 0 0;">Need a hand? Visit our FAQ page or reach out to hello@nationalfundforwomen.org any time.</p>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; font-style: italic; color: #FFFFFF; margin: 30px 0 0 0;">Thank you for showing up for women,</p>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; font-style: italic; color: #FFFFFF; margin: 5px 0 0 0;">The NFW Team</p>
' WHERE slug = 'welcome-free';

UPDATE email_templates SET html_content = '
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">Dear {{name}},</p>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">Welcome to the National Fund for Women! We couldn''t be more excited to have you join our community.</p>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">At NFW, we believe that women deserve real support when they need it. As a Contributing Member, your membership helps make that possible for you and for every woman who comes after you. You''re supporting women simply by belonging, while building a future where women''s needs are impossible to ignore. To that, we say: thank YOU!</p>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 14px; font-weight: 700; color: #FFFFFF; margin: 20px 0 10px 0; text-transform: uppercase; letter-spacing: 0.05em;">Check out what you just unlocked</p>
<ul style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 14px; color: #FFFFFF; margin: 0 0 20px 0; padding-left: 20px;">
  <li style="margin-bottom: 8px;">Browse our current microgrant offerings and apply in just a few minutes.</li>
  <li style="margin-bottom: 8px;">Explore thousands of perks and discounts and start saving on items you were already buying.</li>
  <li style="margin-bottom: 8px;">Shop the Zero Dollar Store where every item is — completely free. Items drop daily so check back often!</li>
</ul>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 14px; color: #FFFFFF; margin: 20px 0;">Your membership dashboard is your home base. Log in and get started!</p>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 14px; color: #FFFFFF; margin: 20px 0;">Want to spread the love? Share a year of community, resources, and support by gifting a membership to a woman in your life.</p>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 14px; color: #FFFFFF; margin: 20px 0 0 0;">Need a hand? Visit our FAQ page or reach out to hello@nationalfundforwomen.org any time.</p>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; font-style: italic; color: #FFFFFF; margin: 30px 0 0 0;">Thank you for showing up for women,</p>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; font-style: italic; color: #FFFFFF; margin: 5px 0 0 0;">The NFW Team</p>
' WHERE slug = 'welcome-contributing';

UPDATE email_templates SET html_content = '
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">Dear {{name}},</p>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">Welcome to the National Fund for Women! We couldn''t be more excited to have you join our community.</p>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">At NFW, we believe that women deserve real support when they need it. As a Founding Member, you''re helping us power our programs and multiply our impact for women across the country. You''re supporting women simply by belonging, while building a future where women''s needs are impossible to ignore. To that, we say: thank YOU!</p>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 14px; font-weight: 700; color: #FFFFFF; margin: 20px 0 10px 0; text-transform: uppercase; letter-spacing: 0.05em;">Check out what you just unlocked</p>
<ul style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 14px; color: #FFFFFF; margin: 0 0 20px 0; padding-left: 20px;">
  <li style="margin-bottom: 8px;">Browse our current microgrant offerings and apply in just a few minutes.</li>
  <li style="margin-bottom: 8px;">Explore thousands of perks and discounts and start saving on items you were already buying.</li>
  <li style="margin-bottom: 8px;">Shop the Zero Dollar Store where every item is — completely free. Items drop daily so check back often!</li>
</ul>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 14px; color: #FFFFFF; margin: 20px 0;">Your membership dashboard is your home base. Log in and get started!</p>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 14px; color: #FFFFFF; margin: 20px 0;">Want to spread the love? Share a year of community, resources, and support by gifting a membership to a woman in your life.</p>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 14px; color: #FFFFFF; margin: 20px 0 0 0;">Need a hand? Visit our FAQ page or reach out to hello@nationalfundforwomen.org any time.</p>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; font-style: italic; color: #FFFFFF; margin: 30px 0 0 0;">Thank you for showing up for women,</p>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; font-style: italic; color: #FFFFFF; margin: 5px 0 0 0;">The NFW Team</p>
' WHERE slug = 'welcome-founding';

UPDATE email_templates SET html_content = '
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">Dear {{name}},</p>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">We''ve received your grant application for <strong>{{grantCycleName}}</strong>. Our team will review it and get back to you soon.</p>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 14px; color: #FFFFFF; margin: 20px 0 0 0;">You can track your application status in your dashboard anytime.</p>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; font-style: italic; color: #FFFFFF; margin: 30px 0 0 0;">Thank you for showing up for women,</p>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; font-style: italic; color: #FFFFFF; margin: 5px 0 0 0;">The NFW Team</p>
' WHERE slug = 'grant-under-review';

UPDATE email_templates SET html_content = '
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">Dear {{name}},</p>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">Congratulations! Your grant application for <strong>{{grantCycleName}}</strong> has been approved!</p>
{{#if amount}}
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">You''ve been approved for <strong>${{amount}}</strong>. We''ll be in touch shortly with next steps.</p>
{{/if}}
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; font-style: italic; color: #FFFFFF; margin: 30px 0 0 0;">Thank you for showing up for women,</p>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; font-style: italic; color: #FFFFFF; margin: 5px 0 0 0;">The NFW Team</p>
' WHERE slug = 'grant-approved';

UPDATE email_templates SET html_content = '
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">Dear {{name}},</p>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">Thank you for your interest in <strong>{{grantCycleName}}</strong>. After careful consideration, we''re unable to approve your application at this time.</p>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 14px; color: #FFFFFF; margin: 0 0 20px 0;">This doesn''t mean the end of the road — we encourage you to apply for future grant cycles. Keep an eye on our grants page for new opportunities.</p>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; font-style: italic; color: #FFFFFF; margin: 30px 0 0 0;">Thank you for showing up for women,</p>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; font-style: italic; color: #FFFFFF; margin: 5px 0 0 0;">The NFW Team</p>
' WHERE slug = 'grant-not-approved';

UPDATE email_templates SET html_content = '
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">Dear {{name}},</p>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">Great news! Your grant for <strong>{{grantCycleName}}</strong> has been approved and your payment is being processed.</p>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 14px; color: #FFFFFF; margin: 0 0 20px 0;">You''ll receive an email with instructions on how to connect your bank account so we can disburse your funds.</p>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; font-style: italic; color: #FFFFFF; margin: 30px 0 0 0;">Thank you for showing up for women,</p>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; font-style: italic; color: #FFFFFF; margin: 5px 0 0 0;">The NFW Team</p>
' WHERE slug = 'grant-payment-pending';

UPDATE email_templates SET html_content = '
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">Dear {{name}},</p>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">Your grant payment for <strong>{{grantCycleName}}</strong> has been sent! You should receive the funds in your account within 5-7 business days.</p>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 14px; color: #FFFFFF; margin: 0 0 20px 0;">We''d love to hear about your experience. Consider sharing your story to inspire other women in our community.</p>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; font-style: italic; color: #FFFFFF; margin: 30px 0 0 0;">Thank you for showing up for women,</p>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; font-style: italic; color: #FFFFFF; margin: 5px 0 0 0;">The NFW Team</p>
' WHERE slug = 'grant-payment-sent';

UPDATE email_templates SET html_content = '
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">Dear {{name}},</p>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">Your application for <strong>{{grantCycleName}}</strong> has been received! We''ll review it and get back to you soon.</p>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 14px; color: #FFFFFF; margin: 0 0 20px 0;">Application ID: {{applicationId}}</p>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 14px; color: #FFFFFF; margin: 20px 0 0 0;">Track your application status in your dashboard anytime.</p>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; font-style: italic; color: #FFFFFF; margin: 30px 0 0 0;">Thank you for showing up for women,</p>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; font-style: italic; color: #FFFFFF; margin: 5px 0 0 0;">The NFW Team</p>
' WHERE slug = 'grant-application-received';

UPDATE email_templates SET html_content = '
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">Dear {{name}},</p>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">Great news — your grant application for <strong>{{grantCycleName}}</strong> has been approved! To receive your <strong>${{amount}}</strong> grant, we need you to connect your bank account.</p>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 14px; font-weight: 700; color: #FFFFFF; margin: 20px 0 10px 0; text-transform: uppercase; letter-spacing: 0.05em;">Next Steps</p>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">Click the button below to securely connect your bank account. Once connected, funds will be disbursed within 5-7 business days.</p>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 14px; color: #FFFFFF; margin: 20px 0 0 0;">If you have any questions, reach out to hello@nationalfundforwomen.org.</p>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; font-style: italic; color: #FFFFFF; margin: 30px 0 0 0;">Thank you for showing up for women,</p>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; font-style: italic; color: #FFFFFF; margin: 5px 0 0 0;">The NFW Team</p>
' WHERE slug = 'bank-info-request';

UPDATE email_templates SET html_content = '
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">Dear {{name}},</p>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">Welcome to the National Fund for Women newsletter — where we share ways to make life a little more possible for women (yourself included), and where a growing community shows up for each other in real ways.</p>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 14px; font-weight: 700; color: #FFFFFF; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 0.05em;">What to expect</p>
<ul style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 14px; color: #FFFFFF; margin: 0 0 20px 0; padding-left: 20px;">
  <li style="margin-bottom: 8px;">Microgrant opportunities</li>
  <li style="margin-bottom: 8px;">Perks and partner discounts</li>
  <li style="margin-bottom: 8px;">Drops from the Zero Dollar Store</li>
  <li style="margin-bottom: 8px;">A few things we think are actually worth your time</li>
  <li style="margin-bottom: 8px;">Real stories from women across the country</li>
</ul>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; color: #FFFFFF; margin: 0 0 30px 0;">No noise — just the good stuff.</p>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; font-style: italic; color: #FFFFFF; margin: 0;">Talk soon,</p>
<p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; font-style: italic; color: #FFFFFF; margin: 5px 0 0 0;">The NFW Team</p>
' WHERE slug = 'newsletter-welcome';

NOTIFY pgrst, 'reload';
