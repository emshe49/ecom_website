import {
  IShippingProvider,
  CreateShipmentProviderResult,
  TrackingStatusProviderResult,
} from './shipping-provider.interface.js';
import { IShipment } from '../shipment.model.js';
import { CARRIER_TYPE } from '../shipping.constants.js';

export class ManualShippingProvider implements IShippingProvider {
  readonly carrierCode = CARRIER_TYPE.MANUAL;

  async createShipment(shipment: IShipment): Promise<CreateShipmentProviderResult> {
    return {
      trackingNumber: shipment.trackingNumber || undefined,
      trackingUrl: shipment.trackingUrl || undefined,
      carrierReference: shipment.shipmentNumber,
    };
  }

  async getTracking(trackingNumber: string): Promise<TrackingStatusProviderResult[]> {
    return [
      {
        status: 'RECORDED',
        description: `Manual shipment tracking registered for ${trackingNumber}`,
        timestamp: new Date(),
      },
    ];
  }

  async cancelShipment(_shipment: IShipment): Promise<boolean> {
    return true;
  }
}
