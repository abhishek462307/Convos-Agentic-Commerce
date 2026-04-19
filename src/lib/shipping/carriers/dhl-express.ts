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

const DHL_TEST_BASE = 'https://express.api.dhl.com/mydhlapi/test';
const DHL_PROD_BASE = 'https://express.api.dhl.com/mydhlapi';

export class DHLExpressCarrier implements ShippingCarrier {
  id = 'dhl-express';
  name = 'DHL Express';
  logo = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/DHL_Logo.svg/200px-DHL_Logo.svg.png';
  countries = ['*'];

  requiredCredentials = [
    {
      key: 'apiKey',
      label: 'API Key',
      type: 'password' as const,
      helpText: 'Your DHL Express MyDHL API Key',
      helpUrl: 'https://developer.dhl.com/',
    },
    {
      key: 'apiSecret',
      label: 'API Secret',
      type: 'password' as const,
      helpText: 'Your DHL Express MyDHL API Secret',
    },
    {
      key: 'accountNumber',
      label: 'DHL Account Number',
      type: 'text' as const,
      helpText: 'Your DHL Express shipper account number',
    },
  ];

  private getAuthHeader(credentials: CarrierCredentials): string {
    return 'Basic ' + Buffer.from(`${credentials.apiKey}:${credentials.apiSecret}`).toString('base64');
  }

  async validateCredentials(
    credentials: CarrierCredentials,
    testMode: boolean
  ): Promise<boolean> {
    try {
      const baseUrl = testMode ? DHL_TEST_BASE : DHL_PROD_BASE;
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const params = new URLSearchParams({
        accountNumber: credentials.accountNumber || '123456789',
        originCountryCode: 'US',
        originCityName: 'New York',
        destinationCountryCode: 'GB',
        destinationCityName: 'London',
        weight: '1',
        length: '10',
        width: '10',
        height: '10',
        plannedShippingDate: tomorrow.toISOString().split('T')[0],
        isCustomsDeclarable: 'true',
        unitOfMeasurement: 'metric',
      });
      const response = await fetch(`${baseUrl}/products?${params}`, {
        headers: {
          Authorization: this.getAuthHeader(credentials),
          'Content-Type': 'application/json',
        },
      });
      // 401 = bad credentials, 403 = wrong env, anything else = credentials OK
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
    const baseUrl = testMode ? DHL_TEST_BASE : DHL_PROD_BASE;
    const pkg = packages[0];
    const weightKg = this.convertToKg(pkg.weight, pkg.weightUnit);
    const { length, width, height } = this.getDimensionsCm(pkg);

    try {
      const params = new URLSearchParams({
        accountNumber: credentials.accountNumber,
        originCountryCode: from.country,
        originPostalCode: from.postalCode,
        originCityName: from.city,
        destinationCountryCode: to.country,
        destinationPostalCode: to.postalCode,
        destinationCityName: to.city,
        weight: Math.max(weightKg, 0.5).toString(),
        length: Math.max(length, 1).toString(),
        width: Math.max(width, 1).toString(),
        height: Math.max(height, 1).toString(),
        plannedShippingDate: new Date().toISOString().split('T')[0],
        isCustomsDeclarable: (from.country !== to.country).toString(),
        unitOfMeasurement: 'metric',
      });

      const response = await fetch(`${baseUrl}/rates?${params}`, {
        headers: {
          Authorization: this.getAuthHeader(credentials),
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const products = data.products || [];

        const rates: ShippingRate[] = products.map((product: Record<string, unknown>) => {
          const totalPrice = product.totalPrice as Array<Record<string, string | number>>;
          const deliveryCapabilities = product.deliveryCapabilities as Record<string, string>;
          
          return {
            carrierId: this.id,
            carrierName: this.name,
            serviceCode: product.productCode as string,
            serviceName: product.productName as string,
            price: parseFloat(totalPrice?.[0]?.price as string) || 0,
            currency: (totalPrice?.[0]?.priceCurrency as string) || 'USD',
            estimatedDays: this.getEstimatedDays(deliveryCapabilities?.deliveryTypeCode),
            estimatedDelivery: deliveryCapabilities?.estimatedDeliveryDateAndTime as string,
          };
        });

        if (rates.length > 0) {
          return rates.sort((a, b) => a.price - b.price);
        }
      }
    } catch (error) {
      logger.error('DHL Express rate fetch error:', error);
    }

    return this.getFallbackRates(from.country, to.country, weightKg);
  }

  private getFallbackRates(fromCountry: string, toCountry: string, weightKg: number): ShippingRate[] {
    const isDomestic = fromCountry === toCountry;
    const isEU = this.isEUCountry(fromCountry) && this.isEUCountry(toCountry);
    
    let baseRate: number;
    if (isDomestic) {
      baseRate = 25 + (weightKg * 3);
    } else if (isEU) {
      baseRate = 35 + (weightKg * 5);
    } else {
      baseRate = 55 + (weightKg * 8);
    }

    return [
      {
        carrierId: this.id,
        carrierName: this.name,
        serviceCode: 'P',
        serviceName: 'DHL Express Worldwide',
        price: Math.round(baseRate * 100) / 100,
        currency: 'EUR',
        estimatedDays: isDomestic ? 1 : isEU ? 2 : 4,
      },
      {
        carrierId: this.id,
        carrierName: this.name,
        serviceCode: 'U',
        serviceName: 'DHL Express Worldwide (Document)',
        price: Math.round((baseRate * 0.8) * 100) / 100,
        currency: 'EUR',
        estimatedDays: isDomestic ? 1 : isEU ? 2 : 4,
      },
      {
        carrierId: this.id,
        carrierName: this.name,
        serviceCode: 'K',
        serviceName: 'DHL Express 9:00',
        price: Math.round((baseRate * 1.5) * 100) / 100,
        currency: 'EUR',
        estimatedDays: 1,
        guaranteed: true,
      },
    ];
  }

  private isEUCountry(countryCode: string): boolean {
    const euCountries = [
      'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
      'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
      'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
    ];
    return euCountries.includes(countryCode);
  }

  async createLabel(
    from: Address,
    to: Address,
    packageDetails: PackageDetails,
    serviceCode: string,
    credentials: CarrierCredentials,
    testMode: boolean
  ): Promise<ShippingLabel> {
    const baseUrl = testMode ? DHL_TEST_BASE : DHL_PROD_BASE;
    const weightKg = this.convertToKg(packageDetails.weight, packageDetails.weightUnit);
    const { length, width, height } = this.getDimensionsCm(packageDetails);

    const isInternational = from.country !== to.country;

    const shipmentData: Record<string, unknown> = {
      plannedShippingDateAndTime: new Date().toISOString(),
      pickup: {
        isRequested: false,
      },
      productCode: serviceCode,
      accounts: [
        {
          typeCode: 'shipper',
          number: credentials.accountNumber,
        },
      ],
      customerDetails: {
        shipperDetails: {
          postalAddress: {
            postalCode: from.postalCode,
            cityName: from.city,
            countryCode: from.country,
            addressLine1: from.street1,
            addressLine2: from.street2 || '',
          },
          contactInformation: {
            email: from.email || 'noreply@example.com',
            phone: from.phone || '+10000000000',
            companyName: from.company || from.name,
            fullName: from.name,
          },
        },
        receiverDetails: {
          postalAddress: {
            postalCode: to.postalCode,
            cityName: to.city,
            countryCode: to.country,
            addressLine1: to.street1,
            addressLine2: to.street2 || '',
          },
          contactInformation: {
            email: to.email || 'noreply@example.com',
            phone: to.phone || '+10000000000',
            companyName: to.company || to.name,
            fullName: to.name,
          },
        },
      },
      content: {
        packages: [
          {
            weight: Math.max(weightKg, 0.5),
            dimensions: {
              length: Math.max(length, 1),
              width: Math.max(width, 1),
              height: Math.max(height, 1),
            },
          },
        ],
        isCustomsDeclarable: isInternational,
        declaredValue: 100,
        declaredValueCurrency: 'EUR',
        description: 'Package',
        incoterm: 'DAP',
        unitOfMeasurement: 'metric',
      },
      outputImageProperties: {
        printerDPI: 300,
        encodingFormat: 'pdf',
        imageOptions: [
          {
            typeCode: 'label',
            templateName: 'ECOM26_84_001',
          },
        ],
      },
    };

    if (isInternational) {
      (shipmentData.content as Record<string, unknown>).exportDeclaration = {
        lineItems: [
          {
            number: 1,
            description: 'Package contents',
            price: 100,
            priceCurrency: 'EUR',
            quantity: {
              value: 1,
              unitOfMeasurement: 'PCS',
            },
            commodityCodes: [
              {
                typeCode: 'outbound',
                value: '000000',
              },
            ],
            exportReasonType: 'permanent',
            manufacturerCountry: from.country,
            weight: {
              netValue: Math.max(weightKg, 0.5),
              grossValue: Math.max(weightKg, 0.5),
            },
          },
        ],
        invoice: {
          number: `INV-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
        },
        exportReason: 'Sale',
        exportReasonType: 'permanent',
      };
    }

    const response = await fetch(`${baseUrl}/shipments`, {
      method: 'POST',
      headers: {
        Authorization: this.getAuthHeader(credentials),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(shipmentData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DHL Express shipment creation failed: ${errorText}`);
    }

    const data = await response.json();

    const trackingNumber = data.shipmentTrackingNumber;
    const documents = data.documents || [];
    const labelDoc = documents.find((d: Record<string, string>) => d.typeCode === 'label');

    return {
      trackingNumber: trackingNumber,
      labelData: labelDoc?.content || '',
      labelFormat: 'PDF',
      cost: data.estimatedDeliveryDate?.totalPrice?.[0]?.price || 0,
      currency: data.estimatedDeliveryDate?.totalPrice?.[0]?.priceCurrency || 'EUR',
      carrier: this.name,
      service: serviceCode,
    };
  }

  async getTracking(
    trackingNumber: string,
    credentials: CarrierCredentials,
    testMode: boolean
  ): Promise<TrackingInfo> {
    const baseUrl = testMode ? DHL_TEST_BASE : DHL_PROD_BASE;

    const response = await fetch(
      `${baseUrl}/shipments/${trackingNumber}/tracking`,
      {
        headers: {
          Authorization: this.getAuthHeader(credentials),
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
    const shipments = data.shipments || [];
    const shipment = shipments[0];

    if (!shipment) {
      return {
        trackingNumber,
        carrier: this.name,
        status: 'unknown',
        events: [],
      };
    }

    const events = shipment.events || [];

    return {
      trackingNumber,
      carrier: this.name,
      status: this.mapStatus(shipment.status?.statusCode),
      estimatedDelivery: shipment.estimatedDeliveryDate,
      events: events.map((event: Record<string, unknown>) => {
        const serviceArea = event.serviceArea as Record<string, string>;
        return {
          timestamp: event.timestamp as string,
          location: `${serviceArea?.description || ''}, ${event.location as string || ''}`.trim(),
          status: event.statusCode as string,
          description: event.description as string,
        };
      }),
    };
  }

  private mapStatus(statusCode: string): TrackingInfo['status'] {
    const statusMap: Record<string, TrackingInfo['status']> = {
      'PU': 'pre_transit',
      'PL': 'in_transit',
      'AF': 'in_transit',
      'AR': 'in_transit',
      'DF': 'in_transit',
      'CC': 'in_transit',
      'WC': 'out_for_delivery',
      'OK': 'delivered',
      'OH': 'exception',
      'NH': 'exception',
    };
    return statusMap[statusCode] || 'unknown';
  }

  private getEstimatedDays(deliveryType?: string): number {
    const estimates: Record<string, number> = {
      'TD': 1,
      'QDDC': 1,
      'QDDF': 2,
    };
    return estimates[deliveryType || ''] || 3;
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

export const dhlExpressCarrier = new DHLExpressCarrier();
