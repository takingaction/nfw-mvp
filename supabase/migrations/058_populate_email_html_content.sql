-- Populate html_content for ALL email templates (Resend + Supabase)
-- Uses branded header/footer structure with Supabase variables where appropriate

-- =============================================================================
-- RESEND TEMPLATES (already populated in previous migration, keeping for reference)
-- =============================================================================

UPDATE email_templates SET
  html_content = '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>National Fund for Women</title>
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
<body style="margin: 0; padding: 0; background-color: #FFFFFF; font-family: ''DM Sans'', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding: 0;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="border-radius: 50px; overflow: hidden; max-width: 600px;" class="email-container">
          <!-- Dove Header with Logo -->
          <tr>
            <td style="background-color: #EBEBE8; padding: 0;" class="header-cell">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding: 30px 40px 20px 40px;">
                    <img src="https://nationalfundforwomen.org/images/nfw-aubergine.png" alt="National Fund for Women" width="300" style="display: block; max-width: 100%;">
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Hero Image -->
          <tr>
            <td style="padding: 0; margin: 0; background-image: url(''https://nationalfundforwomen.org/images/email-welcome-hero.jpg''); background-size: cover; background-position: center; background-repeat: no-repeat;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding: 100px 40px; text-align: center; vertical-align: middle;">
                    <p style="font-family: Georgia, ''Times New Roman'', serif; font-size: 26px; font-style: italic; font-weight: 400; color: #FFFFFF; line-height: 1.4; margin: 0;">A <em>community</em> of women showing up for each other</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Headline -->
          <tr>
            <td style="padding: 30px 40px 20px 40px; background-color: #B693C0;">
              <h1 style="font-family: Georgia, ''Times New Roman'', serif; font-size: 24px; font-weight: 700; color: #FFFFFF; margin: 0; text-align: center;">Welcome to NFW!</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 0 40px 20px 40px; background-color: #B693C0;" class="body-cell">
              <p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">Welcome to the National Fund for Women! We couldn''t be more excited to have you join our community.</p>
              <p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">At NFW, we believe that women deserve real support when they need it. Our goal is to provide immediate, practical support for women at every stage of their lives, while building collective power along the way.</p>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;">
                <tr>
                  <td style="padding: 15px 20px; background-color: rgba(255,255,255,0.1); border-radius: 8px;">
                    <p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 14px; font-weight: 700; color: #FFFFFF; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 0.05em;">Your membership snapshot</p>
                    <p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 14px; color: #FFFFFF; margin: 0 0 5px 0;"><strong>Email:</strong> member@example.com</p>
                    <p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 14px; color: #FFFFFF; margin: 0;"><strong>Membership Tier:</strong> Free</p>
                  </td>
                </tr>
              </table>
              <p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 14px; font-weight: 700; color: #FFFFFF; margin: 20px 0 10px 0; text-transform: uppercase; letter-spacing: 0.05em;">Check out what you just unlocked</p>
              <ul style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 14px; color: #FFFFFF; margin: 0 0 20px 0; padding-left: 20px;">
                <li style="margin-bottom: 8px;">Browse our current <a href="https://nationalfundforwomen.org/grants" style="color: #F8F19A;">microgrant offerings</a></li>
                <li style="margin-bottom: 8px;">Explore thousands of <a href="https://nationalfundforwomen.org/perks" style="color: #F8F19A;">perks and discounts</a></li>
                <li style="margin-bottom: 8px;">Shop the <a href="https://nationalfundforwomen.org/store" style="color: #F8F19A;">Zero Dollar Store</a> — free items daily!</li>
              </ul>
              <p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; font-style: italic; color: #FFFFFF; margin: 30px 0 0 0;">Thank you for showing up for women,</p>
              <p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; font-style: italic; color: #FFFFFF; margin: 5px 0 0 0;">The NFW Team</p>
            </td>
          </tr>
          <!-- CTA Button -->
          <tr>
            <td style="padding: 20px 40px; background-color: #B693C0; text-align: center;">
              <a href="https://nationalfundforwomen.org/dashboard" style="display: inline-block; background-color: #F8F19A; color: #3E145F; font-family: ''DM Sans'', Arial, sans-serif; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; text-decoration: none; padding: 12px 24px;">GET STARTED</a>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #3E145F; padding: 30px 40px 40px 40px; text-align: center;" class="footer-cell">
              <p style="font-family: Georgia, ''Times New Roman'', serif; font-size: 16px; font-style: italic; font-weight: 400; color: #FFFFFF; line-height: 1.6; margin: 0 0 20px 0;">Together, we''re building support women need today and the collective power to shape the future.</p>
              <a href="https://nationalfundforwomen.org" style="display: inline-block; background-color: #F8F19A; color: #3E145F; font-family: ''DM Sans'', Arial, sans-serif; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; text-decoration: none; padding: 12px 24px; margin-bottom: 20px;">VISIT WEBSITE</a>
              <p style="font-family: Georgia, ''Times New Roman'', serif; font-size: 12px; font-style: italic; font-weight: 400; color: #FFFFFF; margin: 0 0 15px 0;">For women. For real life.</p>
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
</body>
</html>'
WHERE slug = 'welcome';

-- =============================================================================
-- SUPABASE TEMPLATES - Branded header/body/footer with Supabase variables
-- =============================================================================

-- Confirm Signup
UPDATE email_templates SET
  html_content = '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm Your Email - National Fund for Women</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; font-family: ''DM Sans'', Arial, sans-serif; background-color: #FFFFFF;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding: 0;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; border-radius: 8px; overflow: hidden;">
          <!-- Dove Header -->
          <tr>
            <td style="background-color: #EBEBE8; padding: 0;">
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
            <td style="background-color: #B693C0; padding: 0;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding: 50px 40px; text-align: center;">
                    <h1 style="font-family: Georgia, ''Times New Roman'', serif; font-size: 28px; font-weight: 700; color: #FFFFFF; margin: 0 0 20px 0;">Confirm Your Email</h1>
                    <p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; color: #FFFFFF; line-height: 1.6; margin: 0 0 30px 0;">Click the button below to confirm your email address and complete your signup.</p>
                    <a href="{{ .ConfirmationURL }}" style="display: inline-block; background-color: #F8F19A; color: #3E145F; font-family: ''DM Sans'', Arial, sans-serif; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; text-decoration: none; padding: 14px 28px;">CONFIRM EMAIL</a>
                    <p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 12px; color: rgba(255,255,255,0.7); margin: 30px 0 0 0;">If you didn''t request this, you can safely ignore this email.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Aubergine Footer -->
          <tr>
            <td style="background-color: #3E145F; padding: 0;">
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
WHERE slug = 'supabase-confirm-signup';

-- Reset Password
UPDATE email_templates SET
  html_content = '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password - National Fund for Women</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; font-family: ''DM Sans'', Arial, sans-serif; background-color: #FFFFFF;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding: 0;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; border-radius: 8px; overflow: hidden;">
          <!-- Dove Header -->
          <tr>
            <td style="background-color: #EBEBE8; padding: 0;">
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
            <td style="background-color: #B693C0; padding: 0;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding: 50px 40px; text-align: center;">
                    <h1 style="font-family: Georgia, ''Times New Roman'', serif; font-size: 28px; font-weight: 700; color: #FFFFFF; margin: 0 0 20px 0;">Reset Your Password</h1>
                    <p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; color: #FFFFFF; line-height: 1.6; margin: 0 0 30px 0;">Click the button below to reset your password. This link will expire in 24 hours.</p>
                    <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/auth/update-password" style="display: inline-block; background-color: #F8F19A; color: #3E145F; font-family: ''DM Sans'', Arial, sans-serif; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; text-decoration: none; padding: 14px 28px;">RESET PASSWORD</a>
                    <p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 12px; color: rgba(255,255,255,0.7); margin: 30px 0 0 0;">If you didn''t request a password reset, you can safely ignore this email.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Aubergine Footer -->
          <tr>
            <td style="background-color: #3E145F; padding: 0;">
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
WHERE slug = 'supabase-reset-password';

-- Change Email Address
UPDATE email_templates SET
  html_content = '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm Your New Email Address - National Fund for Women</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; font-family: ''DM Sans'', Arial, sans-serif; background-color: #FFFFFF;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding: 0;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; border-radius: 8px; overflow: hidden;">
          <!-- Dove Header -->
          <tr>
            <td style="background-color: #EBEBE8; padding: 0;">
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
            <td style="background-color: #B693C0; padding: 0;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding: 50px 40px; text-align: center;">
                    <h1 style="font-family: Georgia, ''Times New Roman'', serif; font-size: 28px; font-weight: 700; color: #FFFFFF; margin: 0 0 20px 0;">Confirm Your New Email Address</h1>
                    <p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; color: #FFFFFF; line-height: 1.6; margin: 0 0 15px 0;">You requested to change your email from:</p>
                    <p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 14px; color: rgba(255,255,255,0.8); margin: 0 0 15px 0;">{{ .OldEmail }}</p>
                    <p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; color: #FFFFFF; line-height: 1.6; margin: 0 0 15px 0;">To:</p>
                    <p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 14px; color: #F8F19A; margin: 0 0 30px 0;">{{ .NewEmail }}</p>
                    <a href="{{ .ConfirmationURL }}" style="display: inline-block; background-color: #F8F19A; color: #3E145F; font-family: ''DM Sans'', Arial, sans-serif; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; text-decoration: none; padding: 14px 28px;">CONFIRM CHANGE</a>
                    <p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 12px; color: rgba(255,255,255,0.7); margin: 30px 0 0 0;">If you didn''t request this change, you can safely ignore this email.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Aubergine Footer -->
          <tr>
            <td style="background-color: #3E145F; padding: 0;">
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
WHERE slug = 'supabase-change-email';

-- Invite User
UPDATE email_templates SET
  html_content = '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You''ve Been Invited - National Fund for Women</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; font-family: ''DM Sans'', Arial, sans-serif; background-color: #FFFFFF;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding: 0;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; border-radius: 8px; overflow: hidden;">
          <!-- Dove Header -->
          <tr>
            <td style="background-color: #EBEBE8; padding: 0;">
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
            <td style="background-color: #B693C0; padding: 0;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding: 50px 40px; text-align: center;">
                    <h1 style="font-family: Georgia, ''Times New Roman'', serif; font-size: 28px; font-weight: 700; color: #FFFFFF; margin: 0 0 20px 0;">You''ve Been Invited to Join NFW</h1>
                    <p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 16px; color: #FFFFFF; line-height: 1.6; margin: 0 0 30px 0;">You''ve been invited to create an account at National Fund for Women. Click the button below to accept your invitation and get started.</p>
                    <a href="{{ .ConfirmationURL }}" style="display: inline-block; background-color: #F8F19A; color: #3E145F; font-family: ''DM Sans'', Arial, sans-serif; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; text-decoration: none; padding: 14px 28px;">ACCEPT INVITATION</a>
                    <p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 12px; color: rgba(255,255,255,0.7); margin: 30px 0 0 0;">This invitation was sent to: {{ .Email }}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Aubergine Footer -->
          <tr>
            <td style="background-color: #3E145F; padding: 0;">
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
WHERE slug = 'supabase-invite-user';

NOTIFY pgrst, 'reload';