import { Schema, model, models } from "mongoose";

const schema = new Schema({ _id: { type: String, required: true }, count: { type: Number, required: true }, expiresAt: { type: Date, required: true } }, { collection: "rsvp_rate_limits", versionKey: false });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const RsvpRateModel = models.RsvpRate || model("RsvpRate", schema);
