import { Schema, Types, model, models } from "mongoose";
import { vendorCategories } from "../schemas";

export type WeddingVendor = {
  weddingId: Types.ObjectId; name: string; category: typeof vendorCategories[number]; contactPerson: string; phone: string; email: string;
  address: string; website: string; totalAgreedCostPaise: number | null; eventIds: Types.ObjectId[]; notes: string;
  source: "MANUAL" | "GOOGLE_PLACES"; googlePlaceId: string | null; archivedAt: Date | null; revision: number; createdAt: Date; updatedAt: Date;
};

const schema = new Schema<WeddingVendor>({
  weddingId: { type: Schema.Types.ObjectId, required: true }, name: { type: String, required: true, maxlength: 160 },
  category: { type: String, enum: vendorCategories, required: true }, contactPerson: { type: String, default: "", maxlength: 120 },
  phone: { type: String, default: "", maxlength: 40 }, email: { type: String, default: "", maxlength: 254 },
  address: { type: String, default: "", maxlength: 500 }, website: { type: String, default: "", maxlength: 2048 },
  totalAgreedCostPaise: { type: Number, default: null, min: 0, max: 100000000000, validate: (value: number | null) => value === null || Number.isSafeInteger(value) },
  eventIds: [{ type: Schema.Types.ObjectId }], notes: { type: String, default: "", maxlength: 2000 },
  source: { type: String, enum: ["MANUAL", "GOOGLE_PLACES"], default: "MANUAL" }, googlePlaceId: { type: String, default: null },
  archivedAt: { type: Date, default: null }, revision: { type: Number, default: 0, min: 0 },
}, { collection: "vendors", timestamps: true });

schema.index({ weddingId: 1, category: 1 });
schema.index({ weddingId: 1, archivedAt: 1 });
schema.index({ weddingId: 1, googlePlaceId: 1 }, { partialFilterExpression: { googlePlaceId: { $type: "string" } } });

export const VendorModel = models.Vendor || model<WeddingVendor>("Vendor", schema);
