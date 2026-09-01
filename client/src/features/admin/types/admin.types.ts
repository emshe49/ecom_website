import { User, UserRole } from '../../auth/types/auth.types';

export type StaffRole =
  | 'ADMIN'
  | 'PRODUCT_MANAGER'
  | 'ORDER_MANAGER'
  | 'INVENTORY_MANAGER'
  | 'CUSTOMER_SUPPORT';

export interface CreateStaffInput {
  firstName: string;
  lastName: string;
  email: string;
  role: StaffRole;
}

export interface UpdateStaffRoleInput {
  role: StaffRole;
}

export interface UpdateStaffStatusInput {
  isActive: boolean;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Administrator',
  PRODUCT_MANAGER: 'Product Manager',
  ORDER_MANAGER: 'Order Manager',
  INVENTORY_MANAGER: 'Inventory Manager',
  CUSTOMER_SUPPORT: 'Customer Support',
  CUSTOMER: 'Customer',
};

export const ROLE_COLORS: Record<UserRole, { bg: string; text: string; border: string }> = {
  SUPER_ADMIN: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' },
  ADMIN: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20' },
  PRODUCT_MANAGER: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20' },
  ORDER_MANAGER: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  INVENTORY_MANAGER: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  CUSTOMER_SUPPORT: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
  CUSTOMER: { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20' },
};

export type StaffUser = User;
