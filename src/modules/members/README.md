# Wedding members

This module owns memberships and member invitations. Membership is the
authorization boundary between an authenticated user and a wedding tenant.

- `models/wedding-membership.model.ts` implements the V1 one-user-to-one-wedding rule.
- Future invitation schemas, repository, and service remain in this module.
- Only an Admin can manage membership. Every wedding must retain an Admin.
