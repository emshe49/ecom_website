import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Truck,
  ArrowLeft,
  ExternalLink,
  Edit2,
  AlertCircle,
  Loader2,
  MapPin,
  User,
  ShoppingBag,
} from 'lucide-react';
import { shippingApi } from '../api/shipping.api';
import { ShipmentStatusBadge } from '../components/ShipmentStatusBadge';
import { ShipmentTimeline } from '../components/ShipmentTimeline';
import { ShipmentStatusModal } from '../components/ShipmentStatusModal';
import {
  SHIPMENT_STATUS,
  UpdateShipmentStatusInput,
  UpdateShipmentTrackingInput,
} from '../types/shipping.types';
import { formatMoney } from '../../../utils/money';

export const AdminShipmentDetailsPage: React.FC = () => {
  const { shipmentId } = useParams<{ shipmentId: string }>();
  const queryClient = useQueryClient();

  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isTrackingEditing, setIsTrackingEditing] = useState(false);
  const [editCarrier, setEditCarrier] = useState('');
  const [editTrackingNumber, setEditTrackingNumber] = useState('');
  const [editTrackingUrl, setEditTrackingUrl] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    data: shipment,
    isLoading,
  } = useQuery({
    queryKey: ['admin-shipment', shipmentId],
    queryFn: () => shippingApi.getShipmentById(shipmentId!),
    enabled: !!shipmentId,
  });

  const updateStatusMutation = useMutation({
    mutationFn: (data: UpdateShipmentStatusInput) =>
      shippingApi.updateShipmentStatus(shipmentId!, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(['admin-shipment', shipmentId], updated);
      queryClient.invalidateQueries({ queryKey: ['admin-shipments'] });
      setActionError(null);
    },
    onError: (err: any) => {
      setActionError(
        err?.response?.data?.error?.message ||
          err?.message ||
          'Failed to update shipment status.'
      );
    },
  });

  const updateTrackingMutation = useMutation({
    mutationFn: (data: UpdateShipmentTrackingInput) =>
      shippingApi.updateShipmentTracking(shipmentId!, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(['admin-shipment', shipmentId], updated);
      queryClient.invalidateQueries({ queryKey: ['admin-shipments'] });
      setIsTrackingEditing(false);
      setActionError(null);
    },
    onError: (err: any) => {
      setActionError(
        err?.response?.data?.error?.message ||
          err?.message ||
          'Failed to update tracking information.'
      );
    },
  });

  const cancelShipmentMutation = useMutation({
    mutationFn: (note?: string) => shippingApi.cancelShipment(shipmentId!, note),
    onSuccess: (updated) => {
      queryClient.setQueryData(['admin-shipment', shipmentId], updated);
      queryClient.invalidateQueries({ queryKey: ['admin-shipments'] });
      setActionError(null);
    },
    onError: (err: any) => {
      setActionError(
        err?.response?.data?.error?.message ||
          err?.message ||
          'Failed to cancel shipment.'
      );
    },
  });

  if (isLoading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center text-zinc-400">
        <Loader2 className="w-8 h-8 animate-spin mb-3 text-indigo-600" />
        <p className="text-sm font-medium">Loading shipment details...</p>
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="p-12 text-center text-zinc-500">
        <AlertCircle className="w-12 h-12 mx-auto mb-3 text-rose-500" />
        <h3 className="font-bold text-zinc-800 dark:text-zinc-200">Shipment Not Found</h3>
        <Link
          to="/admin/shipments"
          className="inline-flex items-center gap-2 mt-4 text-sm font-bold text-indigo-600 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Shipments
        </Link>
      </div>
    );
  }

  const handleStartTrackingEdit = () => {
    setEditCarrier(shipment.carrierName || shipment.carrier || 'MANUAL');
    setEditTrackingNumber(shipment.trackingNumber || '');
    setEditTrackingUrl(shipment.trackingUrl || '');
    setIsTrackingEditing(true);
  };

  const handleSaveTracking = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateTrackingMutation.mutateAsync({
      carrier: editCarrier.trim(),
      trackingNumber: editTrackingNumber.trim() || null,
      trackingUrl: editTrackingUrl.trim() || null,
    });
  };

  const handleCancelShipment = async () => {
    const reason = window.prompt('Enter optional reason for cancelling this shipment:');
    if (reason !== null) {
      await cancelShipmentMutation.mutateAsync(reason.trim() || undefined);
    }
  };

  const canCancel =
    shipment.status === SHIPMENT_STATUS.PENDING ||
    shipment.status === SHIPMENT_STATUS.READY_TO_SHIP;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/admin/shipments"
          className="inline-flex items-center gap-2 text-sm font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Shipments
        </Link>

        <div className="flex items-center gap-3">
          {shipment.allowedTransitions.length > 0 && (
            <button
              onClick={() => setIsStatusModalOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-sm transition-colors"
            >
              Advance Status ({shipment.allowedTransitions.length} options)
            </button>
          )}

          {canCancel && (
            <button
              onClick={handleCancelShipment}
              disabled={cancelShipmentMutation.isPending}
              className="px-4 py-2 border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-sm font-bold rounded-xl transition-colors disabled:opacity-50"
            >
              Cancel Shipment
            </button>
          )}
        </div>
      </div>

      {actionError && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Shipment Details & Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header Card */}
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Fulfillment Shipment
                </span>
                <h1 className="text-2xl font-black text-zinc-900 dark:text-white font-mono mt-0.5">
                  {shipment.shipmentNumber}
                </h1>
                <p className="text-xs text-zinc-500 mt-1">
                  Associated Order:{' '}
                  <Link
                    to={`/admin/orders/${shipment.orderId}`}
                    className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    #{shipment.orderNumber}
                  </Link>
                </p>
              </div>

              <ShipmentStatusBadge status={shipment.status} className="text-sm px-3.5 py-1.5" />
            </div>

            {/* Timeline Component */}
            <div className="mt-8 pt-6 border-t border-zinc-100 dark:border-zinc-800">
              <ShipmentTimeline
                currentStatus={shipment.status}
                history={shipment.statusHistory}
                shippedAt={shipment.shippedAt}
                deliveredAt={shipment.deliveredAt}
              />
            </div>
          </div>

          {/* Items Card */}
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <h3 className="font-bold text-base text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-indigo-600" />
              Manifest Items ({shipment.items.reduce((a, b) => a + b.quantity, 0)})
            </h3>

            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {shipment.items.map((item, idx) => (
                <div key={idx} className="py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-12 h-12 rounded-lg object-cover border border-zinc-200 dark:border-zinc-700"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                        <ShoppingBag className="w-5 h-5" />
                      </div>
                    )}
                    <div>
                      <h4 className="font-bold text-sm text-zinc-900 dark:text-white">
                        {item.name}
                      </h4>
                      <p className="font-mono text-xs text-zinc-400">SKU: {item.sku}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-bold text-zinc-900 dark:text-white">
                      Qty: {item.quantity}
                    </span>
                    <div className="text-xs text-zinc-500">
                      {formatMoney(item.price, shipment.shippingMethod.currency)} each
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Internal Notes Card */}
          {shipment.internalNotes && (
            <div className="bg-amber-50/50 dark:bg-amber-950/20 p-6 rounded-2xl border border-amber-200 dark:border-amber-900/40">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400 mb-2">
                Internal Warehouse Notes (Admin-Only)
              </h4>
              <p className="text-sm text-amber-900 dark:text-amber-200">
                {shipment.internalNotes}
              </p>
            </div>
          )}
        </div>

        {/* Right 1 Col: Carrier & Customer Metadata */}
        <div className="space-y-6">
          {/* Tracking Card */}
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-zinc-900 dark:text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-indigo-600" />
                Carrier & Tracking
              </h3>
              {!isTrackingEditing && (
                <button
                  onClick={handleStartTrackingEdit}
                  className="p-1.5 text-zinc-400 hover:text-indigo-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {isTrackingEditing ? (
              <form onSubmit={handleSaveTracking} className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">
                    Carrier Name
                  </label>
                  <input
                    type="text"
                    value={editCarrier}
                    onChange={(e) => setEditCarrier(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">
                    Tracking Number
                  </label>
                  <input
                    type="text"
                    value={editTrackingNumber}
                    onChange={(e) => setEditTrackingNumber(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">
                    Tracking URL
                  </label>
                  <input
                    type="url"
                    value={editTrackingUrl}
                    onChange={(e) => setEditTrackingUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsTrackingEditing(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updateTrackingMutation.isPending}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
                  >
                    Save Tracking
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-xs text-zinc-400">Carrier / Service</span>
                  <p className="font-semibold text-zinc-800 dark:text-zinc-200">
                    {shipment.carrierName || shipment.carrier}
                    {shipment.service && (
                      <span className="text-xs font-normal text-zinc-500"> ({shipment.service})</span>
                    )}
                  </p>
                </div>

                <div>
                  <span className="text-xs text-zinc-400">Tracking Number</span>
                  <p className="font-mono font-bold text-zinc-900 dark:text-white mt-0.5">
                    {shipment.trackingNumber || <span className="text-zinc-400 italic">Not set</span>}
                  </p>
                </div>

                {shipment.trackingUrl && (
                  <div>
                    <a
                      href={shipment.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Open Carrier Tracking Portal <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Shipping Method Snapshot */}
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3">
            <h3 className="font-bold text-base text-zinc-900 dark:text-white">
              Method Snapshot
            </h3>
            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-xs text-zinc-400">Method</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  {shipment.shippingMethod.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-zinc-400">Shipping Fee</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  {formatMoney(shipment.shippingMethod.fee, shipment.shippingMethod.currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-zinc-400">Timeframe</span>
                <span className="text-xs text-zinc-600 dark:text-zinc-400">
                  {shipment.shippingMethod.estimatedMinDays}–{shipment.shippingMethod.estimatedMaxDays} days
                </span>
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3">
            <h3 className="font-bold text-base text-zinc-900 dark:text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-indigo-600" />
              Delivery Address
            </h3>
            <div className="text-xs text-zinc-600 dark:text-zinc-300 space-y-1">
              <p className="font-bold text-zinc-900 dark:text-white text-sm">
                {shipment.shippingAddress.fullName}
              </p>
              <p>{shipment.shippingAddress.phone}</p>
              <p>{shipment.shippingAddress.addressLine1}</p>
              {shipment.shippingAddress.addressLine2 && <p>{shipment.shippingAddress.addressLine2}</p>}
              <p>
                {shipment.shippingAddress.city}, {shipment.shippingAddress.stateProvince}
              </p>
              <p>{shipment.shippingAddress.country}</p>
            </div>
          </div>

          {/* Customer Profile */}
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3">
            <h3 className="font-bold text-base text-zinc-900 dark:text-white flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-600" />
              Customer Snapshot
            </h3>
            <div className="text-xs text-zinc-600 dark:text-zinc-300 space-y-1">
              <p className="font-bold text-zinc-900 dark:text-white">
                {shipment.customerSnapshot.firstName} {shipment.customerSnapshot.lastName}
              </p>
              <p>{shipment.customerSnapshot.email}</p>
              {shipment.customerSnapshot.phone && <p>{shipment.customerSnapshot.phone}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Advance Status Modal */}
      <ShipmentStatusModal
        isOpen={isStatusModalOpen}
        shipment={shipment}
        onClose={() => setIsStatusModalOpen(false)}
        onSubmit={async (data) => {
          await updateStatusMutation.mutateAsync(data);
        }}
        isLoading={updateStatusMutation.isPending}
      />
    </div>
  );
};
