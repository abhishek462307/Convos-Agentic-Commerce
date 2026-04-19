import {
  ShippingCarrier,
  Address,
  PackageDetails,
  ShippingRate,
  ShippingLabel,
  TrackingInfo,
  CarrierCredentials,
} from '../types';

const ROYAL_MAIL_API_BASE = 'https://api.parcel.royalmail.com';

export class RoyalMailCarrier implements ShippingCarrier {
  id = 'royal-mail';
  name = 'Royal Mail';
  logo = 'https://api.iconify.design/emojione:crown.svg';
  countries = ['GB', 'UK'];

  requiredCredentials = [
    {
      key: 'apiKey',
      label: 'API Key',
      type: 'password' as const,
      helpText: 'Your Royal Mail Click & Drop API key from Settings > Integrations',
      helpUrl: 'https://www.royalmail.com/business/shipping/click-drop',
    },
    {
      key: 'accountNumber',
      label: 'Account Number',
      type: 'text' as const,
      helpText: 'Your 10-digit Royal Mail OBA account number starting with 0',
    },
  ];

  async validateCredentials(
    credentials: CarrierCredentials,
    testMode: boolean
  ): Promise<boolean> {
    try {
      // Click & Drop: GET /orders returns 200 or 401 — no dedicated auth endpoint
      const response = await fetch(`${ROYAL_MAIL_API_BASE}/api/v1/orders?size=1`, {
        headers: {
          Authorization: `Bearer ${credentials.apiKey}`,
        },
      });
      return response.status !== 401 && response.status !== 403;
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
    const pkg = packages[0];
    const weightKg = this.convertToKg(pkg.weight, pkg.weightUnit);
    const isDomestic = to.country === 'GB' || to.country === 'UK';

    if (isDomestic) {
      return this.getDomesticRates(weightKg);
    } else {
      return this.getInternationalRates(to.country, weightKg);
    }
  }

  private getDomesticRates(weightKg: number): ShippingRate[] {
    const rates: ShippingRate[] = [];

    if (weightKg <= 2) {
      rates.push({
        carrierId: this.id,
        carrierName: this.name,
        serviceCode: 'TRACKED_24',
        serviceName: 'Royal Mail Tracked 24',
        price: 4.45 + (weightKg * 1.5),
        currency: 'GBP',
        estimatedDays: 1,
      });
    }

    if (weightKg <= 2) {
      rates.push({
        carrierId: this.id,
        carrierName: this.name,
        serviceCode: 'TRACKED_48',
        serviceName: 'Royal Mail Tracked 48',
        price: 3.35 + (weightKg * 1.2),
        currency: 'GBP',
        estimatedDays: 2,
      });
    }

    if (weightKg <= 20) {
      rates.push({
        carrierId: this.id,
        carrierName: this.name,
        serviceCode: 'SPECIAL_DELIVERY_GUARANTEED_1PM',
        serviceName: 'Special Delivery Guaranteed by 1pm',
        price: 7.65 + (weightKg * 2.0),
        currency: 'GBP',
        estimatedDays: 1,
        guaranteed: true,
      });
    }

    if (weightKg <= 30) {
      rates.push({
        carrierId: this.id,
        carrierName: this.name,
        serviceCode: 'PARCELFORCE_EXPRESS_24',
        serviceName: 'Parcelforce Express 24',
        price: 12.50 + (weightKg * 0.8),
        currency: 'GBP',
        estimatedDays: 1,
      });
    }

    return rates.sort((a, b) => a.price - b.price);
  }

  private getInternationalRates(country: string, weightKg: number): ShippingRate[] {
    const isEU = ['DE', 'FR', 'ES', 'IT', 'NL', 'BE', 'AT', 'PL', 'PT', 'IE'].includes(country);
    const rates: ShippingRate[] = [];

    if (weightKg <= 2) {
      rates.push({
        carrierId: this.id,
        carrierName: this.name,
        serviceCode: 'INTERNATIONAL_TRACKED',
        serviceName: 'Royal Mail International Tracked',
        price: isEU ? 10.50 + (weightKg * 3) : 13.50 + (weightKg * 4),
        currency: 'GBP',
        estimatedDays: isEU ? 5 : 10,
      });
    }

    if (weightKg <= 2) {
      rates.push({
        carrierId: this.id,
        carrierName: this.name,
        serviceCode: 'INTERNATIONAL_TRACKED_SIGNED',
        serviceName: 'Royal Mail International Tracked & Signed',
        price: isEU ? 12.00 + (weightKg * 3.5) : 15.50 + (weightKg * 4.5),
        currency: 'GBP',
        estimatedDays: isEU ? 5 : 10,
      });
    }

    return rates.sort((a, b) => a.price - b.price);
  }

  async createLabel(
    from: Address,
    to: Address,
    packageDetails: PackageDetails,
    serviceCode: string,
    credentials: CarrierCredentials,
    testMode: boolean
  ): Promise<ShippingLabel> {
    const weightGrams = Math.round(this.convertToKg(packageDetails.weight, packageDetails.weightUnit) * 1000);

    const orderData = {
      recipient: {
        name: to.name,
        companyName: to.company || '',
        addressLine1: to.street1,
        addressLine2: to.street2 || '',
        city: to.city,
        county: to.state,
        postcode: to.postalCode,
        countryCode: to.country,
        phoneNumber: to.phone || '',
        emailAddress: to.email || '',
      },
      sender: {
        name: from.name,
        companyName: from.company || '',
        addressLine1: from.street1,
        addressLine2: from.street2 || '',
        city: from.city,
        county: from.state,
        postcode: from.postalCode,
        countryCode: from.country,
        phoneNumber: from.phone || '',
        emailAddress: from.email || '',
      },
      orderDate: new Date().toISOString(),
      subtotal: 0,
      shippingCostCharged: 0,
      total: 0,
      weightInGrams: weightGrams,
      packageSize: this.getPackageSize(packageDetails),
      serviceCode: serviceCode,
    };

    const response = await fetch(`${ROYAL_MAIL_API_BASE}/api/v1/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${credentials.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Royal Mail order creation failed: ${errorText}`);
    }

    const order = await response.json();

    const labelResponse = await fetch(
      `${ROYAL_MAIL_API_BASE}/api/v1/orders/${order.orderIdentifier}/label`,
      {
        headers: {
          Authorization: `Bearer ${credentials.apiKey}`,
          Accept: 'application/pdf',
        },
      }
    );

    if (!labelResponse.ok) {
      throw new Error('Failed to generate Royal Mail label');
    }

    const labelBuffer = await labelResponse.arrayBuffer();
    const labelBase64 = Buffer.from(labelBuffer).toString('base64');

    return {
      trackingNumber: order.trackingNumber || order.orderIdentifier,
      labelData: labelBase64,
      labelFormat: 'PDF',
      cost: order.totalCost || 0,
      currency: 'GBP',
      carrier: this.name,
      service: serviceCode,
    };
  }

  async getTracking(
    trackingNumber: string,
    credentials: CarrierCredentials,
    testMode: boolean
  ): Promise<TrackingInfo> {
    const response = await fetch(
      `${ROYAL_MAIL_API_BASE}/api/v1/tracking/${trackingNumber}`,
      {
        headers: {
          Authorization: `Bearer ${credentials.apiKey}`,
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

    return {
      trackingNumber,
      carrier: this.name,
      status: this.mapStatus(data.status),
      estimatedDelivery: data.estimatedDeliveryDate,
      events: (data.events || []).map((event: Record<string, string>) => ({
        timestamp: event.timestamp,
        location: event.location || '',
        status: event.status,
        description: event.description,
      })),
    };
  }

  private mapStatus(status: string): TrackingInfo['status'] {
    const statusMap: Record<string, TrackingInfo['status']> = {
      'accepted': 'pre_transit',
      'in_transit': 'in_transit',
      'out_for_delivery': 'out_for_delivery',
      'delivered': 'delivered',
      'exception': 'exception',
    };
    return statusMap[status?.toLowerCase()] || 'unknown';
  }

  private getPackageSize(pkg: PackageDetails): string {
    const lengthCm = pkg.length || 20;
    const widthCm = pkg.width || 15;
    const heightCm = pkg.height || 5;
    const maxDim = Math.max(lengthCm, widthCm, heightCm);

    if (maxDim <= 24) return 'SMALL_PARCEL';
    if (maxDim <= 61) return 'MEDIUM_PARCEL';
    return 'LARGE_PARCEL';
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
}

export const royalMailCarrier = new RoyalMailCarrier();
