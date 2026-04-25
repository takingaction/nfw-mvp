-- Add Magic Link and Reauthentication Supabase templates
-- These templates exist in Supabase but were not previously seeded in our database

INSERT INTO email_templates (name, slug, category, description, subject, source_file, is_editable, html_content) VALUES
(
  'Magic Link',
  'supabase-magic-link',
  'supabase',
  'Magic link for passwordless login. Configure in Supabase Dashboard → Authentication → Email Templates → Magic link.',
  'Log In to National Fund for Women',
  'Supabase Dashboard → Authentication → Email Templates',
  true,
  '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Magic Link - National Fund for Women</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    @media only screen and (max-width: 480px) {
      .email-container { width: 100% !important; }
      .header-cell { background-color: #EBEBE8 !important; }
      .body-cell { background-color: #B693C0 !important; }
      .footer-cell { background-color: #3E145F !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; font-family: ''DM Sans'', Arial, sans-serif; background-color: #FFFFFF;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding: 0;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px;" class="email-container">
          <!-- Dove Header -->
          <tr>
            <td style="background-color: #EBEBE8; padding: 0;" class="header-cell">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding: 30px 40px;">
                    <img src="https://nationalfundforwomen.org/images/nfw-aubergine.png" alt="National Fund for Women" width="280" style="display: block;">
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Lilac Body -->
          <tr>
            <td style="background-color: #B693C0; padding: 0;" class="body-cell">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding: 50px 40px; text-align: center;">
                    <h2 style="font-family: Georgia, ''Times New Roman'', serif; font-size: 28px; font-weight: 700; color: #FFFFFF; margin: 0 0 20px 0;">Magic Link</h2>
                    <p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; color: #FFFFFF; line-height: 1.6; margin: 0 0 15px 0;">Follow this link to login:</p>
                    <p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; color: #FFFFFF; margin: 0 0 30px 0;"><a href="{{ .ConfirmationURL }}" style="color: #F8F19A; text-decoration: underline;">Log In</a></p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Aubergine Footer -->
          <tr>
            <td style="background-color: #3E145F; padding: 0;" class="footer-cell">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding: 30px 40px; text-align: center;">
                    <p style="font-family: Georgia, ''Times New Roman'', serif; font-size: 16px; font-style: italic; color: #FFFFFF; margin: 0 0 15px 0;">For women. For real life.</p>
                    <span style="display: inline-block; padding: 10px 0;">
                      <a href="https://www.instagram.com/nationalfundforwomen" target="_blank" style="display: inline-block; margin: 0 10px;"><img src="https://img.icons8.com/ios-filled/50/ffffff/instagram-new.png" alt="Instagram" width="24" height="24"></a>
                      <a href="https://www.tiktok.com/@nationalfundforwomen" target="_blank" style="display: inline-block; margin: 0 10px;"><img src="https://img.icons8.com/ios-filled/50/ffffff/tiktok--v1.png" alt="TikTok" width="24" height="24"></a>
                      <a href="https://www.facebook.com/nationalfundforwomen" target="_blank" style="display: inline-block; margin: 0 10px;"><img src="https://img.icons8.com/ios-filled/50/ffffff/facebook-new.png" alt="Facebook" width="24" height="24"></a>
                    </span>
                    <p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 11px; color: #FFFFFF; margin: 15px 0 0 0;">© 2026 National Fund for Women. All rights reserved.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>'
),
(
  'Reauthentication',
  'supabase-reauthentication',
  'supabase',
  'Reauthentication code for additional security. Configure in Supabase Dashboard → Authentication → Email Templates → Reauthenticate.',
  'Confirm Your Reauthentication - National Fund for Women',
  'Supabase Dashboard → Authentication → Email Templates',
  true,
  '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm Reauthentication - National Fund for Women</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    @media only screen and (max-width: 480px) {
      .email-container { width: 100% !important; }
      .header-cell { background-color: #EBEBE8 !important; }
      .body-cell { background-color: #B693C0 !important; }
      .footer-cell { background-color: #3E145F !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; font-family: ''DM Sans'', Arial, sans-serif; background-color: #FFFFFF;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding: 0;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px;" class="email-container">
          <!-- Dove Header -->
          <tr>
            <td style="background-color: #EBEBE8; padding: 0;" class="header-cell">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding: 30px 40px;">
                    <img src="https://nationalfundforwomen.org/images/nfw-aubergine.png" alt="National Fund for Women" width="280" style="display: block;">
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Lilac Body -->
          <tr>
            <td style="background-color: #B693C0; padding: 0;" class="body-cell">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding: 50px 40px; text-align: center;">
                    <h2 style="font-family: Georgia, ''Times New Roman'', serif; font-size: 28px; font-weight: 700; color: #FFFFFF; margin: 0 0 20px 0;">Confirm reauthentication</h2>
                    <p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; color: #FFFFFF; line-height: 1.6; margin: 0 0 15px 0;">Enter the code:</p>
                    <p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 32px; font-weight: 700; color: #F8F19A; margin: 0; letter-spacing: 4px;">{{ .Token }}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Aubergine Footer -->
          <tr>
            <td style="background-color: #3E145F; padding: 0;" class="footer-cell">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding: 30px 40px; text-align: center;">
                    <p style="font-family: Georgia, ''Times New Roman'', serif; font-size: 16px; font-style: italic; color: #FFFFFF; margin: 0 0 15px 0;">For women. For real life.</p>
                    <span style="display: inline-block; padding: 10px 0;">
                      <a href="https://www.instagram.com/nationalfundforwomen" target="_blank" style="display: inline-block; margin: 0 10px;"><img src="https://img.icons8.com/ios-filled/50/ffffff/instagram-new.png" alt="Instagram" width="24" height="24"></a>
                      <a href="https://www.tiktok.com/@nationalfundforwomen" target="_blank" style="display: inline-block; margin: 0 10px;"><img src="https://img.icons8.com/ios-filled/50/ffffff/tiktok--v1.png" alt="TikTok" width="24" height="24"></a>
                      <a href="https://www.facebook.com/nationalfundforwomen" target="_blank" style="display: inline-block; margin: 0 10px;"><img src="https://img.icons8.com/ios-filled/50/ffffff/facebook-new.png" alt="Facebook" width="24" height="24"></a>
                    </span>
                    <p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 11px; color: #FFFFFF; margin: 15px 0 0 0;">© 2026 National Fund for Women. All rights reserved.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>'
)
ON CONFLICT (slug) DO NOTHING;

NOTIFY pgrst, 'reload';