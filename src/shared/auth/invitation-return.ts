export function invitationReturnPath(value: unknown): string | undefined {
  return typeof value === "string" && /^\/member-invitations\/[A-Za-z0-9_-]{43}$/.test(value) ? value : undefined;
}
