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

const AUSPOST_API_BASE = 'https://digitalapi.auspost.com.au';
const AUSPOST_TEST_BASE = 'https://digitalapi.auspost.com.au/test';

export class AustraliaPostCarrier implements ShippingCarrier {
  id = 'australia-post';
  name = 'Australia Post';
  logo = 'https://api.iconify.design/twemoji:flag-australia.svg';
  countries = ['AU'];

  requiredCredentials = [
    {
      key: 'apiKey',
      label: 'API Key',
      type: 'password' as const,
      helpText: 'Your Australia Post API key from the Developer Portal',
      helpUrl: 'https://developers.auspost.com.au/',
    },
    {
      key: 'accountNumber',
      label: 'Account Number',
      type: 'text' as const,
      helpText: 'Your Australia Post account number for shipping',
    },
    {
      key: 'password',
      label: 'API Password',
      type: 'password' as const,
      helpText: 'Your Australia Post API password',
    },
  ];

  async validateCredentials(
    credentials: CarrierCredentials,
    testMode: boolean
  ): Promise<boolean> {
    try {
      const authHeader = Buffer.from(
        `${credentials.accountNumber}:${credentials.password}`
      ).toString('base64');

      const response = await fetch(
        `${AUSPOST_API_BASE}/postage/parcel/domestic/service.json?from_postcode=3000&to_postcode=2000&length=10&width=10&height=10&weight=1`,
        {
          headers: {
            'AUTH-KEY': credentials.apiKey,
            Authorization: `Basic ${authHeader}`,
          },
        }
      );
      return response.ok;
    } catch (error) {
      logger.error('Australia Post validateCredentials error:', error);
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
    const pkg = packages[0];
    const weightKg = this.convertToKg(pkg.weight, pkg.weightUnit);
    const { length, width, height } = this.getDimensionsCm(pkg);

    const isDomestic = to.country === 'AU';

    if (isDomestic) {
      return this.getDomesticRates(
        from.postalCode,
        to.postalCode,
        weightKg,
        length,
        width,
        height,
        credentials
      );
    } else {
      return this.getInternationalRates(
        to.country,
        weightKg,
        credentials
      );
    }
  }

  private async getDomesticRates(
    fromPostcode: string,
    toPostcode: string,
    weightKg: number,
    length: number,
    width: number,
    height: number,
    credentials: CarrierCredentials
  ): Promise<ShippingRate[]> {
    try {
      const params = new URLSearchParams({
        from_postcode: fromPostcode,
        to_postcode: toPostcode,
        length: Math.max(length, 5).toString(),
        width: Math.max(width, 5).toString(),
        height: Math.max(height, 1).toString(),
        weight: Math.max(weightKg, 0.1).toString(),
      });

      const response = await fetch(
        `${AUSPOST_API_BASE}/postage/parcel/domestic/service.json?${params}`,
        {
          headers: {
            'AUTH-KEY': credentials.apiKey,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const services = data.services?.service || [];

        return services.map((service: Record<string, string | number>) => ({
          carrierId: this.id,
          carrierName: this.name,
          serviceCode: service.code as string,
          serviceName: service.name as string,
          price: parseFloat(service.price as string) || 0,
          currency: 'AUD',
          estimatedDays: this.getEstimatedDays(service.code as string),
        })).sort((a: ShippingRate, b: ShippingRate) => a.price - b.price);
      }
    } catch (error) {
      logger.error('Australia Post rate fetch error:', error);
    }

    return this.getFallbackRates(weightKg);
  }

  private async getInternationalRates(
    countryCode: string,
    weightKg: number,
    credentials: CarrierCredentials
  ): Promise<ShippingRate[]> {
    try {
      const params = new URLSearchParams({
        country_code: countryCode,
        weight: Math.max(weightKg, 0.1).toString(),
      });

      const response = await fetch(
        `${AUSPOST_API_BASE}/postage/parcel/international/service.json?${params}`,
        {
          headers: {
            'AUTH-KEY': credentials.apiKey,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const services = data.services?.service || [];

        return services.map((service: Record<string, string | number>) => ({
          carrierId: this.id,
          carrierName: this.name,
          serviceCode: service.code as string,
          serviceName: service.name as string,
          price: parseFloat(service.price as string) || 0,
          currency: 'AUD',
          estimatedDays: this.getInternationalEstimatedDays(service.code as string),
        })).sort((a: ShippingRate, b: ShippingRate) => a.price - b.price);
      }
    } catch (error) {
      logger.error('Australia Post international rate fetch error:', error);
    }

    return this.getInternationalFallbackRates(countryCode, weightKg);
  }

  private getFallbackRates(weightKg: number): ShippingRate[] {
    const baseRate = 8.95 + (weightKg * 2.5);

    return [
      {
        carrierId: this.id,
        carrierName: this.name,
        serviceCode: 'AUS_PARCEL_REGULAR',
        serviceName: 'Parcel Post',
        price: Math.round(baseRate * 100) / 100,
        currency: 'AUD',
        estimatedDays: 5,
      },
      {
        carrierId: this.id,
        carrierName: this.name,
        serviceCode: 'AUS_PARCEL_EXPRESS',
        serviceName: 'Express Post',
        price: Math.round((baseRate * 1.6) * 100) / 100,
        currency: 'AUD',
        estimatedDays: 2,
      },
    ];
  }

  private getInternationalFallbackRates(country: string, weightKg: number): ShippingRate[] {
    const zone = this.getZone(country);
    const baseRate = zone === 1 ? 25 : zone === 2 ? 35 : 45;
    const perKgRate = zone === 1 ? 8 : zone === 2 ? 12 : 18;

    return [
      {
        carrierId: this.id,
        carrierName: this.name,
        serviceCode: 'INT_PARCEL_STD_OWN_PACKAGING',
        serviceName: 'International Standard',
        price: Math.round((baseRate + weightKg * perKgRate) * 100) / 100,
        currency: 'AUD',
        estimatedDays: zone === 1 ? 8 : zone === 2 ? 12 : 18,
      },
      {
        carrierId: this.id,
        carrierName: this.name,
        serviceCode: 'INT_PARCEL_EXP_OWN_PACKAGING',
        serviceName: 'International Express',
        price: Math.round((baseRate * 2 + weightKg * perKgRate * 1.5) * 100) / 100,
        currency: 'AUD',
        estimatedDays: zone === 1 ? 4 : zone === 2 ? 6 : 10,
      },
    ];
  }

  private getZone(countryCode: string): number {
    const zone1 = ['NZ', 'PG', 'FJ', 'NC'];
    const zone2 = ['SG', 'MY', 'ID', 'TH', 'VN', 'PH', 'HK', 'JP', 'KR', 'CN', 'TW', 'IN'];
    
    if (zone1.includes(countryCode)) return 1;
    if (zone2.includes(countryCode)) return 2;
    return 3;
  }

  async createLabel(
    from: Address,
    to: Address,
    packageDetails: PackageDetails,
    serviceCode: string,
    credentials: CarrierCredentials,
    testMode: boolean
  ): Promise<ShippingLabel> {
    const baseUrl = testMode ? AUSPOST_TEST_BASE : AUSPOST_API_BASE;
    const authHeader = Buffer.from(
      `${credentials.accountNumber}:${credentials.password}`
    ).toString('base64');

    const weightKg = this.convertToKg(packageDetails.weight, packageDetails.weightUnit);
    const { length, width, height } = this.getDimensionsCm(packageDetails);

    const shipmentData = {
      shipments: [
        {
          shipment_reference: `SHIP-${Date.now()}`,
          sender_references: [`REF-${Date.now()}`],
          from: {
            name: from.name,
            business_name: from.company || '',
            lines: [from.street1, from.street2 || ''].filter(Boolean),
            suburb: from.city,
            state: from.state,
            postcode: from.postalCode,
            country: from.country,
            phone: from.phone || '',
            email: from.email || '',
          },
          to: {
            name: to.name,
            business_name: to.company || '',
            lines: [to.street1, to.street2 || ''].filter(Boolean),
            suburb: to.city,
            state: to.state,
            postcode: to.postalCode,
            country: to.country,
            phone: to.phone || '',
            email: to.email || '',
          },
          items: [
            {
              item_reference: `ITEM-${Date.now()}`,
              product_id: serviceCode,
              length: Math.max(length, 5),
              width: Math.max(width, 5),
              height: Math.max(height, 1),
              weight: Math.max(weightKg, 0.1),
              authority_to_leave: false,
              allow_partial_delivery: false,
            },
          ],
        },
      ],
    };

      const createResponse = await fetch(
        `${baseUrl}/shipping/v1/shipments`,
        {
          method: 'POST',
          headers: {
            'AUTH-KEY': credentials.apiKey,
            Authorization: `Basic ${authHeader}`,
            'Content-Type': 'application/json',
            'Account-Number': credentials.accountNumber,
          },
          body: JSON.stringify(shipmentData),
        }
      );

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        throw new Error(`Australia Post shipment creation failed: ${errorText}`);
      }

      const createData = await createResponse.json();
      const shipment = createData.shipments?.[0];
      const item = shipment?.items?.[0];

      if (!item?.tracking_details?.article_id) {
        throw new Error('Failed to create Australia Post shipment');
      }

      const labelResponse = await fetch(
        `${baseUrl}/shipping/v1/labels?shipment_ids=${shipment.shipment_id}`,
        {
          headers: {
            'AUTH-KEY': credentials.apiKey,
            Authorization: `Basic ${authHeader}`,
            Accept: 'application/pdf',
            'Account-Number': credentials.accountNumber,
          },
        }
      );

    let labelData = '';
    if (labelResponse.ok) {
      const buffer = await labelResponse.arrayBuffer();
      labelData = Buffer.from(buffer).toString('base64');
    }

    return {
      trackingNumber: item.tracking_details.article_id,
      labelData: labelData,
      labelFormat: 'PDF',
      cost: item.product_cost || 0,
      currency: 'AUD',
      carrier: this.name,
      service: serviceCode,
    };
  }

  async getTracking(
    trackingNumber: string,
    credentials: CarrierCredentials,
    testMode: boolean
  ): Promise<TrackingInfo> {
    const baseUrl = testMode ? AUSPOST_TEST_BASE : AUSPOST_API_BASE;
    const response = await fetch(
      `${baseUrl}/shipping/v1/track?tracking_ids=${trackingNumber}`,
      {
        headers: {
          'AUTH-KEY': credentials.apiKey,
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
    const result = data.tracking_results?.[0];

    if (!result) {
      return {
        trackingNumber,
        carrier: this.name,
        status: 'unknown',
        events: [],
      };
    }

    const events = result.trackable_items?.[0]?.events || [];

    return {
      trackingNumber,
      carrier: this.name,
      status: this.mapStatus(result.status),
      events: events.map((event: Record<string, string>) => ({
        timestamp: event.date,
        location: event.location || '',
        status: event.description,
        description: event.description,
      })),
    };
  }

  private mapStatus(status: string): TrackingInfo['status'] {
    const statusMap: Record<string, TrackingInfo['status']> = {
      'Created': 'pre_transit',
      'Initiated': 'pre_transit',
      'In Transit': 'in_transit',
      'Onboard for Delivery': 'out_for_delivery',
      'Delivered': 'delivered',
      'Awaiting Collection': 'exception',
    };
    return statusMap[status] || 'unknown';
  }

  private getEstimatedDays(serviceCode: string): number {
    const estimates: Record<string, number> = {
      'AUS_PARCEL_REGULAR': 5,
      'AUS_PARCEL_EXPRESS': 2,
      'AUS_PARCEL_COURIER': 1,
    };
    return estimates[serviceCode] || 5;
  }

  private getInternationalEstimatedDays(serviceCode: string): number {
    const estimates: Record<string, number> = {
      'INT_PARCEL_STD_OWN_PACKAGING': 12,
      'INT_PARCEL_EXP_OWN_PACKAGING': 5,
      'INT_PARCEL_COR_OWN_PACKAGING': 3,
    };
    return estimates[serviceCode] || 12;
  }

  private convertToKg(weight: number, unit: PackageDetails['weightUnit']): number {
    switch (unit) {
      case 'kg':
        return weight;
      case 'g':
        return weight / 1000;
      case 'lb':
        return weight * 0.453592;
      case 'oz':
        return weight * 0.0283495;
      default:
        return weight;
    }
  }

  private getDimensionsCm(pkg: PackageDetails): { length: number; width: number; height: number } {
    let length = pkg.length || 20;
    let width = pkg.width || 15;
    let height = pkg.height || 5;

    if (pkg.dimensionUnit === 'in') {
      length *= 2.54;
      width *= 2.54;
      height *= 2.54;
    }

    return { length, width, height };
  }
}

export const australiaPostCarrier = new AustraliaPostCarrier();
