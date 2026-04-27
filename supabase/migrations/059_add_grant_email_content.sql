-- Add branded HTML content to new grant email templates
-- Run this in Supabase SQL Editor

UPDATE email_templates SET html_content = '
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{subject}}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #EBEBE8;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #EBEBE8;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #EBEBE8; border-radius: 50px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 30px 40px; background-color: #EBEBE8; text-align: center;">
              <img src="https://nationalfundforwomen.org/images/nfw-aubergine.png" alt="National Fund for Women" style="height: 50px;">
            </td>
          </tr>
          <!-- Hero -->
          <tr>
            <td style="padding: 0; margin: 0; background-image: url(''https://nationalfundforwomen.org/images/email-welcome-hero.jpg''); background-size: cover; background-position: center; background-repeat: no-repeat;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding: 80px 40px; text-align: center;">
                    <p style="font-family: Georgia, ''Times New Roman'', serif; font-size: 26px; font-style: italic; font-weight: 400; color: #FFFFFF; line-height: 1.4; margin: 0;">
                      Your application has been received
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 30px 40px; background-color: #B693C0;">
              <h1 style="font-family: Georgia, ''Times New Roman'', serif; font-size: 22px; font-weight: 700; color: #FFFFFF; margin: 0 0 20px 0; text-align: center;">
                Hello {{name}},
              </h1>
              <p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">
                Thank you for applying to <strong>{{grantCycleName}}</strong>. We have received your application and it is now being reviewed by our team.
              </p>
              <p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">
                Application ID: {{applicationId}}
              </p>
              <p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">
                We''ll be in touch soon with a decision. If you have any questions in the meantime, please don''t hesitate to reach out.
              </p>
              <p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0;">
                With love,<br><strong>The NFW Team</strong>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #3E145F; text-align: center;">
              <p style="font-family: Georgia, ''Times New Roman'', serif; font-size: 12px; font-style: italic; font-weight: 400; color: #FFFFFF; margin: 0 0 15px 0;">
                For women. For real life.
              </p>
              <p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 11px; color: #FFFFFF; margin: 0; text-align: center;">
                &copy; 2026 National Fund for Women. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
' WHERE slug = 'grant-application-received';

UPDATE email_templates SET html_content = '
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{subject}}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #EBEBE8;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #EBEBE8;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #EBEBE8; border-radius: 50px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 30px 40px; background-color: #EBEBE8; text-align: center;">
              <img src="https://nationalfundforwomen.org/images/nfw-aubergine.png" alt="National Fund for Women" style="height: 50px;">
            </td>
          </tr>
          <!-- Hero -->
          <tr>
            <td style="padding: 0; margin: 0; background-image: url(''https://nationalfundforwomen.org/images/email-welcome-hero.jpg''); background-size: cover; background-position: center; background-repeat: no-repeat;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding: 80px 40px; text-align: center;">
                    <p style="font-family: Georgia, ''Times New Roman'', serif; font-size: 26px; font-style: italic; font-weight: 400; color: #FFFFFF; line-height: 1.4; margin: 0;">
                      Your application is being reviewed
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 30px 40px; background-color: #B693C0;">
              <h1 style="font-family: Georgia, ''Times New Roman'', serif; font-size: 22px; font-weight: 700; color: #FFFFFF; margin: 0 0 20px 0; text-align: center;">
                Hello {{name}},
              </h1>
              <p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">
                Great news — your application for the <strong>{{grantCycleName}}</strong> is now being reviewed by our team.
              </p>
              <p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">
                We''ll be in touch soon with a decision. Thank you for your patience.
              </p>
              <p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0;">
                With love,<br><strong>The NFW Team</strong>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #3E145F; text-align: center;">
              <p style="font-family: Georgia, ''Times New Roman'', serif; font-size: 12px; font-style: italic; font-weight: 400; color: #FFFFFF; margin: 0 0 15px 0;">
                For women. For real life.
              </p>
              <p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 11px; color: #FFFFFF; margin: 0; text-align: center;">
                &copy; 2026 National Fund for Women. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
' WHERE slug = 'grant-under-review';

UPDATE email_templates SET html_content = '
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{subject}}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #EBEBE8;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #EBEBE8;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #EBEBE8; border-radius: 50px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 30px 40px; background-color: #EBEBE8; text-align: center;">
              <img src="https://nationalfundforwomen.org/images/nfw-aubergine.png" alt="National Fund for Women" style="height: 50px;">
            </td>
          </tr>
          <!-- Hero -->
          <tr>
            <td style="padding: 0; margin: 0; background-image: url(''https://nationalfundforwomen.org/images/email-welcome-hero.jpg''); background-size: cover; background-position: center; background-repeat: no-repeat;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding: 80px 40px; text-align: center;">
                    <p style="font-family: Georgia, ''Times New Roman'', serif; font-size: 26px; font-style: italic; font-weight: 400; color: #FFFFFF; line-height: 1.4; margin: 0;">
                      Congratulations, {{name}}!
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 30px 40px; background-color: #B693C0;">
              <h1 style="font-family: Georgia, ''Times New Roman'', serif; font-size: 22px; font-weight: 700; color: #FFFFFF; margin: 0 0 20px 0; text-align: center;">
                Your application has been approved!
              </h1>
              <p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">
                We''re thrilled to let you know that your application for the <strong>{{grantCycleName}}</strong> has been approved{{#if amount}} for <strong>${{amount}}</strong>{{/if}}!
              </p>
              <p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">
                Please log in to your dashboard to connect your bank account so we can send your funds.
              </p>
              <p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0;">
                With love,<br><strong>The NFW Team</strong>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #3E145F; text-align: center;">
              <p style="font-family: Georgia, ''Times New Roman'', serif; font-size: 12px; font-style: italic; font-weight: 400; color: #FFFFFF; margin: 0 0 15px 0;">
                For women. For real life.
              </p>
              <p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 11px; color: #FFFFFF; margin: 0; text-align: center;">
                &copy; 2026 National Fund for Women. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
' WHERE slug = 'grant-approved';

UPDATE email_templates SET html_content = '
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{subject}}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #EBEBE8;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #EBEBE8;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #EBEBE8; border-radius: 50px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 30px 40px; background-color: #EBEBE8; text-align: center;">
              <img src="https://nationalfundforwomen.org/images/nfw-aubergine.png" alt="National Fund for Women" style="height: 50px;">
            </td>
          </tr>
          <!-- Hero -->
          <tr>
            <td style="padding: 0; margin: 0; background-image: url(''https://nationalfundforwomen.org/images/email-welcome-hero.jpg''); background-size: cover; background-position: center; background-repeat: no-repeat;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding: 80px 40px; text-align: center;">
                    <p style="font-family: Georgia, ''Times New Roman'', serif; font-size: 26px; font-style: italic; font-weight: 400; color: #FFFFFF; line-height: 1.4; margin: 0;">
                      Update on your application
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 30px 40px; background-color: #B693C0;">
              <h1 style="font-family: Georgia, ''Times New Roman'', serif; font-size: 22px; font-weight: 700; color: #FFFFFF; margin: 0 0 20px 0; text-align: center;">
                Hello {{name}},
              </h1>
              <p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">
                Thank you for applying to the <strong>{{grantCycleName}}</strong>. After careful review, we were unable to approve your application at this time.
              </p>
              <p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">
                We encourage you to apply again in a future cycle. We''re rooting for you.
              </p>
              <p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0;">
                With love,<br><strong>The NFW Team</strong>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #3E145F; text-align: center;">
              <p style="font-family: Georgia, ''Times New Roman'', serif; font-size: 12px; font-style: italic; font-weight: 400; color: #FFFFFF; margin: 0 0 15px 0;">
                For women. For real life.
              </p>
              <p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 11px; color: #FFFFFF; margin: 0; text-align: center;">
                &copy; 2026 National Fund for Women. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
' WHERE slug = 'grant-not-approved';

UPDATE email_templates SET html_content = '
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{subject}}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #EBEBE8;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #EBEBE8;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #EBEBE8; border-radius: 50px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 30px 40px; background-color: #EBEBE8; text-align: center;">
              <img src="https://nationalfundforwomen.org/images/nfw-aubergine.png" alt="National Fund for Women" style="height: 50px;">
            </td>
          </tr>
          <!-- Hero -->
          <tr>
            <td style="padding: 0; margin: 0; background-image: url(''https://nationalfundforwomen.org/images/email-welcome-hero.jpg''); background-size: cover; background-position: center; background-repeat: no-repeat;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding: 80px 40px; text-align: center;">
                    <p style="font-family: Georgia, ''Times New Roman'', serif; font-size: 26px; font-style: italic; font-weight: 400; color: #FFFFFF; line-height: 1.4; margin: 0;">
                      Your payment is on its way
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 30px 40px; background-color: #B693C0;">
              <h1 style="font-family: Georgia, ''Times New Roman'', serif; font-size: 22px; font-weight: 700; color: #FFFFFF; margin: 0 0 20px 0; text-align: center;">
                Hello {{name}},
              </h1>
              <p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">
                Your grant payment of <strong>{{#if amount}}${{amount}}{{/if}}</strong> is being processed and will arrive in your bank account within 1-3 business days.
              </p>
              <p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">
                Please make sure your bank account information is correct in your dashboard.
              </p>
              <p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0;">
                With love,<br><strong>The NFW Team</strong>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #3E145F; text-align: center;">
              <p style="font-family: Georgia, ''Times New Roman'', serif; font-size: 12px; font-style: italic; font-weight: 400; color: #FFFFFF; margin: 0 0 15px 0;">
                For women. For real life.
              </p>
              <p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 11px; color: #FFFFFF; margin: 0; text-align: center;">
                &copy; 2026 National Fund for Women. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
' WHERE slug = 'grant-payment-pending';

UPDATE email_templates SET html_content = '
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{subject}}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #EBEBE8;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #EBEBE8;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #EBEBE8; border-radius: 50px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 30px 40px; background-color: #EBEBE8; text-align: center;">
              <img src="https://nationalfundforwomen.org/images/nfw-aubergine.png" alt="National Fund for Women" style="height: 50px;">
            </td>
          </tr>
          <!-- Hero -->
          <tr>
            <td style="padding: 0; margin: 0; background-image: url(''https://nationalfundforwomen.org/images/email-welcome-hero.jpg''); background-size: cover; background-position: center; background-repeat: no-repeat;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding: 80px 40px; text-align: center;">
                    <p style="font-family: Georgia, ''Times New Roman'', serif; font-size: 26px; font-style: italic; font-weight: 400; color: #FFFFFF; line-height: 1.4; margin: 0;">
                      Your payment has been sent!
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 30px 40px; background-color: #B693C0;">
              <h1 style="font-family: Georgia, ''Times New Roman'', serif; font-size: 22px; font-weight: 700; color: #FFFFFF; margin: 0 0 20px 0; text-align: center;">
                Hello {{name}},
              </h1>
              <p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">
                Your grant payment of <strong>{{#if amount}}${{amount}}{{/if}}</strong> has been sent! Please allow 1-3 business days for it to appear in your account.
              </p>
              <p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">
                Thank you for being part of NFW.
              </p>
              <p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0;">
                With love,<br><strong>The NFW Team</strong>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #3E145F; text-align: center;">
              <p style="font-family: Georgia, ''Times New Roman'', serif; font-size: 12px; font-style: italic; font-weight: 400; color: #FFFFFF; margin: 0 0 15px 0;">
                For women. For real life.
              </p>
              <p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 11px; color: #FFFFFF; margin: 0; text-align: center;">
                &copy; 2026 National Fund for Women. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
' WHERE slug = 'grant-payment-sent';

-- Verify the content was added
SELECT slug, name, LENGTH(html_content) as content_length FROM email_templates WHERE category = 'resend' ORDER BY name;