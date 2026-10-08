import { Schema, Types, model, models } from "mongoose";

export type Wedding = {
  brideName: string;
  groomName: string;
  title?: string;
  description?: string;
  weddingDate: string;
  timeZone: string;
  coverImageObjectKey?: string;
  location?: {
    formattedAddress?: string;
    city?: string;
    state?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
    googlePlaceId?: string;
  };
  website: {
    slug: string;
    theme: "CLASSIC_INDIAN" | "MINIMAL_ELEGANT" | "MODERN_CELEBRATION";
    isPublished: boolean;
    welcomeMessage?: string;
  };
  gallery: {
    tokenHash: string;
    isEnabled: boolean;
    guestUploadsEnabled: boolean;
  };
  livestream: {
    youtubeUrl?: string;
    isEnabled: boolean;
  };
  createdByUserId: Types.ObjectId;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

const locationSchema = new Schema(
  {
    formattedAddress: String,
    city: String,
    state: String,
    country: String,
    latitude: Number,
    longitude: Number,
    googlePlaceId: String,
  },
  { _id: false },
);

const weddingSchema = new Schema<Wedding>(
  {
    brideName: { type: String, required: true, trim: true, maxlength: 120 },
    groomName: { type: String, required: true, trim: true, maxlength: 120 },
    title: { type: String, trim: true, maxlength: 180 },
    description: { type: String, trim: true, maxlength: 2_000 },
    weddingDate: { type: String, required: true },
    timeZone: { type: String, required: true },
    coverImageObjectKey: { type: String },
    location: locationSchema,
    website: {
      slug: { type: String, required: true, unique: true, index: true },
      theme: {
        type: String,
        enum: ["CLASSIC_INDIAN", "MINIMAL_ELEGANT", "MODERN_CELEBRATION"],
        required: true,
      },
      isPublished: { type: Boolean, required: true, default: false },
      welcomeMessage: { type: String, maxlength: 2_000 },
    },
    gallery: {
      tokenHash: { type: String, required: true, select: false },
      isEnabled: { type: Boolean, required: true, default: true },
      guestUploadsEnabled: { type: Boolean, required: true, default: true },
    },
    livestream: {
      youtubeUrl: { type: String },
      isEnabled: { type: Boolean, required: true, default: false },
    },
    createdByUserId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    deletedAt: { type: Date, index: true },
  },
  { collection: "weddings", timestamps: true },
);

weddingSchema.index({ deletedAt: 1, weddingDate: 1 });

export const WeddingModel = models.Wedding || model<Wedding>("Wedding", weddingSchema);
