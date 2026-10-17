import { WeddingModel } from "@/modules/weddings/models/wedding.model";
import type { ClientSession } from "mongoose";
import { connectToDatabase } from "@/server/db/mongoose";
import { AppError } from "@/shared/errors/app-error";
import { MemberInvitationModel } from "./models/member-invitation.model";
import { WeddingMembershipModel } from "./models/wedding-membership.model";

const notFound = () => new AppError("NOT_FOUND", "The requested item is no longer available.", 404);

// All membership-removal and invitation-revocation transactions write the same
// wedding document. This serializes authorization and last-admin checks.
async function asAdmin(userId: string, operation: (context: { weddingId: unknown; session: ClientSession }) => Promise<void>) {
  const connection = await connectToDatabase();
  const session = await connection.startSession();
  try {
    await session.withTransaction(async () => {
      const admin = await WeddingMembershipModel.findOne({ userId, role: "ADMIN" }).session(session).exec();
      if (!admin) throw new AppError("FORBIDDEN", "Only a wedding admin can manage members and invitations.", 403);
      const wedding = await WeddingModel.updateOne(
        { _id: admin.weddingId, deletedAt: null },
        { $inc: { membershipRevision: 1 } },
        { session },
      );
      if (wedding.matchedCount !== 1) throw new AppError("FORBIDDEN", "Wedding space is unavailable.", 403);
      await operation({ weddingId: admin.weddingId, session });
    });
  } finally {
    await session.endSession();
  }
}

export async function removeWeddingMember(userId: string, membershipId: string) {
  await asAdmin(userId, async ({ weddingId, session }) => {
    const target = await WeddingMembershipModel.findOne({ _id: membershipId, weddingId }).session(session).exec();
    if (!target) throw notFound();
    if (target.role === "ADMIN") {
      const count = await WeddingMembershipModel.countDocuments({ weddingId, role: "ADMIN" }).session(session).exec();
      if (count <= 1) throw new AppError("LAST_ADMIN", "A wedding must have at least one admin.", 409);
    }
    const result = await WeddingMembershipModel.deleteOne({ _id: membershipId, weddingId }).session(session).exec();
    if (result.deletedCount !== 1) throw notFound();
  });
}

export async function revokeMemberInvitation(userId: string, invitationId: string) {
  await asAdmin(userId, async ({ weddingId, session }) => {
    const result = await MemberInvitationModel.updateOne(
      { _id: invitationId, weddingId, status: "PENDING" },
      { $set: { status: "REVOKED" } },
      { session },
    );
    if (result.modifiedCount !== 1) throw notFound();
  });
}
