const SLACK_WEBHOOK_URL = process.env.SLACK_REFUND_WEBHOOK_URL;

interface GrantApplicationErrorParams {
  userId: string;
  userEmail: string;
  cycleId: string;
  cycleName: string;
  errorMessage: string;
  errorCode?: string;
  stack?: string;
}

export async function notifyGrantApplicationError(
  params: GrantApplicationErrorParams
): Promise<void> {
  const webhookUrl = SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn(
      "[notifyGrantApplicationError] SLACK_REFUND_WEBHOOK_URL not configured, skipping notification"
    );
    return;
  }

  const { userId, userEmail, cycleId, cycleName, errorMessage, errorCode, stack } = params;

  const blocks: {
    type: string;
    text: { type: string; text: string };
  }[] = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `🔴 *Grant Application Error*\n• User: ${userEmail} (${userId})\n• Cycle: ${cycleName} (${cycleId})\n• Error: ${errorMessage}${errorCode ? `\n• Code: ${errorCode}` : ""}\n• Time: ${new Date().toISOString()}\n• Please investigate`,
      },
    },
  ];

  if (stack) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Stack:*\n\`\`\`${stack.substring(0, 500)}\`\`\``,
      },
    });
  }

  const message = {
    text: "🔴 Grant Application Error",
    blocks,
  };

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      console.error(
        "[notifyGrantApplicationError] Failed to send Slack notification:",
        response.statusText
      );
    }
  } catch (err) {
    console.error(
      "[notifyGrantApplicationError] Error sending Slack notification:",
      err
    );
  }
}
