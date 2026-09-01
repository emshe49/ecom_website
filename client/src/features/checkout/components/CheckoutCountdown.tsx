import React, { useState, useEffect, useCallback } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

interface CheckoutCountdownProps {
  expiresAt: string;
  onExpired: () => void;
}

export const CheckoutCountdown: React.FC<CheckoutCountdownProps> = ({
  expiresAt,
  onExpired,
}) => {
  const calculateRemaining = useCallback((): number => {
    const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
    return Math.max(0, diff);
  }, [expiresAt]);

  const [remainingSeconds, setRemainingSeconds] = useState<number>(calculateRemaining);

  useEffect(() => {
    setRemainingSeconds(calculateRemaining());

    const interval = setInterval(() => {
      const remaining = calculateRemaining();
      setRemainingSeconds(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        onExpired();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [calculateRemaining, onExpired]);


  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const isCritical = remainingSeconds <= 60;
  const isWarning = remainingSeconds <= 300 && remainingSeconds > 60;

  return (
    <div
      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
        isCritical
          ? 'bg-rose-950/60 border-rose-600/50 text-rose-300 animate-pulse'
          : isWarning
          ? 'bg-amber-950/60 border-amber-600/50 text-amber-300'
          : 'bg-indigo-950/60 border-indigo-500/40 text-indigo-300'
      }`}
    >
      {isCritical ? (
        <AlertTriangle className="w-3.5 h-3.5 text-rose-400 animate-bounce" />
      ) : (
        <Clock className="w-3.5 h-3.5 text-indigo-400" />
      )}
      <span>Inventory Reserved for:</span>
      <span className="font-mono text-sm font-bold tracking-wider">{formattedTime}</span>
    </div>
  );
};
