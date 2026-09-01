import React, { useState } from 'react';
import { ThumbsUp } from 'lucide-react';
import { reviewsApi } from '../api/reviews.api';
import { useAuthStore } from '../../auth/store/auth.store';

interface HelpfulButtonProps {
  reviewId: string;
  initialCount: number;
  initialIsHelpful: boolean;
  className?: string;
  onRequireAuth?: () => void;
}

export const HelpfulButton: React.FC<HelpfulButtonProps> = ({
  reviewId,
  initialCount,
  initialIsHelpful,
  className = '',
  onRequireAuth,
}) => {
  const { isAuthenticated } = useAuthStore();
  const [count, setCount] = useState(initialCount);
  const [isHelpful, setIsHelpful] = useState(initialIsHelpful);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    if (!isAuthenticated) {
      if (onRequireAuth) {
        onRequireAuth();
      } else {
        alert('Please sign in to mark reviews as helpful.');
      }
      return;
    }

    if (loading) return;
    setLoading(true);

    // Optimistic update
    const nextState = !isHelpful;
    const nextCount = nextState ? count + 1 : Math.max(0, count - 1);
    setIsHelpful(nextState);
    setCount(nextCount);

    try {
      if (nextState) {
        const res = await reviewsApi.markHelpful(reviewId);
        setCount(res.helpfulCount);
        setIsHelpful(res.isHelpfulByUser);
      } else {
        const res = await reviewsApi.removeHelpful(reviewId);
        setCount(res.helpfulCount);
        setIsHelpful(res.isHelpfulByUser);
      }
    } catch (err: any) {
      // Revert on error
      setIsHelpful(isHelpful);
      setCount(count);
      const errMsg = err?.response?.data?.error?.message || 'Failed to update helpful vote';
      alert(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-200 ${
        isHelpful
          ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800'
          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
      } ${className}`}
      title={isHelpful ? 'Remove helpful vote' : 'Mark as helpful'}
    >
      <ThumbsUp
        className={`w-3.5 h-3.5 transition-transform ${isHelpful ? 'fill-current scale-110' : ''}`}
      />
      <span>Helpful</span>
      {count > 0 && <span className="opacity-80">({count})</span>}
    </button>
  );
};
