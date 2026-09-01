import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { profileFormSchema, ProfileFormValues } from '../schemas/account.schemas';
import { userApi } from '../api/user.api';
import { User } from '../types/account.types';
import { useAuthStore } from '../../auth/store/auth.store';
import { User as UserIcon, Phone, Image, CheckCircle2, AlertCircle } from 'lucide-react';
import { AxiosError } from 'axios';

interface ProfileFormProps {
  user: User;
}

export const ProfileForm: React.FC<ProfileFormProps> = ({ user }) => {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      phone: user.phone || '',
      avatarUrl: user.avatarUrl || '',
    },
  });

  const mutation = useMutation({
    mutationFn: (data: ProfileFormValues) => {
      return userApi.updateProfile({
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone ? data.phone.trim() : null,
        avatarUrl: data.avatarUrl ? data.avatarUrl.trim() : null,
      });
    },
    onSuccess: (updatedUser) => {
      setErrorMessage(null);
      setSuccessMessage('Profile updated successfully!');
      setUser(updatedUser);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (err: unknown) => {
      setSuccessMessage(null);
      if (err instanceof AxiosError && err.response?.data?.error?.message) {
        setErrorMessage(err.response.data.error.message);
      } else {
        setErrorMessage('Failed to update profile. Please try again.');
      }
    },
  });

  const onSubmit = (data: ProfileFormValues) => {
    mutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      {successMessage && (
        <div className="p-3.5 rounded-lg bg-emerald-950/60 border border-emerald-800/60 flex items-start gap-2.5 text-emerald-300 text-xs animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-lg bg-rose-950/60 border border-rose-800/60 flex items-start gap-2.5 text-rose-300 text-xs animate-fadeIn">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300" htmlFor="firstName">
              First Name *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <UserIcon className="w-4 h-4" />
              </div>
              <input
                id="firstName"
                type="text"
                {...register('firstName')}
                className={`w-full pl-9 pr-3 py-2 bg-slate-950 border ${
                  errors.firstName ? 'border-rose-500' : 'border-slate-800 focus:border-indigo-500'
                } rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors`}
              />
            </div>
            {errors.firstName && <p className="text-xs text-rose-400">{errors.firstName.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300" htmlFor="lastName">
              Last Name *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <UserIcon className="w-4 h-4" />
              </div>
              <input
                id="lastName"
                type="text"
                {...register('lastName')}
                className={`w-full pl-9 pr-3 py-2 bg-slate-950 border ${
                  errors.lastName ? 'border-rose-500' : 'border-slate-800 focus:border-indigo-500'
                } rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors`}
              />
            </div>
            {errors.lastName && <p className="text-xs text-rose-400">{errors.lastName.message}</p>}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-slate-300" htmlFor="phone">
            Phone Number (International format e.g. +923001234567)
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
              <Phone className="w-4 h-4" />
            </div>
            <input
              id="phone"
              type="text"
              placeholder="+923001234567"
              {...register('phone')}
              className={`w-full pl-9 pr-3 py-2 bg-slate-950 border ${
                errors.phone ? 'border-rose-500' : 'border-slate-800 focus:border-indigo-500'
              } rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors`}
            />
          </div>
          {errors.phone && <p className="text-xs text-rose-400">{errors.phone.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-slate-300" htmlFor="avatarUrl">
            Avatar Image URL
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
              <Image className="w-4 h-4" />
            </div>
            <input
              id="avatarUrl"
              type="url"
              placeholder="https://example.com/avatar.jpg"
              {...register('avatarUrl')}
              className={`w-full pl-9 pr-3 py-2 bg-slate-950 border ${
                errors.avatarUrl ? 'border-rose-500' : 'border-slate-800 focus:border-indigo-500'
              } rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors`}
            />
          </div>
          {errors.avatarUrl && <p className="text-xs text-rose-400">{errors.avatarUrl.message}</p>}
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {mutation.isPending ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Saving Changes...</span>
              </>
            ) : (
              <span>Save Profile Changes</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
