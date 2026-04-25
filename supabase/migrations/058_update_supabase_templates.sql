-- Update Supabase email templates with exact content from Supabase Dashboard
-- Wrapped in branded header/footer structure

-- =============================================================================
-- CONFIRM SIGNUP
-- =============================================================================
UPDATE email_templates SET
  html_content = '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm Your Signup - National Fund for Women</title>
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
                    <h2 style="font-family: Georgia, ''Times New Roman'', serif; font-size: 28px; font-weight: 700; color: #FFFFFF; margin: 0 0 20px 0;">Confirm your signup</h2>
                    <p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; color: #FFFFFF; line-height: 1.6; margin: 0 0 15px 0;">Follow this link to confirm your user:</p>
                    <p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; color: #FFFFFF; margin: 0 0 30px 0;"><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/auth/sign-up?step=1" style="color: #F8F19A; text-decoration: underline;">Confirm your email</a></p>
                    <p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 14px; color: rgba(255,255,255,0.8); margin: 0 0 10px 0;">Or copy and paste this URL into your browser:</p>
                    <p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 12px; color: rgba(255,255,255,0.7); margin: 0; word-break: break-all;">{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/auth/sign-up?step=1</p>
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
</html>',
  is_editable = true
WHERE slug = 'supabase-confirm-signup';

-- =============================================================================
-- CHANGE EMAIL ADDRESS
-- =============================================================================
UPDATE email_templates SET
  html_content = '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm Your Email Change - National Fund for Women</title>
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
                    <h2 style="font-family: Georgia, ''Times New Roman'', serif; font-size: 28px; font-weight: 700; color: #FFFFFF; margin: 0 0 20px 0;">Confirm Change of Email</h2>
                    <p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; color: #FFFFFF; line-height: 1.6; margin: 0 0 15px 0;">Follow this link to confirm the update of your email from {{ .Email }} to {{ .NewEmail }}:</p>
                    <p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; color: #FFFFFF; margin: 0 0 30px 0;"><a href="{{ .ConfirmationURL }}" style="color: #F8F19A; text-decoration: underline;">Change Email</a></p>
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
</html>',
  is_editable = true
WHERE slug = 'supabase-change-email';

-- =============================================================================
-- RESET PASSWORD
-- =============================================================================
UPDATE email_templates SET
  html_content = '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password - National Fund for Women</title>
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
                    <h2 style="font-family: Georgia, ''Times New Roman'', serif; font-size: 28px; font-weight: 700; color: #FFFFFF; margin: 0 0 20px 0;">Reset Password</h2>
                    <p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; color: #FFFFFF; line-height: 1.6; margin: 0 0 15px 0;">Follow this link to reset the password for your user:</p>
                    <p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; color: #FFFFFF; margin: 0 0 30px 0;"><a href="{{ .ConfirmationURL }}" style="color: #F8F19A; text-decoration: underline;">Reset Password</a></p>
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
</html>',
  is_editable = true
WHERE slug = 'supabase-reset-password';

-- =============================================================================
-- INVITE USER
-- =============================================================================
UPDATE email_templates SET
  html_content = '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You Have Been Invited - National Fund for Women</title>
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
                    <h2 style="font-family: Georgia, ''Times New Roman'', serif; font-size: 28px; font-weight: 700; color: #FFFFFF; margin: 0 0 20px 0;">You have been invited</h2>
                    <p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; color: #FFFFFF; line-height: 1.6; margin: 0 0 15px 0;">You have been invited to create a user on {{ .SiteURL }}. Follow this link to accept the invite:</p>
                    <p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; color: #FFFFFF; margin: 0 0 30px 0;"><a href="{{ .ConfirmationURL }}" style="color: #F8F19A; text-decoration: underline;">Accept the invite</a></p>
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
</html>',
  is_editable = true
WHERE slug = 'supabase-invite-user';

NOTIFY pgrst, 'reload';