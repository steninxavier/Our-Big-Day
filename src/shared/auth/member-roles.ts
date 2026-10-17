export const MEMBER_ROLES = ["ADMIN", "MANAGER", "EVENT_COORDINATOR"] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];

export function memberRoleLabel(role: string) {
  switch (role) {
    case "ADMIN": return "Admin";
    case "MANAGER": return "Manager";
    case "EVENT_COORDINATOR": return "Event Coordinator";
    default: return "Unknown role";
  }
}
