import mongoose from "mongoose";

import { AppError } from "@/shared/errors/app-error";

type MongooseCache = {
  connection: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalForMongoose = globalThis as typeof globalThis & {
  mongooseCache?: MongooseCache;
};

const cache: MongooseCache = globalForMongoose.mongooseCache ?? {
  connection: null,
  promise: null,
};

globalForMongoose.mongooseCache = cache;

export async function connectToDatabase() {
  if (cache.connection) {
    return cache.connection;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new AppError("CONFIGURATION_ERROR", "The database connection is not configured.", 500);
  }

  if (!cache.promise) {
    cache.promise = mongoose
      .connect(uri, { serverSelectionTimeoutMS: 10_000 })
      .then((connection) => {
        cache.connection = connection;
        return connection;
      })
      .catch((error: unknown) => {
        // Do not retain a rejected promise: Atlas/network access can recover
        // without requiring a Next.js server restart.
        cache.connection = null;
        cache.promise = null;
        throw error;
      });
  }

  try {
    return await cache.promise;
  } catch (error) {
    // This also clears a rejected promise created by an earlier hot-reloaded
    // module version, before the catch above existed.
    cache.connection = null;
    cache.promise = null;

    if (isDatabaseUnavailableError(error)) {
      throw new AppError(
        "SERVICE_UNAVAILABLE",
        "The database is temporarily unavailable. Please try again shortly.",
        503,
      );
    }

    throw error;
  }
}

function isDatabaseUnavailableError(error: unknown) {
  return error instanceof mongoose.Error.MongooseServerSelectionError;
}
