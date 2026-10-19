import { Resend } from "resend";
import { memberInvitationConfiguration } from "./member-invitation";
import { AppError } from "@/shared/errors/app-error";

type GuestEmail = {
  email: string;
  guestName: string;
  brideName: string;
  groomName: string;
  weddingDate: string;
  url: string;
  kind: "invitation" | "reminder";
};

export function guestEmailConfiguration() {
  const config = memberInvitationConfiguration();
  const origin = new URL(config.origin);
  if (origin.protocol !== "https:" || origin.hostname === "localhost" || origin.hostname.endsWith(".localhost") || origin.hostname.endsWith(".local") || /^[\d.:\[\]]+$/.test(origin.hostname)) {
    throw new AppError("CONFIGURATION_ERROR", "Guest emails require a publicly accessible HTTPS APP_URL. Please contact the administrator.", 503);
  }
  return config;
}

export async function sendGuestInvitationEmail(input: GuestEmail) {
  const { key, from } = guestEmailConfiguration();
  const names = `${input.brideName} & ${input.groomName}`.replace(/[\r\n]+/g, " ");
  const date = new Intl.DateTimeFormat("en", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${input.weddingDate}T12:00:00Z`));
  const intro = input.kind === "reminder"
    ? `A friendly reminder to let ${names} know whether you can join their wedding celebration on ${date}.`
    : `${names} warmly invite you to celebrate their wedding on ${date}.`;
  let result;
  try {
    result = await new Resend(key).emails.send({
      from,
      to: input.email,
      subject: input.kind === "reminder" ? `RSVP reminder for ${names}'s wedding` : `Your invitation to ${names}'s wedding`,
      text: `Hello ${input.guestName},\n\n${intro}\n\nView your private invitation and RSVP:\n${input.url}\n\nPlease keep this link private, as anyone with it can view or change your RSVP.\n\nWith warm wishes,\n${names}\n\nSent via Our Big Day`,
    });
  } catch {
    throw new AppError("SERVICE_UNAVAILABLE", "The email outcome is unknown. It may have been sent; check with the guest before retrying.", 503);
  }
  if (result.error) throw new AppError("SERVICE_UNAVAILABLE", "The email provider did not accept the email. Please try again later.", 503);
}
