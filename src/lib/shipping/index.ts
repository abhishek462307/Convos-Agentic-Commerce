import logger from '@/lib/logger';
import { ShippingCarrier, Address, PackageDetails, ShippingRate, ShippingLabel, TrackingInfo, CarrierCredentials } from './types';
import { uspsCarrier } from './carriers/usps';
import { royalMailCarrier } from './carriers/royal-mail';
import { delhiveryCarrier } from './carriers/delhivery';
import { australiaPostCarrier } from './carriers/australia-post';
import { dhlExpressCarrier } from './carriers/dhl-express';

export const carriers: Record<string, ShippingCarrier> = {
  'usps': uspsCarrier,
  'royal-mail': royalMailCarrier,
  'delhivery': delhiveryCarrier,
  'australia-post': australiaPostCarrier,
  'dhl-express': dhlExpressCarrier,
};

export const carrierList = Object.values(carriers);

export function getCarrier(carrierId: string): ShippingCarrier | undefined {
  return carriers[carrierId];
}

export function getCarriersForCountry(countryCode: string): ShippingCarrier[] {
  return carrierList.filter(carrier => 
    carrier.countries.includes('*') || carrier.countries.includes(countryCode)
  );
}

export async function getAllRates(
  from: Address,
  to: Address,
  packages: PackageDetails[],
  carrierConfigs: Array<{
    carrierId: string;
    credentials: CarrierCredentials;
    testMode: boolean;
  }>
): Promise<ShippingRate[]> {
  const ratePromises = carrierConfigs.map(async (config) => {
    const carrier = getCarrier(config.carrierId);
    if (!carrier) return [];
    
    try {
      return await carrier.getRates(
        from,
        to,
        packages,
        config.credentials,
        config.testMode
      );
    } catch (error) {
      logger.error(`Error getting rates from ${config.carrierId}:`, error);
      return [];
    }
  });

  const results = await Promise.all(ratePromises);
  return results.flat().sort((a, b) => a.price - b.price);
}

export async function createShipment(
  carrierId: string,
  from: Address,
  to: Address,
  packageDetails: PackageDetails,
  serviceCode: string,
  credentials: CarrierCredentials,
  testMode: boolean
): Promise<ShippingLabel> {
  const carrier = getCarrier(carrierId);
  if (!carrier) {
    throw new Error(`Carrier ${carrierId} not found`);
  }
  
  return carrier.createLabel(from, to, packageDetails, serviceCode, credentials, testMode);
}

export async function trackShipment(
  carrierId: string,
  trackingNumber: string,
  credentials: CarrierCredentials,
  testMode: boolean
): Promise<TrackingInfo> {
  const carrier = getCarrier(carrierId);
  if (!carrier) {
    throw new Error(`Carrier ${carrierId} not found`);
  }
  
  return carrier.getTracking(trackingNumber, credentials, testMode);
}

export async function validateCarrierCredentials(
  carrierId: string,
  credentials: CarrierCredentials,
  testMode: boolean
): Promise<boolean> {
  const carrier = getCarrier(carrierId);
  if (!carrier) {
    return false;
  }
  
  return carrier.validateCredentials(credentials, testMode);
}

export * from './types';
