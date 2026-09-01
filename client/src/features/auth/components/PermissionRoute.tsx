import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { usePermissionsQuery } from '../hooks/usePermission';
import { UserRole } from '../types/auth.types';

interface PermissionRouteProps {
  permission?: string;
  anyPermissions?: string[];
  roles?: UserRole[];
  requireAdminAccess?: boolean;
}

export const PermissionRoute: React.FC<PermissionRouteProps> = ({
  permission,
  anyPermissions,
  roles,
  requireAdminAccess = false,
}) => {
  const { user, isAuthenticated, isInitialized, permissions } = useAuthStore();
  const { isLoading } = usePermissionsQuery();
  const location = useLocation();

  if (!isInitialized || (isAuthenticated && isLoading && permissions.length === 0)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-slate-400 font-medium tracking-wide">
            Verifying permissions...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Admin access check: CUSTOMER cannot access admin area
  if (requireAdminAccess && user.role === 'CUSTOMER') {
    return <Navigate to="/" replace />;
  }

  // SUPER_ADMIN has master override
  if (user.role === 'SUPER_ADMIN') {
    return <Outlet />;
  }

  // Check specific roles if provided
  if (roles && roles.length > 0) {
    if (!roles.includes(user.role)) {
      return <Navigate to="/admin" replace />;
    }
  }

  // Check single permission
  if (permission && !permissions.includes(permission)) {
    return <Navigate to="/admin" replace />;
  }

  // Check any permissions
  if (
    anyPermissions &&
    anyPermissions.length > 0 &&
    !anyPermissions.some((p) => permissions.includes(p))
  ) {
    return <Navigate to="/admin" replace />;
  }

  return <Outlet />;
};

export default PermissionRoute;
