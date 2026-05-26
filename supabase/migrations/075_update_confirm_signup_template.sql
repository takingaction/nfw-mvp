-- Update supabase-confirm-signup template with new design
-- Includes hero image, new headline, aubergine button, dove body background

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
      .hero-image { width: 100% !important; height: auto !important; }
      .body-cell { background-color: #EBEBE8 !important; }
      .footer-cell { background-color: #3E145F !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; font-family: ''DM Sans'', Arial, sans-serif; background-color: #FFFFFF;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding: 0;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px;" class="email-container">
          <!-- Dove Header with Logo -->
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
          <!-- Hero Image -->
          <tr>
            <td style="padding: 0;" class="hero-image">
              <img src="https://nationalfundforwomen.org/images/confirm.jpg" alt="Hero" width="600" style="display: block; width: 100%; height: auto;">
            </td>
          </tr>
          <!-- Dove Body -->
          <tr>
            <td style="background-color: #EBEBE8; padding: 0;" class="body-cell">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding: 50px 40px; text-align: center;">
                    <h2 style="font-family: Georgia, ''Times New Roman'', serif; font-size: 24px; font-weight: 700; color: #3E145F; margin: 0 0 30px 0; line-height: 1.3;">You''re a click away from becoming a member of the National Fund for Women.</h2>
                    
                    <!-- CTA Button -->
                    <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/auth/sign-up?step=1" style="display: inline-block; background-color: #3E145F; color: #FFFFFF; font-family: ''DM Sans'', Arial, sans-serif; font-size: 14px; font-weight: 700; text-transform: uppercase; padding: 16px 32px; text-decoration: none; margin-bottom: 30px;">CONFIRM ACCOUNT</a>
                    
                    <!-- Help Text (Playfair) -->
                    <p style="font-family: Georgia, ''Times New Roman'', serif; font-size: 14px; font-style: italic; color: #3E145F; line-height: 1.5; margin: 0 0 10px 0;">Having trouble with the button above?<br>Simply copy and paste the URL into your web browser.</p>
                    
                    <!-- Raw Link -->
                    <p style="font-family: ''DM Sans'', Arial, sans-serif; font-size: 12px; color: #3E145F; margin: 20px 0 0 0; word-break: break-all; opacity: 0.7;">{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/auth/sign-up?step=1</p>
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
                    <p style="font-family: Georgia, ''Times New Roman'', serif; font-size: 16px; font-style: italic; color: #FFFFFF; margin: 0 0 15px 0;">Together, we''re building support women need today and the collective power to shape the future.</p>
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