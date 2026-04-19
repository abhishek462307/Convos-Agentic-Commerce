export interface Address {
  name: string;
  company?: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
  email?: string;
}

export interface PackageDetails {
  weight: number;
  weightUnit: 'kg' | 'lb' | 'oz' | 'g';
  length?: number;
  width?: number;
  height?: number;
  dimensionUnit?: 'cm' | 'in';
}

export interface ShippingRate {
  carrierId: string;
  carrierName: string;
  serviceCode: string;
  serviceName: string;
  price: number;
  currency: string;
  estimatedDays?: number;
  estimatedDelivery?: string;
  guaranteed?: boolean;
}

export interface ShippingLabel {
  trackingNumber: string;
  trackingUrl?: string;
  labelUrl?: string;
  labelData?: string;
  labelFormat: 'PDF' | 'PNG' | 'ZPL';
  cost: number;
  currency: string;
  carrier: string;
  service: string;
}

export interface TrackingEvent {
  timestamp: string;
  location?: string;
  status: string;
  description: string;
}

export interface TrackingInfo {
  trackingNumber: string;
  carrier: string;
  status: 'pre_transit' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'exception' | 'unknown';
  estimatedDelivery?: string;
  events: TrackingEvent[];
}

export interface CarrierCredentials {
  [key: string]: string;
}

export interface CarrierConfig {
  carrierId: string;
  carrierName: string;
  isEnabled: boolean;
  isTestMode: boolean;
  credentials: CarrierCredentials;
  settings: Record<string, unknown>;
}

export interface ShippingCarrier {
  id: string;
  name: string;
  logo?: string;
  countries: string[];
  requiredCredentials: {
    key: string;
    label: string;
    type: 'text' | 'password';
    helpText?: string;
    helpUrl?: string;
  }[];
  
  validateCredentials(credentials: CarrierCredentials, testMode: boolean): Promise<boolean>;
  getRates(
    from: Address,
    to: Address,
    packages: PackageDetails[],
    credentials: CarrierCredentials,
    testMode: boolean
  ): Promise<ShippingRate[]>;
  createLabel(
    from: Address,
    to: Address,
    packageDetails: PackageDetails,
    serviceCode: string,
    credentials: CarrierCredentials,
    testMode: boolean
  ): Promise<ShippingLabel>;
  getTracking(
    trackingNumber: string,
    credentials: CarrierCredentials,
    testMode: boolean
  ): Promise<TrackingInfo>;
  cancelLabel?(
    trackingNumber: string,
    credentials: CarrierCredentials,
    testMode: boolean
  ): Promise<boolean>;
}
