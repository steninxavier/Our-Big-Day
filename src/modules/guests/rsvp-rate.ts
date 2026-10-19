import { createHmac } from "node:crypto";
import { AppError } from "@/shared/errors/app-error";
import { RsvpRateModel } from "./models/rsvp-rate.model";

async function consume(key: string, windowMs: number, maximum: number) {
  const now = Date.now();
  const start = Math.floor(now / windowMs) * windowMs;
  const id = `${key}:${start}`;
  const update = () => RsvpRateModel.findOneAndUpdate({ _id: id }, { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(start + windowMs * 2) } }, { returnDocument: "after", upsert: true }).lean().exec();
  let counter;
  try { counter = await update(); } catch (error) {
    if (!(error && typeof error === "object" && "code" in error && error.code === 11000)) throw error;
    counter = await update();
  }
  if (!counter || counter.count > maximum) throw new AppError("RATE_LIMITED", "Too many RSVP attempts. Please try again later.", 429);
}
export async function limitRsvp(token: string) {
  const secret = process.env.MEMBER_INVITATION_SECRET;
  if (!secret || Buffer.byteLength(secret, "utf8") < 32) throw new AppError("CONFIGURATION_ERROR", "RSVP is not configured. Please contact the organizer.", 503);
  const key = createHmac("sha256", secret).update("guest-rsvp:").update(token).digest("hex");
  await consume(`guest:${key}`, 15 * 60 * 1000, 20);
  await consume("global", 60 * 1000, 300);
}
