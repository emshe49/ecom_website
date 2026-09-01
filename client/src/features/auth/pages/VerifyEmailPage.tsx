import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { authApi } from '../api/auth.api';
import { CheckCircle2, AlertCircle, Mail, ArrowRight } from 'lucide-react';
import { AxiosError } from 'axios';

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [isLoading, setIsLoading] = useState(!!token);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [resendEmail, setResendEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setErrorMessage('No verification token provided.');
      return;
    }

    const verify = async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        await authApi.verifyEmail(token);
        setIsSuccess(true);
      } catch (err: unknown) {
        if (err instanceof AxiosError && err.response?.data?.error?.message) {
          setErrorMessage(err.response.data.error.message);
        } else {
          setErrorMessage('Email verification failed. The token may be invalid or expired.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    verify();
  }, [token]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail) return;

    try {
      setIsResending(true);
      setResendMessage(null);
      const res = await authApi.resendVerification(resendEmail);
      setResendMessage(res.message);
    } catch {
      setResendMessage('A verification link has been sent if this email is registered.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex justify-center items-center py-10 px-4">
      <div className="w-full max-w-md space-y-6 bg-slate-900/90 border border-slate-800 p-8 rounded-2xl shadow-2xl text-center">
        {isLoading ? (
          <div className="space-y-4 py-8">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <h2 className="text-xl font-bold text-white">Verifying Email Address...</h2>
            <p className="text-sm text-slate-400">Please wait while we validate your verification token.</p>
          </div>
        ) : isSuccess ? (
          <div className="space-y-4 py-4">
            <div className="inline-flex p-4 rounded-full bg-emerald-950/60 border border-emerald-800/60 text-emerald-400">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-white">Email Verified!</h2>
            <p className="text-sm text-slate-300">
              Your email address has been successfully verified. You now have full access to your account.
            </p>
            <div className="pt-4">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 py-2.5 px-6 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg shadow-md transition-colors"
              >
                <span>Continue to Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="inline-flex p-4 rounded-full bg-rose-950/60 border border-rose-800/60 text-rose-400">
              <AlertCircle className="w-10 h-10" />
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-white">Verification Failed</h2>
              <p className="text-xs text-rose-400">{errorMessage}</p>
            </div>

            {/* Resend Verification Form */}
            <div className="pt-4 border-t border-slate-800 space-y-3 text-left">
              <p className="text-xs font-semibold text-slate-300">Need a new verification link?</p>
              {resendMessage ? (
                <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs">
                  {resendMessage}
                </div>
              ) : (
                <form onSubmit={handleResend} className="space-y-2">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      placeholder="Enter your email"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isResending || !resendEmail}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
                  >
                    {isResending ? 'Sending...' : 'Resend Verification Email'}
                  </button>
                </form>
              )}
            </div>

            <div className="pt-2 text-xs">
              <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">
                Back to Sign In
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyEmailPage;
