import { Resend } from "resend";

const FROM =
  process.env.RESEND_FROM_EMAIL || "NFW <noreply@nationalfundforwomen.org>";

function getResend() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  return new Resend(process.env.RESEND_API_KEY);
}

export async function sendGrantStatusEmail({
  to,
  name,
  status,
  grantCycleName,
  amountApproved,
}: {
  to: string;
  name: string;
  status: string;
  grantCycleName: string;
  amountApproved?: number;
}) {
  const subjects: Record<string, string> = {
    in_review: "Your NFW grant application is being reviewed",
    approved: "🎉 Your NFW grant application has been approved!",
    not_approved: "Update on your NFW grant application",
    payment_pending: "Your NFW grant payment is being processed",
    payment_sent: "💰 Your NFW grant payment has been sent!",
  };

  const bodies: Record<string, string> = {
    in_review: `Hi ${name},\n\nGreat news — your application for the ${grantCycleName} is now being reviewed by our team. We'll be in touch soon with a decision.\n\nThank you for applying.\n\nWith love,\nThe NFW Team`,
    approved: `Hi ${name},\n\nWe're thrilled to let you know that your application for the ${grantCycleName} has been approved${amountApproved ? ` for $${amountApproved.toLocaleString()}` : ""}!\n\nPlease log in to your dashboard to connect your bank account so we can send your funds.\n\nWith love,\nThe NFW Team`,
    not_approved: `Hi ${name},\n\nThank you for applying to the ${grantCycleName}. After careful review, we were unable to approve your application at this time.\n\nWe encourage you to apply again in a future cycle. We're rooting for you.\n\nWith love,\nThe NFW Team`,
    payment_pending: `Hi ${name},\n\nYour grant payment of${amountApproved ? ` $${amountApproved.toLocaleString()}` : ""} is being processed and will arrive in your bank account within 1-3 business days.\n\nWith love,\nThe NFW Team`,
    payment_sent: `Hi ${name},\n\nYour grant payment of${amountApproved ? ` $${amountApproved.toLocaleString()}` : ""} has been sent! Please allow 1-3 business days for it to appear in your account.\n\nThank you for being part of NFW.\n\nWith love,\nThe NFW Team`,
  };

  const subject = subjects[status];
  const text = bodies[status];

  if (!subject || !text) return; // Don't send for 'submitted' status

  try {
    const resend = getResend();
    await resend.emails.send({
      from: FROM,
      to,
      subject,
      text,
    });
  } catch (err) {
    console.error("Failed to send email:", err);
  }
}

export async function sendBankInfoRequestEmail({
  to,
  name,
  grantCycleName,
  amountApproved,
  isNominee,
}: {
  to: string;
  name: string;
  grantCycleName: string;
  amountApproved?: number;
  isNominee: boolean;
}) {
  const subject = "Action Required: Connect Your Bank Account for Your NFW Grant";

  const nomineeIntro = isNominee
    ? `You've been nominated for the ${grantCycleName} and your nomination has been approved${amountApproved ? ` for $${amountApproved.toLocaleString()}` : ""}!`
    : `Great news — your application for the ${grantCycleName} has been approved${amountApproved ? ` for $${amountApproved.toLocaleString()}` : ""}!`;

  const text = `${name},\n\n${nomineeIntro}\n\nTo receive your grant funds, please click the link below to securely connect your bank account. This only takes a few minutes.\n\nIf you don't already have an NFW account, you'll be prompted to create one before connecting your bank info.\n\nLink: ${process.env.NEXT_PUBLIC_SITE_URL || "https://nationalfundforwomen.org"}/grants/my-applications\n\nIf you have any questions, please reply to this email.\n\nWith love,\nThe NFW Team`;

  try {
    const resend = getResend();
    await resend.emails.send({
      from: FROM,
      to,
      subject,
      text,
    });
  } catch (err) {
    console.error("Failed to send bank info request email:", err);
  }
}

export async function sendGiftCodesEmail({
  to,
  buyerName,
  codes,
}: {
  to: string;
  buyerName: string;
  codes: string[];
}) {
  const codesList = codes.map((code) => `  • ${code}`).join("\n");

  const text = `${buyerName},

Thank you for your gift membership purchase! Here are your gift code(s):

${codesList}

Share these codes with your friends. Each code redeems 1 year of Contributing membership ($15 value).

How to redeem:
1. Friend creates a free NFW account at https://nationalfundforwomen.org/auth/sign-up
2. During signup, they enter their code on the membership step
3. They enjoy a full year of Contributing membership!

Note: Each code can only be used once. If your friend already has an account, they can enter the code in their dashboard.

Thank you for supporting National Fund for Women!

With love,
The NFW Team`;

  try {
    const resend = getResend();
    await resend.emails.send({
      from: FROM,
      to,
      subject: "Your NFW Gift Membership Code(s)",
      text,
    });
  } catch (err) {
    console.error("Failed to send gift codes email:", err);
  }
}

export async function sendContactFormEmail({
  name,
  email,
  subject,
  message,
}: {
  name: string;
  email: string;
  subject: string;
  message: string;
}) {
  const timestamp = new Date().toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const text = `New contact form submission

Name: ${name}
Email: ${email}
Subject: ${subject}
Message: ${message}

Submitted: ${timestamp}
`;

  try {
    const resend = getResend();
    await resend.emails.send({
      from: "NFW <info@nationalfundforwomen.org>",
      to: "ronpassaro@gmail.com",
      subject: "NFW Contact Form Submission",
      text,
    });
  } catch (err) {
    console.error("Failed to send contact form email:", err);
  }
}
