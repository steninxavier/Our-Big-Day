import { Resend } from "resend";
import { AppError } from "@/shared/errors/app-error";

export function memberInvitationConfiguration() {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const appUrl = process.env.APP_URL;
  if (!key || !from || !appUrl) {
    throw new AppError("CONFIGURATION_ERROR", "Invitation email is not configured. Please contact the administrator.", 503);
  }
  let url: URL;
  try { url = new URL(appUrl); } catch {
    throw new AppError("CONFIGURATION_ERROR", "Invitation email is not configured. Please contact the administrator.", 503);
  }
  if (!(["https:", "http:"].includes(url.protocol)) || url.username || url.password || (url.protocol === "http:" && !["localhost", "127.0.0.1"].includes(url.hostname))) {
    throw new AppError("CONFIGURATION_ERROR", "Invitation email is not configured. Please contact the administrator.", 503);
  }
  return { key, from, origin: url.origin };
}

export async function sendMemberInvitation(email: string, token: string) {
  const { key, from, origin } = memberInvitationConfiguration();
  try {
    const result = await new Resend(key).emails.send({
      from,
      to: email,
      subject: "You are invited to plan together on Our Big Day",
      text: `You have been invited to help manage a wedding on Our Big Day. Open this private link to review and accept your invitation:\n\n${origin}/member-invitations/${token}\n\nThis link expires in seven days.`,
    });
    if (result.error) throw new Error("Email delivery failed");
  } catch {
    throw new AppError("SERVICE_UNAVAILABLE", "We could not send the invitation email. Please try again.", 503);
  }
}
