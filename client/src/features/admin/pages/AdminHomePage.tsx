import React from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../auth/store/auth.store';
import { usePermissionsQuery, usePermission } from '../../auth/hooks/usePermission';
import { ROLE_LABELS, ROLE_COLORS } from '../types/admin.types';

export const AdminHomePage: React.FC = () => {
  const { user } = useAuthStore();
  const { data: permData, isLoading } = usePermissionsQuery();
  const canManageStaff = usePermission('admin-user:read');

  const roleStyle = user?.role ? ROLE_COLORS[user.role] : ROLE_COLORS.CUSTOMER;
  const roleName = user?.role ? ROLE_LABELS[user.role] : 'Staff';
  const permissions = permData?.permissions || [];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
              Modular Monolith RBAC Foundation
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Welcome back, {user?.firstName}!
            </h1>
            <p className="text-slate-400 mt-2 max-w-xl text-sm leading-relaxed">
              You are signed in with the{' '}
              <span className={`font-semibold ${roleStyle.text}`}>{roleName}</span> role.
              Below is your effective real-time permissions matrix resolved from the server.
            </p>
          </div>

          {canManageStaff && (
            <Link
              to="/admin/users"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/30 transition-all shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Manage Staff Users
            </Link>
          )}
        </div>
      </div>

      {/* Grid: Role Info & Security Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Role Summary Card */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-white mb-1">Active Security Profile</h2>
            <p className="text-xs text-slate-400 mb-4">
              Real-time authorization context evaluated against database state.
            </p>

            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-slate-800/60 text-xs">
                <span className="text-slate-400">Assigned Role</span>
                <span className={`font-semibold px-2 py-0.5 rounded border ${roleStyle.bg} ${roleStyle.text} ${roleStyle.border}`}>
                  {roleName}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-800/60 text-xs">
                <span className="text-slate-400">Account Status</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Active
                </span>
              </div>
              <div className="flex justify-between items-center py-2 text-xs">
                <span className="text-slate-400">Total Assigned Permissions</span>
                <span className="text-slate-200 font-mono font-bold">{permissions.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modular Architecture Status */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 lg:col-span-2">
          <h2 className="text-base font-bold text-white mb-1">System Architecture Health</h2>
          <p className="text-xs text-slate-400 mb-4">
            Unified Single Backend & Single Database Architecture (Modular Monolith).
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <div className="text-indigo-400 font-semibold mb-1">Module 01: Core Architecture</div>
              <div className="text-slate-400 text-[11px]">Express + TypeScript + MongoDB Single Process</div>
            </div>
            <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <div className="text-indigo-400 font-semibold mb-1">Module 02: Authentication</div>
              <div className="text-slate-400 text-[11px]">JWT in Memory + HttpOnly Refresh Sessions</div>
            </div>
            <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <div className="text-indigo-400 font-semibold mb-1">Module 03: Profile & Addresses</div>
              <div className="text-slate-400 text-[11px]">Scoped User Documents & Snapshotting Engine</div>
            </div>
            <div className="p-3.5 rounded-lg bg-slate-950/60 border border-indigo-500/30 bg-indigo-950/10">
              <div className="text-emerald-400 font-semibold mb-1">Module 04: RBAC & Permissions</div>
              <div className="text-slate-300 text-[11px]">7 Canonical Roles + Centralized Permission Catalog</div>
            </div>
          </div>
        </div>
      </div>

      {/* Permissions Matrix */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h2 className="text-lg font-bold text-white">Your Effective Permissions Catalog</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              These permissions dictate which backend API endpoints and actions are currently accessible to your role.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-mono bg-slate-800 text-slate-300 border border-slate-700 self-start sm:self-auto">
            {permissions.length} Active Permissions
          </span>
        </div>

        {isLoading ? (
          <div className="py-12 flex justify-center text-slate-400 text-sm">
            Loading permissions matrix...
          </div>
        ) : permissions.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm bg-slate-950/40 rounded-lg border border-dashed border-slate-800">
            No administrative permissions assigned to your role.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {permissions.map((perm) => {
              const [resource, action] = perm.split(':');
              return (
                <div
                  key={perm}
                  className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 hover:border-indigo-500/40 transition-colors flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block truncate">
                      {resource}
                    </span>
                    <span className="text-xs font-medium text-slate-200 block truncate">
                      {action}
                    </span>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminHomePage;
