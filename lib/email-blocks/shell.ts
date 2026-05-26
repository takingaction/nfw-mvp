const LOGO_URL = "https://nationalfundforwomen.org/images/nfw-aubergine.png";
const SITE_URL = "https://nationalfundforwomen.org";

export interface ShellOptions {
  sectionsHtml: string;
}

export function buildEmailShell({ sectionsHtml }: ShellOptions): string {
  const containerBackground = "#EBEBE8";
  const footerBackground = "#3E145F";
  const whiteColor = "#FFFFFF";

  const socialIcons = `
    <span style="display: inline-block; padding: 15px 0;">
      <a href="https://www.instagram.com/nationalfundforwomen" target="_blank" style="display: inline-block; margin: 0 12px; text-decoration: none;">
        <img src="https://img.icons8.com/ios-filled/50/ffffff/instagram-new.png" alt="Instagram" width="28" height="28" style="display: block; width: 28px; height: 28px;">
      </a>
      <a href="https://www.tiktok.com/@nationalfundforwomen" target="_blank" style="display: inline-block; margin: 0 12px; text-decoration: none;">
        <img src="https://img.icons8.com/ios-filled/50/ffffff/tiktok--v1.png" alt="TikTok" width="28" height="28" style="display: block; width: 28px; height: 28px;">
      </a>
      <a href="https://www.facebook.com/nationalfundforwomen" target="_blank" style="display: inline-block; margin: 0 12px; text-decoration: none;">
        <img src="https://img.icons8.com/ios-filled/50/ffffff/facebook-new.png" alt="Facebook" width="28" height="28" style="display: block; width: 28px; height: 28px;">
      </a>
    </span>
  `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>National Fund for Women</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    @media only screen and (max-width: 480px) {
      .email-outer { padding: 0 !important; }
      .email-container { width: 100% !important; background-color: #EBEBE8 !important; }
      .logo-img { width: 240px !important; }
      .header-cell { background-color: #EBEBE8 !important; }
      .body-cell { background-color: transparent !important; }
      .footer-cell { background-color: #3E145F !important; padding: 30px 20px 50px 20px !important; }
      .hero-cell { padding: 80px 30px !important; vertical-align: middle !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #FFFFFF; font-family: 'DM Sans', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" class="email-outer">
    <tr>
      <td align="center">
        <!-- Email Container -->
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="border-radius: 50px; overflow: hidden; max-width: 600px;" class="email-container">

          <!-- Header with Logo -->
          <tr>
            <td style="padding: 0; background-color: ${containerBackground};" class="header-cell">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding: 30px 40px 20px 40px;">
                    <img src="${LOGO_URL}" alt="National Fund for Women" width="300" style="display: block; max-width: 100%; height: auto;" class="logo-img" />
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 0; background-color: transparent;" class="body-cell">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                ${sectionsHtml}
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: ${footerBackground}; padding: 30px 40px 40px 40px; text-align: center;" class="footer-cell">
              <p style="font-family: Georgia, 'Times New Roman', serif; font-size: 16px; font-style: italic; font-weight: 400; color: ${whiteColor}; line-height: 1.6; margin: 0 0 20px 0;">
                Together, we're building support women need today and the collective power to shape the future.
              </p>

              <a href="https://www.nationalfundforwomen.org/" target="_blank" style="display: inline-block; background-color: #F8F19A; color: #3E145F; font-family: 'DM Sans', Arial, sans-serif; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; text-decoration: none; padding: 12px 24px; margin: 0 0 15px 0;">
                VISIT WEBSITE
              </a>

              <p style="font-family: Georgia, 'Times New Roman', serif; font-size: 12px; font-style: italic; font-weight: 400; color: ${whiteColor}; margin: 0 0 15px 0;">
                For women. For real life.
              </p>

              ${socialIcons}

              <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 11px; color: #FFFFFF; margin: 20px 0 30px 0; text-align: center;">
                &copy; 2026 National Fund for Women. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
        <!-- End Container -->
      </td>
    </tr>
  </table>
</body>
</html>`;
}