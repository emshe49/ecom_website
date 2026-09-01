import React from 'react';
import { OrderStatus, StatusHistoryEntry } from '../orders.types';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';

interface OrderTimelineProps {
  currentStatus: OrderStatus;
  statusHistory: StatusHistoryEntry[];
}

const LIFECYCLE_STEPS: Array<{ key: OrderStatus; label: string; description: string }> = [
  { key: 'PLACED', label: 'Placed', description: 'Order submitted & items reserved' },
  { key: 'CONFIRMED', label: 'Confirmed', description: 'Order verified & confirmed' },
  { key: 'PROCESSING', label: 'Processing', description: 'Warehouse picking & packing' },
  { key: 'READY_TO_SHIP', label: 'Ready to Ship', description: 'Packed & labeled for dispatch' },
  { key: 'SHIPPED', label: 'Shipped', description: 'Handed over to carrier' },
  { key: 'DELIVERED', label: 'Delivered', description: 'Delivered to recipient' },
];

export const OrderTimeline: React.FC<OrderTimelineProps> = ({
  currentStatus,
  statusHistory,
}) => {
  const isCancelled = currentStatus === 'CANCELLED';

  const historyMap = new Map<string, StatusHistoryEntry>();
  statusHistory.forEach((entry) => historyMap.set(entry.status, entry));

  const getCurrentStepIndex = () => {
    if (isCancelled) return -1;
    return LIFECYCLE_STEPS.findIndex((s) => s.key === currentStatus);
  };

  const currentIndex = getCurrentStepIndex();

  if (isCancelled) {
    const cancelEntry = historyMap.get('CANCELLED');
    return (
      <div className="bg-rose-950/20 border border-rose-800/30 rounded-2xl p-6 text-rose-300">
        <div className="flex items-center space-x-3 mb-2">
          <XCircle className="w-7 h-7 text-rose-400" />
          <h3 className="text-lg font-semibold text-rose-200">Order Cancelled</h3>
        </div>
        <p className="text-sm text-rose-300/80">
          This order was cancelled and inventory stock was immediately restored to warehouse on-hand availability.
        </p>
        {cancelEntry && (
          <div className="mt-3 text-xs text-rose-400/70 border-t border-rose-800/20 pt-2 flex flex-col space-y-1">
            <span>Cancelled at: {new Date(cancelEntry.changedAt).toLocaleString()}</span>
            {cancelEntry.note && <span>Reason: {cancelEntry.note}</span>}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-6">
        Order Progress Tracker
      </h3>

      <div className="relative">
        {/* Desktop / Horizontal Timeline */}
        <div className="hidden md:grid md:grid-cols-6 gap-2 relative">
          {LIFECYCLE_STEPS.map((step, idx) => {
            const isCompleted = idx <= currentIndex;
            const isCurrent = idx === currentIndex;
            const historyItem = historyMap.get(step.key);

            return (
              <div key={step.key} className="flex flex-col items-center text-center relative z-10">
                {/* Connecting line */}
                {idx < LIFECYCLE_STEPS.length - 1 && (
                  <div
                    className={`absolute top-4 left-1/2 w-full h-0.5 -z-10 transition-colors duration-300 ${
                      idx < currentIndex ? 'bg-emerald-500' : 'bg-slate-800'
                    }`}
                  />
                )}

                {/* Node icon */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                    isCompleted
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                      : 'bg-slate-800 border-slate-700 text-slate-500'
                  } ${isCurrent ? 'ring-4 ring-emerald-500/20 animate-pulse' : ''}`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <Clock className="w-4 h-4 text-slate-500" />
                  )}
                </div>

                <div className="mt-3">
                  <p
                    className={`text-xs font-semibold ${
                      isCompleted ? 'text-slate-200' : 'text-slate-500'
                    }`}
                  >
                    {step.label}
                  </p>
                  {historyItem && (
                    <p className="text-[10px] text-slate-400 mt-1">
                      {new Date(historyItem.changedAt).toLocaleTimeString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile / Vertical Timeline */}
        <div className="md:hidden space-y-4">
          {LIFECYCLE_STEPS.map((step, idx) => {
            const isCompleted = idx <= currentIndex;
            const isCurrent = idx === currentIndex;
            const historyItem = historyMap.get(step.key);

            return (
              <div key={step.key} className="flex items-start space-x-3">
                <div
                  className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center border-2 flex-shrink-0 ${
                    isCompleted
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                      : 'bg-slate-800 border-slate-700 text-slate-500'
                  } ${isCurrent ? 'ring-2 ring-emerald-500/30' : ''}`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Clock className="w-3 h-3 text-slate-500" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-baseline">
                    <p
                      className={`text-sm font-medium ${
                        isCompleted ? 'text-slate-200' : 'text-slate-500'
                      }`}
                    >
                      {step.label}
                    </p>
                    {historyItem && (
                      <span className="text-xs text-slate-400">
                        {new Date(historyItem.changedAt).toLocaleTimeString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

