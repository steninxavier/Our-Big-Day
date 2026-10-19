import { randomUUID } from "node:crypto";
import { Types } from "mongoose";
import { WeddingMembershipModel } from "@/modules/members/models/wedding-membership.model";
import { WeddingModel } from "@/modules/weddings/models/wedding.model";
import { connectToDatabase } from "@/server/db/mongoose";
import { guestEmailConfiguration, sendGuestInvitationEmail } from "@/server/email/guest-invitation";
import { AppError } from "@/shared/errors/app-error";
import { getOrCreateInvitationLink } from "./invitation.service";
import { GuestModel } from "./models/guest.model";

type EmailKind = "invitation" | "reminder";

export async function sendGuestEmail(userId: string, guestId: string, kind: EmailKind) {
  await connectToDatabase();
  const member = await WeddingMembershipModel.findOne({ userId }).lean().exec();
  if (!member || !["ADMIN", "MANAGER"].includes(member.role)) throw new AppError("FORBIDDEN", "Only admins and managers can send guest emails.", 403);
  if (!Types.ObjectId.isValid(guestId)) throw new AppError("NOT_FOUND", "Guest not found.", 404);
  const wedding = await WeddingModel.findOne({ _id: member.weddingId, deletedAt: null }).select("brideName groomName weddingDate").lean().exec();
  if (!wedding) throw new AppError("FORBIDDEN", "Wedding membership is required.", 403);
  const guest = await GuestModel.findOne({ _id: guestId, weddingId: member.weddingId }).lean().exec();
  if (!guest) throw new AppError("NOT_FOUND", "Guest not found.", 404);
  if (!guest.email) throw new AppError("VALIDATION_ERROR", "Add an email address for this guest before sending.", 400);
  if (kind === "reminder" && guest.rsvpStatus !== "PENDING") throw new AppError("CONFLICT", "Reminders can only be sent while the RSVP is pending.", 409);
  guestEmailConfiguration();

  const lockId = randomUUID();
  const now = new Date();
  const claimed = await GuestModel.findOneAndUpdate(
    { _id: guestId, weddingId: member.weddingId, email: guest.email, ...(kind === "reminder" ? { rsvpStatus: "PENDING" } : {}), $or: [{ emailSendLockExpiresAt: null }, { emailSendLockExpiresAt: { $lte: now } }] },
    { $set: { emailSendLockId: lockId, emailSendLockExpiresAt: new Date(now.getTime() + 120_000) } },
    { returnDocument: "after" },
  ).lean().exec();
  if (!claimed) throw new AppError("CONFLICT", "The guest changed or another email is being sent. Refresh and try again.", 409);

  let accepted = false;
  try {
    const link = await getOrCreateInvitationLink(userId, guestId);
    if (link.localOnly) throw new AppError("CONFIGURATION_ERROR", "Guest emails require a publicly accessible HTTPS APP_URL. Please contact the administrator.", 503);
    await sendGuestInvitationEmail({ email: claimed.email, guestName: claimed.name, brideName: wedding.brideName, groomName: wedding.groomName, weddingDate: wedding.weddingDate, url: link.url, kind });
    accepted = true;
    const sentAt = new Date();
    const result = await GuestModel.updateOne(
      { _id: guestId, weddingId: member.weddingId, email: claimed.email, emailSendLockId: lockId },
      { $set: kind === "invitation" ? { invitationSentAt: sentAt } : { lastReminderSentAt: sentAt }, ...(kind === "reminder" ? { $inc: { reminderCount: 1 } } : {}), $unset: { emailSendLockId: "", emailSendLockExpiresAt: "" } },
    ).exec();
    if (!result.matchedCount) throw new Error("The guest email state could not be saved.");
    return { acceptedAt: sentAt.toISOString() };
  } catch (error) {
    if (accepted) throw new AppError("SERVICE_UNAVAILABLE", "The provider accepted the email, but its status could not be saved. Check with the guest before retrying.", 503);
    throw error;
  } finally {
    try { await GuestModel.updateOne({ _id: guestId, weddingId: member.weddingId, emailSendLockId: lockId }, { $unset: { emailSendLockId: "", emailSendLockExpiresAt: "" } }).exec(); } catch { /* The lock expires automatically. */ }
  }
}
