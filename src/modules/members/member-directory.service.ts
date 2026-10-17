import { UserModel } from "@/modules/auth/models/user.model";
import { WeddingModel } from "@/modules/weddings/models/wedding.model";
import { connectToDatabase } from "@/server/db/mongoose";
import { AppError } from "@/shared/errors/app-error";
import { MemberInvitationModel } from "./models/member-invitation.model";
import { WeddingMembershipModel } from "./models/wedding-membership.model";

async function membershipFor(userId: string) {
  await connectToDatabase();
  const membership = await WeddingMembershipModel.findOne({ userId }).lean().exec();
  if (!membership || !(await WeddingModel.exists({ _id: membership.weddingId, deletedAt: null }))) throw new AppError("FORBIDDEN", "Wedding membership is required.", 403);
  return membership;
}

export async function listWeddingMembers(userId: string) {
  const membership = await membershipFor(userId);
  if (membership.role !== "ADMIN" && membership.role !== "MANAGER") throw new AppError("FORBIDDEN", "Only wedding admins and managers can view members.", 403);
  const records = await WeddingMembershipModel.find({ weddingId: membership.weddingId }).lean().exec();
  const users = await UserModel.find({ _id: { $in: records.map((record: { userId: unknown }) => record.userId) } }).select("name email").lean().exec();
  const usersById = new Map<string, { name: string; email: string }>(users.map((user: { _id: { toString(): string }; name: string; email: string }) => [user._id.toString(), { name: user.name, email: user.email }]));
  return records.flatMap((record: { _id: { toString(): string }; userId: { toString(): string }; role: string; joinedAt: Date }) => {
    const id = record.userId.toString();
    const user = usersById.get(id);
    return user ? [{ membershipId: record._id.toString(), user: { id, ...user }, role: record.role, joinedAt: record.joinedAt.toISOString() }] : [];
  }).sort((a: { user: { id: string }; role: string }, b: { user: { id: string }; role: string }) =>
    Number(b.user.id === userId) - Number(a.user.id === userId) || Number(b.role === "ADMIN") - Number(a.role === "ADMIN") || a.user.id.localeCompare(b.user.id));
}

export async function listPendingMemberInvitations(userId: string) {
  const membership = await membershipFor(userId);
  if (membership.role !== "ADMIN") throw new AppError("FORBIDDEN", "Only a wedding admin can view pending invitations.", 403);
  const invitations = await MemberInvitationModel.find({ weddingId: membership.weddingId, status: "PENDING", expiresAt: { $gt: new Date() } })
    .select("emailNormalized role status expiresAt createdAt").sort({ createdAt: -1 }).lean().exec();
  return invitations.map((item: { _id: { toString(): string }; emailNormalized: string; role: string; expiresAt: Date }) => ({
    id: item._id.toString(), email: item.emailNormalized, role: item.role, status: "PENDING" as const, expiresAt: item.expiresAt.toISOString(),
  }));
}
