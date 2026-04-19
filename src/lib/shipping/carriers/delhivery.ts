import logger from '@/lib/logger';
import {
  ShippingCarrier,
  Address,
  PackageDetails,
  ShippingRate,
  ShippingLabel,
  TrackingInfo,
  CarrierCredentials,
} from '../types';

const DELHIVERY_API_BASE = 'https://track.delhivery.com';
const DELHIVERY_STAGING_BASE = 'https://staging-express.delhivery.com';

export class DelhiveryCarrier implements ShippingCarrier {
  id = 'delhivery';
  name = 'Delhivery';
  logo = 'https://api.iconify.design/twemoji:flag-india.svg';
  countries = ['IN'];

  requiredCredentials = [
    {
      key: 'apiToken',
      label: 'API Token',
      type: 'password' as const,
      helpText: 'Your Delhivery API token from the Developer Portal',
      helpUrl: 'https://one.delhivery.com/developer-portal/documents',
    },
    {
      key: 'clientName',
      label: 'Client Name',
      type: 'text' as const,
      helpText: 'Your Delhivery client/warehouse name',
    },
  ];

  async validateCredentials(
    credentials: CarrierCredentials,
    testMode: boolean
  ): Promise<boolean> {
    try {
      const baseUrl = testMode ? DELHIVERY_STAGING_BASE : DELHIVERY_API_BASE;
      const response = await fetch(`${baseUrl}/api/kinko/v1/invoice/charges/.json`, {
        method: 'GET',
        headers: {
          Authorization: `Token ${credentials.apiToken}`,
          'Content-Type': 'application/json',
        },
      });
      return response.status !== 401;
    } catch {
      return false;
    }
  }

  async getRates(
    from: Address,
    to: Address,
    packages: PackageDetails[],
    credentials: CarrierCredentials,
    testMode: boolean
  ): Promise<ShippingRate[]> {
    const baseUrl = testMode ? DELHIVERY_STAGING_BASE : DELHIVERY_API_BASE;
    const pkg = packages[0];
    const weightGrams = this.convertToGrams(pkg.weight, pkg.weightUnit);
    const volumetricWeight = this.calculateVolumetricWeight(pkg);
    const chargeableWeight = Math.max(weightGrams, volumetricWeight);

    try {
      const params = new URLSearchParams({
        md: 'S',
        ss: 'Delivered',
        d_pin: to.postalCode,
        o_pin: from.postalCode,
        cgm: chargeableWeight.toString(),
        pt: 'Pre-paid',
        cod: '0',
      });

      const response = await fetch(
        `${baseUrl}/api/kinko/v1/invoice/charges/.json?${params}`,
        {
          headers: {
            Authorization: `Token ${credentials.apiToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const rates: ShippingRate[] = [];

        if (data[0]?.total_amount) {
          rates.push({
            carrierId: this.id,
            carrierName: this.name,
            serviceCode: 'SURFACE',
            serviceName: 'Delhivery Surface',
            price: data[0].total_amount,
            currency: 'INR',
            estimatedDays: 5,
          });
        }

        const expressParams = new URLSearchParams({
          md: 'E',
          ss: 'Delivered',
          d_pin: to.postalCode,
          o_pin: from.postalCode,
          cgm: chargeableWeight.toString(),
          pt: 'Pre-paid',
          cod: '0',
        });

        const expressResponse = await fetch(
          `${baseUrl}/api/kinko/v1/invoice/charges/.json?${expressParams}`,
          {
            headers: {
              Authorization: `Token ${credentials.apiToken}`,
            },
          }
        );

        if (expressResponse.ok) {
          const expressData = await expressResponse.json();
          if (expressData[0]?.total_amount) {
            rates.push({
              carrierId: this.id,
              carrierName: this.name,
              serviceCode: 'EXPRESS',
              serviceName: 'Delhivery Express',
              price: expressData[0].total_amount,
              currency: 'INR',
              estimatedDays: 2,
            });
          }
        }

        if (rates.length > 0) {
          return rates.sort((a, b) => a.price - b.price);
        }
      }
    } catch (error) {
      logger.error('Delhivery rate fetch error:', error);
    }

    return this.getFallbackRates(chargeableWeight);
  }

  private getFallbackRates(weightGrams: number): ShippingRate[] {
    const weightKg = weightGrams / 1000;
    const baseRate = 40 + (weightKg * 25);

    return [
      {
        carrierId: this.id,
        carrierName: this.name,
        serviceCode: 'SURFACE',
        serviceName: 'Delhivery Surface',
        price: Math.round(baseRate),
        currency: 'INR',
        estimatedDays: 5,
      },
      {
        carrierId: this.id,
        carrierName: this.name,
        serviceCode: 'EXPRESS',
        serviceName: 'Delhivery Express',
        price: Math.round(baseRate * 1.5),
        currency: 'INR',
        estimatedDays: 2,
      },
    ];
  }

  async createLabel(
    from: Address,
    to: Address,
    packageDetails: PackageDetails,
    serviceCode: string,
    credentials: CarrierCredentials,
    testMode: boolean
  ): Promise<ShippingLabel> {
    const baseUrl = testMode ? DELHIVERY_STAGING_BASE : DELHIVERY_API_BASE;

    const waybillResponse = await fetch(
      `${baseUrl}/waybill/api/bulk/json/?cl=${encodeURIComponent(credentials.clientName)}&count=1`,
      {
        headers: {
          Authorization: `Token ${credentials.apiToken}`,
        },
      }
    );

    if (!waybillResponse.ok) {
      throw new Error('Failed to fetch waybill from Delhivery');
    }

    const waybillData = await waybillResponse.json();
    const waybill = waybillData[0];

    if (!waybill) {
      throw new Error('No waybill returned from Delhivery');
    }

    const weightGrams = this.convertToGrams(packageDetails.weight, packageDetails.weightUnit);

    const shipmentData = {
      shipments: [
        {
          name: to.name,
          add: `${to.street1} ${to.street2 || ''}`.trim(),
          city: to.city,
          state: to.state,
          pin: to.postalCode,
          country: 'India',
          phone: to.phone || '',
          order: `ORD-${Date.now()}`,
          payment_mode: 'Pre-paid',
          return_pin: from.postalCode,
          return_city: from.city,
          return_phone: from.phone || '',
          return_add: `${from.street1} ${from.street2 || ''}`.trim(),
          return_state: from.state,
          return_country: 'India',
          return_name: from.name,
          products_desc: 'Package',
          hsn_code: '',
          cod_amount: 0,
          weight: weightGrams,
          waybill: waybill,
          client: credentials.clientName,
          shipment_mode: serviceCode === 'EXPRESS' ? 'Express' : 'Surface',
        },
      ],
      pickup_location: {
        name: credentials.clientName,
        add: `${from.street1} ${from.street2 || ''}`.trim(),
        city: from.city,
        pin_code: from.postalCode,
        country: 'India',
        phone: from.phone || '',
      },
    };

    const createResponse = await fetch(`${baseUrl}/api/cmu/create.json`, {
        method: 'POST',
        headers: {
          Authorization: `Token ${credentials.apiToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `format=json&data=${encodeURIComponent(JSON.stringify(shipmentData))}`,
      });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      throw new Error(`Delhivery shipment creation failed: ${errorText}`);
    }

    const createData = await createResponse.json();

    if (!createData.success || createData.packages?.[0]?.status !== 'Success') {
      throw new Error(createData.packages?.[0]?.remarks || 'Shipment creation failed');
    }

    const labelResponse = await fetch(
      `${baseUrl}/api/p/packing_slip?wbns=${waybill}&pdf=true`,
      {
        headers: {
          Authorization: `Token ${credentials.apiToken}`,
        },
      }
    );

    let labelData = '';
    if (labelResponse.ok) {
      const buffer = await labelResponse.arrayBuffer();
      labelData = Buffer.from(buffer).toString('base64');
    }

    return {
      trackingNumber: waybill,
      labelData: labelData,
      labelFormat: 'PDF',
      cost: 0,
      currency: 'INR',
      carrier: this.name,
      service: serviceCode,
    };
  }

  async getTracking(
    trackingNumber: string,
    credentials: CarrierCredentials,
    testMode: boolean
  ): Promise<TrackingInfo> {
    const baseUrl = testMode ? DELHIVERY_STAGING_BASE : DELHIVERY_API_BASE;

    const response = await fetch(
      `${baseUrl}/api/v1/packages/json/?waybill=${trackingNumber}`,
      {
        headers: {
          Authorization: `Token ${credentials.apiToken}`,
        },
      }
    );

    if (!response.ok) {
      return {
        trackingNumber,
        carrier: this.name,
        status: 'unknown',
        events: [],
      };
    }

    const data = await response.json();
    const shipment = data.ShipmentData?.[0]?.Shipment;

    if (!shipment) {
      return {
        trackingNumber,
        carrier: this.name,
        status: 'unknown',
        events: [],
      };
    }

    const scans = shipment.Scans || [];

    return {
      trackingNumber,
      carrier: this.name,
      status: this.mapStatus(shipment.Status?.Status),
      estimatedDelivery: shipment.ExpectedDeliveryDate,
      events: scans.map((scan: Record<string, unknown>) => {
        const scanDetail = scan.ScanDetail as Record<string, string>;
        return {
          timestamp: scanDetail?.ScanDateTime || '',
          location: `${scanDetail?.ScannedLocation || ''}, ${scanDetail?.CityName || ''}`.trim(),
          status: scanDetail?.Scan || '',
          description: scanDetail?.Instructions || scanDetail?.Scan || '',
        };
      }),
    };
  }

  private mapStatus(status: string): TrackingInfo['status'] {
    const statusMap: Record<string, TrackingInfo['status']> = {
      'Manifested': 'pre_transit',
      'In Transit': 'in_transit',
      'Out For Delivery': 'out_for_delivery',
      'Delivered': 'delivered',
      'RTO': 'exception',
      'Pending': 'exception',
    };
    return statusMap[status] || 'unknown';
  }

  private convertToGrams(weight: number, unit: PackageDetails['weightUnit']): number {
    switch (unit) {
      case 'g':
        return weight;
      case 'kg':
        return weight * 1000;
      case 'lb':
        return weight * 453.592;
      case 'oz':
        return weight * 28.3495;
      default:
        return weight;
    }
  }

  private calculateVolumetricWeight(pkg: PackageDetails): number {
    if (!pkg.length || !pkg.width || !pkg.height) return 0;
    
    let l = pkg.length, w = pkg.width, h = pkg.height;
    if (pkg.dimensionUnit === 'in') {
      l *= 2.54;
      w *= 2.54;
      h *= 2.54;
    }
    return (l * w * h) / 5;
  }
}

export const delhiveryCarrier = new DelhiveryCarrier();
