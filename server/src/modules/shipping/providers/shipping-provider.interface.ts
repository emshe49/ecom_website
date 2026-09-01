import { IShipment } from '../shipment.model.js';

export interface CreateShipmentProviderResult {
  trackingNumber?: string;
  trackingUrl?: string;
  carrierReference?: string;
}

export interface TrackingStatusProviderResult {
  status: string;
  location?: string;
  description?: string;
  timestamp: Date;
}

export interface IShippingProvider {
  readonly carrierCode: string;
  createShipment(shipment: IShipment): Promise<CreateShipmentProviderResult>;
  getTracking(trackingNumber: string): Promise<TrackingStatusProviderResult[]>;
  cancelShipment(shipment: IShipment): Promise<boolean>;
}
