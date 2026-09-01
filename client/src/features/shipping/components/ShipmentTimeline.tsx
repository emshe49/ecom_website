import React from 'react';
import { CheckCircle2, Clock, Truck, Package, Home, AlertCircle, XCircle } from 'lucide-react';
import { SHIPMENT_STATUS, ShipmentStatus, ShipmentStatusHistoryDTO } from '../types/shipping.types';

interface ShipmentTimelineProps {
  currentStatus: ShipmentStatus;
  history?: ShipmentStatusHistoryDTO[];
  shippedAt?: string | null;
  deliveredAt?: string | null;
}

const standardSteps: Array<{
  status: ShipmentStatus;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { status: SHIPMENT_STATUS.PENDING, label: 'Order Placed', icon: Clock },
  { status: SHIPMENT_STATUS.READY_TO_SHIP, label: 'Packed', icon: Package },
  { status: SHIPMENT_STATUS.SHIPPED, label: 'Dispatched', icon: Truck },
  { status: SHIPMENT_STATUS.IN_TRANSIT, label: 'In Transit', icon: Truck },
  { status: SHIPMENT_STATUS.OUT_FOR_DELIVERY, label: 'Out for Delivery', icon: Truck },
  { status: SHIPMENT_STATUS.DELIVERED, label: 'Delivered', icon: Home },
];

export const ShipmentTimeline: React.FC<ShipmentTimelineProps> = ({
  currentStatus,
  history = [],
}) => {
  const isFailed = currentStatus === SHIPMENT_STATUS.FAILED;
  const isCancelled = currentStatus === SHIPMENT_STATUS.CANCELLED;

  const currentStepIndex = standardSteps.findIndex((s) => s.status === currentStatus);

  return (
    <div className="space-y-6">
      {/* Visual Stepper */}
      {!isCancelled && !isFailed ? (
        <div className="relative flex items-center justify-between">
          <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-1 bg-zinc-200 dark:bg-zinc-800 -z-0" />
          <div
            className="absolute top-1/2 left-0 -translate-y-1/2 h-1 bg-indigo-600 dark:bg-indigo-500 transition-all duration-500 -z-0"
            style={{
              width: `${(Math.max(0, currentStepIndex) / (standardSteps.length - 1)) * 100}%`,
            }}
          />

          {standardSteps.map((step, idx) => {
            const isCompleted = currentStepIndex >= idx;
            const isCurrent = currentStepIndex === idx;
            const StepIcon = step.icon;

            return (
              <div key={step.status} className="flex flex-col items-center relative z-10">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-colors duration-300 border-2 ${
                    isCurrent
                      ? 'bg-indigo-600 text-white border-indigo-600 ring-4 ring-indigo-100 dark:ring-indigo-950/60'
                      : isCompleted
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white dark:bg-zinc-900 text-zinc-400 border-zinc-300 dark:border-zinc-700'
                  }`}
                >
                  {isCompleted && !isCurrent ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <StepIcon className="w-4 h-4" />
                  )}
                </div>
                <span
                  className={`text-xs mt-2 font-medium text-center ${
                    isCurrent
                      ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                      : isCompleted
                      ? 'text-zinc-900 dark:text-zinc-200'
                      : 'text-zinc-400 dark:text-zinc-600'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      ) : isFailed ? (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200">
          <AlertCircle className="w-6 h-6 shrink-0 text-rose-600 dark:text-rose-400" />
          <div>
            <h4 className="font-semibold text-sm">Delivery Attempt Failed</h4>
            <p className="text-xs text-rose-600 dark:text-rose-300 mt-0.5">
              The courier was unable to complete the delivery. Our customer support team will contact you.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200">
          <XCircle className="w-6 h-6 shrink-0 text-zinc-500" />
          <div>
            <h4 className="font-semibold text-sm">Shipment Cancelled</h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              This shipment fulfillment was cancelled.
            </p>
          </div>
        </div>
      )}

      {/* Status History Timeline */}
      {history.length > 0 && (
        <div className="mt-6 border-t border-zinc-100 dark:border-zinc-800 pt-5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-4">
            Activity Log
          </h4>
          <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-200 dark:before:bg-zinc-800">
            {history
              .slice()
              .reverse()
              .map((item, i) => (
                <div key={i} className="relative group">
                  <div className="absolute -left-6 top-1.5 w-2.5 h-2.5 rounded-full bg-indigo-600 dark:bg-indigo-400 ring-4 ring-white dark:ring-zinc-900" />
                  <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {item.status.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-zinc-400">
                      {new Date(item.changedAt).toLocaleString()}
                    </span>
                  </div>
                  {item.note && (
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 bg-zinc-50 dark:bg-zinc-800/40 p-2 rounded-md border border-zinc-100 dark:border-zinc-800">
                      {item.note}
                    </p>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};
