import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuthStore } from '../../auth/store/auth.store';
import { adminUsersApi } from '../api/admin-users.api';
import {
  StaffUser,
  StaffRole,
  ROLE_LABELS,
  ROLE_COLORS,
} from '../types/admin.types';
import {
  createStaffSchema,
  CreateStaffFormValues,
  updateStaffRoleSchema,
  UpdateStaffRoleFormValues,
} from '../schemas/admin.schemas';

const STAFF_ROLE_OPTIONS: { value: StaffRole; label: string }[] = [
  { value: 'ADMIN', label: 'Administrator (Operational Management)' },
  { value: 'PRODUCT_MANAGER', label: 'Product Manager (Catalog & Products)' },
  { value: 'ORDER_MANAGER', label: 'Order Manager (Orders & Fulfillment)' },
  { value: 'INVENTORY_MANAGER', label: 'Inventory Manager (Stock Adjustments)' },
  { value: 'CUSTOMER_SUPPORT', label: 'Customer Support (Tickets & Service)' },
];

export const StaffUsersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffUser | null>(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Query staff users
  const { data: staffUsers = [], isLoading, error } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: adminUsersApi.listStaff,
  });

  // Create staff mutation
  const createMutation = useMutation({
    mutationFn: adminUsersApi.createStaff,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setIsCreateOpen(false);
      resetCreate();
    },
  });

  // Update role mutation
  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: StaffRole }) =>
      adminUsersApi.updateStaffRole(userId, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setIsRoleModalOpen(false);
      setSelectedStaff(null);
    },
  });

  // Toggle status mutation
  const statusMutation = useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      adminUsersApi.updateStaffStatus(userId, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });

  // Form for creation
  const {
    register: registerCreate,
    handleSubmit: handleCreateSubmit,
    reset: resetCreate,
    formState: { errors: createErrors },
  } = useForm<CreateStaffFormValues>({
    resolver: zodResolver(createStaffSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      role: 'PRODUCT_MANAGER',
    },
  });

  // Form for role change
  const {
    register: registerRole,
    handleSubmit: handleRoleSubmit,
    setValue: setRoleValue,
    formState: { errors: roleErrors },
  } = useForm<UpdateStaffRoleFormValues>({
    resolver: zodResolver(updateStaffRoleSchema),
  });

  const openRoleModal = (staff: StaffUser) => {
    setSelectedStaff(staff);
    if (staff.role !== 'SUPER_ADMIN' && staff.role !== 'CUSTOMER') {
      setRoleValue('role', staff.role as StaffRole);
    }
    setIsRoleModalOpen(true);
  };

  const filteredStaff = staffUsers.filter((u) => {
    const matchesSearch =
      u.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Staff User Management</h1>
          <p className="text-sm text-slate-400 mt-1">
            Provision, manage roles, and monitor administrative accounts across your organization.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/30 transition-all self-start sm:self-auto"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          Create Staff Account
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg
            className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search staff by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-900/70 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          aria-label="Filter by role"
          className="px-3 py-2 bg-slate-900/70 border border-slate-800 rounded-lg text-sm text-slate-300 focus:outline-none focus:border-indigo-500 transition-colors"
        >
          <option value="ALL">All Roles</option>
          <option value="SUPER_ADMIN">Super Admin</option>
          <option value="ADMIN">Administrator</option>
          <option value="PRODUCT_MANAGER">Product Manager</option>
          <option value="ORDER_MANAGER">Order Manager</option>
          <option value="INVENTORY_MANAGER">Inventory Manager</option>
          <option value="CUSTOMER_SUPPORT">Customer Support</option>
        </select>
      </div>

      {/* Staff Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            Loading administrative accounts...
          </div>
        ) : error ? (
          <div className="py-16 text-center text-rose-400 text-sm">
            Failed to load staff users.
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            No staff accounts found matching your filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs uppercase font-semibold text-slate-400 bg-slate-950/60 border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">User</th>
                  <th className="py-3.5 px-4">Email</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Created Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredStaff.map((staff) => {
                  const roleStyle = ROLE_COLORS[staff.role];
                  const roleLabel = ROLE_LABELS[staff.role];
                  const isSelf = staff.id === currentUser?.id;

                  return (
                    <tr key={staff.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-medium text-white">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-slate-300">
                            {staff.firstName[0]}
                          </div>
                          <span>
                            {staff.firstName} {staff.lastName}
                            {isSelf && (
                              <span className="ml-2 text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/30">
                                You
                              </span>
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-mono text-xs">{staff.email}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${roleStyle.bg} ${roleStyle.text} ${roleStyle.border}`}
                        >
                          {roleLabel}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {staff.isActive ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs text-rose-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span> Disabled
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-400">
                        {new Date(staff.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          {staff.role !== 'SUPER_ADMIN' && !isSelf ? (
                            <>
                              <button
                                type="button"
                                onClick={() => openRoleModal(staff)}
                                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                              >
                                Change Role
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  statusMutation.mutate({
                                    userId: staff.id,
                                    isActive: !staff.isActive,
                                  })
                                }
                                disabled={statusMutation.isPending}
                                className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${
                                  staff.isActive
                                    ? 'bg-rose-500/10 text-rose-300 border-rose-500/30 hover:bg-rose-500/20'
                                    : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                                }`}
                              >
                                {staff.isActive ? 'Disable' : 'Enable'}
                              </button>
                            </>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Protected</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Staff Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Create Staff Account</h2>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleCreateSubmit((data) => createMutation.mutate(data))}
              className="space-y-4"
            >
              {createMutation.isError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-xs">
                  {createMutation.error instanceof Error
                    ? createMutation.error.message
                    : 'Failed to create staff account'}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    {...registerCreate('firstName')}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                  {createErrors.firstName && (
                    <p className="text-xs text-rose-400 mt-1">{createErrors.firstName.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Last Name</label>
                  <input
                    type="text"
                    {...registerCreate('lastName')}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                  {createErrors.lastName && (
                    <p className="text-xs text-rose-400 mt-1">{createErrors.lastName.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  {...registerCreate('email')}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                />
                {createErrors.email && (
                  <p className="text-xs text-rose-400 mt-1">{createErrors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Assigned Staff Role
                </label>
                <select
                  {...registerCreate('role')}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  {STAFF_ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {createErrors.role && (
                  <p className="text-xs text-rose-400 mt-1">{createErrors.role.message}</p>
                )}
              </div>

              <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs leading-relaxed">
                An account setup and password configuration link will automatically be dispatched to this email address.
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-xs font-medium rounded-lg text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Provisioning...' : 'Provision Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Role Modal */}
      {isRoleModalOpen && selectedStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Update Staff Role</h2>
              <button
                type="button"
                onClick={() => setIsRoleModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Modifying the role for{' '}
              <span className="font-semibold text-slate-200">
                {selectedStaff.firstName} {selectedStaff.lastName}
              </span>{' '}
              will immediately invalidate their active refresh sessions to enforce real-time permission boundaries.
            </p>

            <form
              onSubmit={handleRoleSubmit((data) =>
                roleMutation.mutate({ userId: selectedStaff.id, role: data.role })
              )}
              className="space-y-4"
            >
              {roleMutation.isError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-xs">
                  {roleMutation.error instanceof Error
                    ? roleMutation.error.message
                    : 'Failed to update role'}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  New Staff Role
                </label>
                <select
                  {...registerRole('role')}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  {STAFF_ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {roleErrors.role && (
                  <p className="text-xs text-rose-400 mt-1">{roleErrors.role.message}</p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRoleModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium rounded-lg text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={roleMutation.isPending}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50"
                >
                  {roleMutation.isPending ? 'Updating...' : 'Confirm Role Change'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffUsersPage;
