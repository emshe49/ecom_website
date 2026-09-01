import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/auth.store';
import { authApi } from '../api/auth.api';
import { UserRole } from '../types/auth.types';

export const usePermissionsQuery = () => {
  const { isAuthenticated, setPermissions } = useAuthStore();

  const query = useQuery({
    queryKey: ['auth', 'permissions'],
    queryFn: authApi.getPermissions,
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (query.data?.permissions) {
      setPermissions(query.data.permissions);
    }
  }, [query.data, setPermissions]);

  return query;
};

export const usePermission = (permission: string): boolean => {
  const { user, permissions } = useAuthStore();
  const { data } = usePermissionsQuery();

  if (!user) return false;
  if (user.role === 'SUPER_ADMIN') return true;

  const currentPermissions = permissions.length > 0 ? permissions : data?.permissions || [];
  return currentPermissions.includes(permission);
};

export const useHasRole = (...roles: UserRole[]): boolean => {
  const { user } = useAuthStore();
  if (!user) return false;
  return roles.includes(user.role);
};

export const useCanAccessAdmin = (): boolean => {
  const { user } = useAuthStore();
  if (!user) return false;
  return user.role !== 'CUSTOMER';
};
