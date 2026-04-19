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

const USPS_TEST_BASE = 'https://apis-tem.usps.com';
const USPS_PROD_BASE = 'https://apis.usps.com';

export class USPSCarrier implements ShippingCarrier {
  id = 'usps';
  name = 'USPS';
  logo = 'https://api.iconify.design/simple-icons:usps.svg';
  countries = ['US'];

  requiredCredentials = [
    {
      key: 'clientId',
      label: 'Client ID',
      type: 'text' as const,
      helpText: 'Your USPS API Client ID from the developer portal',
      helpUrl: 'https://developers.usps.com/',
    },
    {
      key: 'clientSecret',
      label: 'Client Secret',
      type: 'password' as const,
      helpText: 'Your USPS API Client Secret',
    },
  ];

  private async getAccessToken(
    credentials: CarrierCredentials,
    testMode: boolean
  ): Promise<string> {
    const baseUrl = testMode ? USPS_TEST_BASE : USPS_PROD_BASE;

    const response = await fetch(`${baseUrl}/oauth2/v3/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to authenticate with USPS');
    }

    const data = await response.json();
    return data.access_token;
  }

  async validateCredentials(
    credentials: CarrierCredentials,
    testMode: boolean
  ): Promise<boolean> {
    try {
      await this.getAccessToken(credentials, testMode);
      return true;
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
    const baseUrl = testMode ? USPS_TEST_BASE : USPS_PROD_BASE;
    const accessToken = await this.getAccessToken(credentials, testMode);

    const rates: ShippingRate[] = [];
    const pkg = packages[0];
    const weightOz = this.convertToOunces(pkg.weight, pkg.weightUnit);

    const mailClasses = [
      { code: 'USPS_GROUND_ADVANTAGE', name: 'USPS Ground Advantage' },
      { code: 'PRIORITY_MAIL', name: 'Priority Mail' },
      { code: 'PRIORITY_MAIL_EXPRESS', name: 'Priority Mail Express' },
    ];

    for (const mailClass of mailClasses) {
      try {
        const response = await fetch(
          `${baseUrl}/prices/v3/base-rates/${mailClass.code}`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              originZIPCode: from.postalCode.substring(0, 5),
              destinationZIPCode: to.postalCode.substring(0, 5),
              weight: weightOz,
              length: pkg.length || 6,
              width: pkg.width || 4,
              height: pkg.height || 2,
              mailClass: mailClass.code,
              processingCategory: 'MACHINABLE',
              rateIndicator: 'DR',
              destinationEntryFacilityType: 'NONE',
              priceType: 'COMMERCIAL',
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.totalBasePrice) {
            rates.push({
              carrierId: this.id,
              carrierName: this.name,
              serviceCode: mailClass.code,
              serviceName: mailClass.name,
              price: data.totalBasePrice,
              currency: 'USD',
              estimatedDays: this.getEstimatedDays(mailClass.code),
            });
          }
        }
      } catch (error) {
        logger.error(`Error fetching ${mailClass.name} rates:`, error);
      }
    }

    if (rates.length === 0) {
      return this.getFallbackRates(from, to, packages);
    }

    return rates.sort((a, b) => a.price - b.price);
  }

  private getFallbackRates(
    from: Address,
    to: Address,
    packages: PackageDetails[]
  ): ShippingRate[] {
    const pkg = packages[0];
    const weightLb = this.convertToPounds(pkg.weight, pkg.weightUnit);
    const baseRate = 5.0 + weightLb * 0.5;

    return [
      {
        carrierId: this.id,
        carrierName: this.name,
        serviceCode: 'USPS_GROUND_ADVANTAGE',
        serviceName: 'USPS Ground Advantage',
        price: Math.round(baseRate * 100) / 100,
        currency: 'USD',
        estimatedDays: 5,
      },
      {
        carrierId: this.id,
        carrierName: this.name,
        serviceCode: 'PRIORITY_MAIL',
        serviceName: 'Priority Mail',
        price: Math.round((baseRate * 1.5) * 100) / 100,
        currency: 'USD',
        estimatedDays: 3,
      },
      {
        carrierId: this.id,
        carrierName: this.name,
        serviceCode: 'PRIORITY_MAIL_EXPRESS',
        serviceName: 'Priority Mail Express',
        price: Math.round((baseRate * 2.5) * 100) / 100,
        currency: 'USD',
        estimatedDays: 1,
        guaranteed: true,
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
    const baseUrl = testMode ? USPS_TEST_BASE : USPS_PROD_BASE;
    const accessToken = await this.getAccessToken(credentials, testMode);

    const weightOz = this.convertToOunces(packageDetails.weight, packageDetails.weightUnit);

    const response = await fetch(`${baseUrl}/labels/v3/label`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageInfo: {
          imageType: 'PDF',
          labelType: '4X6LABEL',
        },
        toAddress: {
          streetAddress: to.street1,
          secondaryAddress: to.street2 || '',
          city: to.city,
          state: to.state,
          ZIPCode: to.postalCode.substring(0, 5),
          firstName: to.name.split(' ')[0],
          lastName: to.name.split(' ').slice(1).join(' ') || to.name,
          phone: to.phone || '',
          email: to.email || '',
        },
        fromAddress: {
          streetAddress: from.street1,
          secondaryAddress: from.street2 || '',
          city: from.city,
          state: from.state,
          ZIPCode: from.postalCode.substring(0, 5),
          firstName: from.name.split(' ')[0],
          lastName: from.name.split(' ').slice(1).join(' ') || from.name,
          firm: from.company || '',
          phone: from.phone || '',
        },
        packageDescription: {
          weightOz: weightOz,
          length: packageDetails.length || 6,
          width: packageDetails.width || 4,
          height: packageDetails.height || 2,
          mailClass: serviceCode,
          processingCategory: 'MACHINABLE',
          rateIndicator: 'DR',
          destinationEntryFacilityType: 'NONE',
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`USPS label creation failed: ${errorText}`);
    }

    const data = await response.json();

    return {
      trackingNumber: data.trackingNumber,
      labelData: data.labelImage,
      labelFormat: 'PDF',
      cost: data.postage || 0,
      currency: 'USD',
      carrier: this.name,
      service: serviceCode,
    };
  }

  async getTracking(
    trackingNumber: string,
    credentials: CarrierCredentials,
    testMode: boolean
  ): Promise<TrackingInfo> {
    const baseUrl = testMode ? USPS_TEST_BASE : USPS_PROD_BASE;
    const accessToken = await this.getAccessToken(credentials, testMode);

    const response = await fetch(
      `${baseUrl}/tracking/v3/tracking/${trackingNumber}?expand=DETAIL`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to get tracking information');
    }

    const data = await response.json();
    const trackingEvents = data.trackingEvents || [];

    return {
      trackingNumber,
      carrier: this.name,
      status: this.mapTrackingStatus(data.statusCategory),
      estimatedDelivery: data.expectedDeliveryDate,
      events: trackingEvents.map((event: Record<string, string>) => ({
        timestamp: event.eventTimestamp,
        location: `${event.eventCity || ''}, ${event.eventState || ''} ${event.eventZIPCode || ''}`.trim(),
        status: event.eventType,
        description: event.eventDescription,
      })),
    };
  }

  private mapTrackingStatus(
    status: string
  ): TrackingInfo['status'] {
    const statusMap: Record<string, TrackingInfo['status']> = {
      'Pre-Shipment': 'pre_transit',
      'In Transit': 'in_transit',
      'Out for Delivery': 'out_for_delivery',
      'Delivered': 'delivered',
      'Alert': 'exception',
    };
    return statusMap[status] || 'unknown';
  }

  private convertToOunces(weight: number, unit: PackageDetails['weightUnit']): number {
    switch (unit) {
      case 'oz':
        return weight;
      case 'lb':
        return weight * 16;
      case 'kg':
        return weight * 35.274;
      case 'g':
        return weight * 0.035274;
      default:
        return weight;
    }
  }

  private convertToPounds(weight: number, unit: PackageDetails['weightUnit']): number {
    switch (unit) {
      case 'lb':
        return weight;
      case 'oz':
        return weight / 16;
      case 'kg':
        return weight * 2.205;
      case 'g':
        return weight * 0.002205;
      default:
        return weight;
    }
  }

  private getEstimatedDays(serviceCode: string): number {
    const estimates: Record<string, number> = {
      'USPS_GROUND_ADVANTAGE': 5,
      'PRIORITY_MAIL': 3,
      'PRIORITY_MAIL_EXPRESS': 1,
    };
    return estimates[serviceCode] || 5;
  }
}

export const uspsCarrier = new USPSCarrier();
