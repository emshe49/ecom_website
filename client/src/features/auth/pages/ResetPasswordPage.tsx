import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { resetPasswordFormSchema, ResetPasswordFormValues } from '../schemas/auth.schemas';
import { authApi } from '../api/auth.api';
import { Lock, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { AxiosError } from 'axios';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [serverError, setServerError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordFormSchema),
    defaultValues: {
      newPassword: '',
      confirmNewPassword: '',
    },
  });

  const onSubmit = async (data: ResetPasswordFormValues) => {
    if (!token) {
      setServerError('Reset token is missing or invalid.');
      return;
    }

    try {
      setServerError(null);
      await authApi.resetPassword(token, data);
      setIsSuccess(true);
    } catch (err: unknown) {
      if (err instanceof AxiosError && err.response?.data?.error?.message) {
        setServerError(err.response.data.error.message);
      } else {
        setServerError('Password reset failed. The token may be expired or invalid.');
      }
    }
  };

  if (!token) {
    return (
      <div className="flex justify-center items-center py-10 px-4">
        <div className="w-full max-w-md space-y-4 bg-slate-900/90 border border-slate-800 p-8 rounded-2xl shadow-2xl text-center">
          <div className="inline-flex p-3 rounded-full bg-rose-950/60 border border-rose-800/60 text-rose-400">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white">Missing Reset Token</h2>
          <p className="text-xs text-slate-400">
            No password reset token was provided in the link. Please request a new reset link.
          </p>
          <div className="pt-2">
            <Link
              to="/forgot-password"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              Request Password Reset
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center py-10 px-4">
      <div className="w-full max-w-md space-y-6 bg-slate-900/90 border border-slate-800 p-8 rounded-2xl shadow-2xl backdrop-blur-sm">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 mb-2">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Set New Password</h2>
          <p className="text-sm text-slate-400">Enter your new secure password</p>
        </div>

        {serverError && (
          <div className="p-3.5 rounded-lg bg-rose-950/60 border border-rose-800/60 flex items-start gap-2.5 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{serverError}</span>
          </div>
        )}

        {isSuccess ? (
          <div className="space-y-4 text-center py-4">
            <div className="inline-flex p-3 rounded-full bg-emerald-950/60 border border-emerald-800/60 text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <p className="text-sm text-emerald-300 font-semibold">
              Password has been successfully reset!
            </p>
            <p className="text-xs text-slate-400">
              You can now log in to your account with your new password.
            </p>
            <div className="pt-2">
              <button
                onClick={() => navigate('/login')}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg shadow-md transition-colors cursor-pointer"
              >
                Go to Sign In
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* New Password */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300" htmlFor="newPassword">
                New Password (min 8 chars, 1 uppercase, 1 lowercase, 1 number)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  {...register('newPassword')}
                  className={`w-full pl-9 pr-3 py-2 bg-slate-950 border ${
                    errors.newPassword ? 'border-rose-500' : 'border-slate-800 focus:border-indigo-500'
                  } rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors`}
                />
              </div>
              {errors.newPassword && (
                <p className="text-xs text-rose-400 mt-1">{errors.newPassword.message}</p>
              )}
            </div>

            {/* Confirm New Password */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300" htmlFor="confirmNewPassword">
                Confirm New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="confirmNewPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  {...register('confirmNewPassword')}
                  className={`w-full pl-9 pr-3 py-2 bg-slate-950 border ${
                    errors.confirmNewPassword ? 'border-rose-500' : 'border-slate-800 focus:border-indigo-500'
                  } rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors`}
                />
              </div>
              {errors.confirmNewPassword && (
                <p className="text-xs text-rose-400 mt-1">{errors.confirmNewPassword.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer mt-3"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Reset Password</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;
