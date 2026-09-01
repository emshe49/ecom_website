import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { wishlistApi } from '../api/wishlist.api';
import { useAuthStore } from '../../auth/store/auth.store';
import { Wishlist } from '../types/wishlist.types';

export const useWishlist = () => {
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuthStore();
  const isCustomer = isAuthenticated && user?.role === 'CUSTOMER';

  const { data: wishlist, isLoading, error } = useQuery<Wishlist>({
    queryKey: ['wishlist'],
    queryFn: wishlistApi.getWishlist,
    enabled: isCustomer,
    staleTime: 1000 * 60, // 1 minute
  });

  const savedProductIds = new Set(
    wishlist?.items?.map((item) => item.productId) || []
  );

  const isSaved = (productId: string): boolean => {
    return savedProductIds.has(productId);
  };

  const addMutation = useMutation({
    mutationFn: (productId: string) => wishlistApi.addItem(productId),
    onSuccess: (updatedWishlist) => {
      queryClient.setQueryData(['wishlist'], updatedWishlist);
    },
  });

  const removeMutation = useMutation({
    mutationFn: (productId: string) => wishlistApi.removeItem(productId),
    onSuccess: (updatedWishlist) => {
      queryClient.setQueryData(['wishlist'], updatedWishlist);
    },
  });

  const clearMutation = useMutation({
    mutationFn: wishlistApi.clearWishlist,
    onSuccess: (updatedWishlist) => {
      queryClient.setQueryData(['wishlist'], updatedWishlist);
    },
  });

  return {
    wishlist,
    itemCount: wishlist?.itemCount || 0,
    isSaved,
    isLoading,
    error,
    addMutation,
    removeMutation,
    clearMutation,
  };
};
