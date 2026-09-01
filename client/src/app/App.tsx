import React, { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/query-client';
import { router } from '../routes';
import { useAuthStore } from '../features/auth/store/auth.store';
import { authApi } from '../features/auth/api/auth.api';

export const App: React.FC = () => {
  const setAuth = useAuthStore((state) => state.setAuth);
  const setInitialized = useAuthStore((state) => state.setInitialized);

  useEffect(() => {
    // Silent auth restoration on initial app mount via HttpOnly refresh cookie
    const initializeAuth = async () => {
      try {
        const result = await authApi.refresh();
        setAuth(result.user, result.accessToken);
      } catch {
        // No active or valid session, proceed as anonymous/guest
        setInitialized(true);
      }
    };

    initializeAuth();
  }, [setAuth, setInitialized]);

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
};

export default App;
