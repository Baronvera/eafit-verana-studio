import { UserRole } from './enums';

export interface User {
  id: string;
  email: string;
  createdAt: Date;
}

export interface Organization {
  id: string;
  name: string;
  country: string;
  registryId?: string;
  logoUrl?: string;
  userId: string;
}

export interface OrgMember {
  userId: string;
  orgId: string;
  role: UserRole;
}
