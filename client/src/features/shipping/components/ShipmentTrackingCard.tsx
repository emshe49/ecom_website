import React from 'react';
import { Truck, ExternalLink, Calendar, MapPin } from 'lucide-react';
import { CustomerShipmentDTO } from '../types/shipping.types';
import { ShipmentStatusBadge } from './ShipmentStatusBadge';
import { ShipmentTimeline } from './ShipmentTimeline';
import { formatMoney } from '../../../utils/money';

interface ShipmentTrackingCardProps {
  shipment: CustomerShipmentDTO;
}

export const ShipmentTrackingCard: React.FC<ShipmentTrackingCardProps> = ({ shipment }) => {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-4 bg-zinc-50/50 dark:bg-zinc-800/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-zinc-900 dark:text-white">
                Shipment {shipment.shipmentNumber}
              </h3>
              <ShipmentStatusBadge status={shipment.status} />
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Method: <span className="font-semibold text-zinc-700 dark:text-zinc-300">{shipment.shippingMethod.name}</span>
              {shipment.shippingMethod.fee > 0 ? (
                <span> ({formatMoney(shipment.shippingMethod.fee, shipment.shippingMethod.currency)})</span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold"> (FREE)</span>
              )}
            </p>
          </div>
        </div>

        {/* Tracking action if available */}
        {shipment.trackingNumber && (
          <div className="flex flex-col sm:items-end">
            <span className="text-xs text-zinc-400">Tracking Number</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-mono text-sm font-bold text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">
                {shipment.trackingNumber}
              </span>
              {shipment.trackingUrl && (
                <a
                  href={shipment.trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 px-2.5 py-1 rounded transition-colors"
                >
                  Track <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="p-6 space-y-6">
        {/* Carrier info & Estimated Delivery */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-100 dark:border-zinc-800">
          <div>
            <span className="text-xs text-zinc-400 font-medium">Carrier</span>
            <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mt-0.5">
              {shipment.carrierName || shipment.carrier || 'Standard Courier'}
              {shipment.service && <span className="text-xs font-normal text-zinc-500"> ({shipment.service})</span>}
            </p>
          </div>

          <div>
            <span className="text-xs text-zinc-400 font-medium">Estimated Delivery</span>
            <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mt-0.5 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-indigo-500" />
              {shipment.deliveredAt
                ? `Delivered on ${new Date(shipment.deliveredAt).toLocaleDateString()}`
                : `${shipment.shippingMethod.estimatedMinDays}–${shipment.shippingMethod.estimatedMaxDays} business days`}
            </p>
          </div>

          <div className="sm:col-span-2 lg:col-span-1">
            <span className="text-xs text-zinc-400 font-medium">Destination</span>
            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5 flex items-center gap-1.5 truncate">
              <MapPin className="w-4 h-4 text-zinc-400 shrink-0" />
              {shipment.shippingAddress.city}, {shipment.shippingAddress.stateProvince}, {shipment.shippingAddress.country}
            </p>
          </div>
        </div>

        {/* Status Timeline */}
        <div className="pt-2">
          <ShipmentTimeline
            currentStatus={shipment.status}
            history={shipment.statusHistory}
            shippedAt={shipment.shippedAt}
            deliveredAt={shipment.deliveredAt}
          />
        </div>
      </div>
    </div>
  );
};
