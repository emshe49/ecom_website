import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { changePasswordFormSchema, ChangePasswordFormValues } from '../schemas/auth.schemas';
import { authApi } from '../api/auth.api';
import { userApi } from '../../account/api/user.api';
import { useAuthStore } from '../store/auth.store';
import { ProfileForm } from '../../account/components/ProfileForm';
import { SavedAddressesList } from '../../account/components/SavedAddressesList';
import {
  User as UserIcon,
  Key,
  LogOut,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Shield,
  Calendar,
  Mail,
  Phone,
} from 'lucide-react';
import { AxiosError } from 'axios';

type TabType = 'profile' | 'addresses' | 'security';

export const ProfilePage: React.FC = () => {
  const { user: authUser, clearAuth, setUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [changePassSuccess, setChangePassSuccess] = useState<string | null>(null);
  const [changePassError, setChangePassError] = useState<string | null>(null);
  const [isLoggingOutAll, setIsLoggingOutAll] = useState(false);

  // Fetch full profile data via TanStack query
  const { data: profileUser, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const data = await userApi.getProfile();
      setUser(data);
      return data;
    },
    initialData: authUser || undefined,
  });

  const currentUser = profileUser || authUser;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordFormSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    },
  });

  const onChangePassword = async (data: ChangePasswordFormValues) => {
    try {
      setChangePassError(null);
      setChangePassSuccess(null);
      const res = await authApi.changePassword(data);
      setChangePassSuccess(res.message);
      reset();
    } catch (err: unknown) {
      if (err instanceof AxiosError && err.response?.data?.error?.message) {
        setChangePassError(err.response.data.error.message);
      } else {
        setChangePassError('Failed to change password. Please verify current password.');
      }
    }
  };

  const onLogoutAll = async () => {
    try {
      setIsLoggingOutAll(true);
      await authApi.logoutAll();
      clearAuth();
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoggingOutAll(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 border-2 border-indigo-400/40 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-indigo-600/20 overflow-hidden">
            {currentUser?.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{currentUser?.firstName?.[0] || 'U'}</span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white">
                {currentUser?.firstName} {currentUser?.lastName}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-950/80 border border-indigo-800 text-indigo-300 text-[10px] font-mono font-semibold uppercase">
                {currentUser?.role || 'CUSTOMER'}
              </span>
            </div>
            <p className="text-xs text-slate-400">{currentUser?.email}</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>Profile</span>
          </button>
          <button
            onClick={() => setActiveTab('addresses')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'addresses'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Saved Addresses</span>
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'security'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Security</span>
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'profile' && currentUser && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Account Overview Summary Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-5 h-fit">
            <h3 className="text-sm font-semibold text-white">Account Details</h3>

            <div className="space-y-3.5 text-xs">
              <div className="flex items-center gap-2.5 text-slate-300">
                <Mail className="w-4 h-4 text-slate-500 shrink-0" />
                <div className="truncate">
                  <p className="text-slate-500 text-[10px]">Email Address</p>
                  <p className="font-medium truncate text-slate-200">{currentUser.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 text-slate-300">
                <Shield className="w-4 h-4 text-slate-500 shrink-0" />
                <div>
                  <p className="text-slate-500 text-[10px]">Email Verification</p>
                  <p
                    className={`font-semibold ${
                      currentUser.isEmailVerified ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {currentUser.isEmailVerified ? 'Verified' : 'Pending Verification'}
                  </p>
                </div>
              </div>

              {currentUser.phone && (
                <div className="flex items-center gap-2.5 text-slate-300">
                  <Phone className="w-4 h-4 text-slate-500 shrink-0" />
                  <div>
                    <p className="text-slate-500 text-[10px]">Phone Number</p>
                    <p className="font-medium text-slate-200">{currentUser.phone}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2.5 text-slate-300">
                <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
                <div>
                  <p className="text-slate-500 text-[10px]">Member Since</p>
                  <p className="font-medium text-slate-200">
                    {currentUser.createdAt
                      ? new Date(currentUser.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Edit Profile Form */}
          <div className="md:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-6">
            <div>
              <h2 className="text-base font-semibold text-white">Edit Profile Information</h2>
              <p className="text-xs text-slate-400">
                Update your display name, contact phone number, and avatar image
              </p>
            </div>

            {isLoading ? (
              <div className="py-8 text-center">
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              </div>
            ) : (
              <ProfileForm user={currentUser} />
            )}
          </div>
        </div>
      )}

      {activeTab === 'addresses' && <SavedAddressesList />}

      {activeTab === 'security' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Change Password Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-indigo-600/10 border border-indigo-500/20 text-indigo-400">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">Change Password</h2>
                <p className="text-xs text-slate-400">Update your security credentials</p>
              </div>
            </div>

            {changePassSuccess && (
              <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800/60 flex items-start gap-2 text-emerald-300 text-xs">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{changePassSuccess}</span>
              </div>
            )}

            {changePassError && (
              <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800/60 flex items-start gap-2 text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{changePassError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onChangePassword)} className="space-y-3 pt-2">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-300" htmlFor="currentPassword">
                  Current Password
                </label>
                <input
                  id="currentPassword"
                  type="password"
                  placeholder="••••••••"
                  {...register('currentPassword')}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none"
                />
                {errors.currentPassword && (
                  <p className="text-xs text-rose-400">{errors.currentPassword.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-300" htmlFor="newPassword">
                  New Password
                </label>
                <input
                  id="newPassword"
                  type="password"
                  placeholder="••••••••"
                  {...register('newPassword')}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none"
                />
                {errors.newPassword && (
                  <p className="text-xs text-rose-400">{errors.newPassword.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <label
                  className="block text-xs font-medium text-slate-300"
                  htmlFor="confirmNewPassword"
                >
                  Confirm New Password
                </label>
                <input
                  id="confirmNewPassword"
                  type="password"
                  placeholder="••••••••"
                  {...register('confirmNewPassword')}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none"
                />
                {errors.confirmNewPassword && (
                  <p className="text-xs text-rose-400">{errors.confirmNewPassword.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer mt-2"
              >
                {isSubmitting ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>

          {/* Session Security Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4 h-fit">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-indigo-600/10 border border-indigo-500/20 text-indigo-400">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">Active Sessions</h2>
                <p className="text-xs text-slate-400">Device security & remote sign out</p>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              Signing out of all devices will revoke all active sessions across any other web
              browsers or mobile devices.
            </p>

            <div className="pt-2">
              <button
                onClick={onLogoutAll}
                disabled={isLoggingOutAll}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 border border-slate-700 hover:border-rose-800/60 text-slate-300 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>{isLoggingOutAll ? 'Revoking Sessions...' : 'Logout From All Devices'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
