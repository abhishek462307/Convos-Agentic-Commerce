export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
];

export const ALL_COUNTRIES: Record<string, string> = {
  'US': 'United States',
  'CA': 'Canada',
  'GB': 'United Kingdom',
  'DE': 'Germany',
  'FR': 'France',
  'IT': 'Italy',
  'ES': 'Spain',
  'NL': 'Netherlands',
  'BE': 'Belgium',
  'AT': 'Austria',
  'PT': 'Portugal',
  'SE': 'Sweden',
  'NO': 'Norway',
  'DK': 'Denmark',
  'FI': 'Finland',
  'PL': 'Poland',
  'CH': 'Switzerland',
  'IE': 'Ireland',
  'AU': 'Australia',
  'NZ': 'New Zealand',
  'JP': 'Japan',
  'KR': 'South Korea',
  'SG': 'Singapore',
  'HK': 'Hong Kong',
  'IN': 'India',
  'AE': 'United Arab Emirates',
  'SA': 'Saudi Arabia',
  'ZA': 'South Africa',
  'BR': 'Brazil',
  'MX': 'Mexico',
  'AR': 'Argentina',
  'CL': 'Chile',
  'CO': 'Colombia',
  'MY': 'Malaysia',
  'TH': 'Thailand',
  'ID': 'Indonesia',
  'PH': 'Philippines',
  'VN': 'Vietnam',
  'TW': 'Taiwan',
  'CN': 'China',
  'RU': 'Russia',
  'TR': 'Turkey',
  'IL': 'Israel',
  'EG': 'Egypt',
  'NG': 'Nigeria',
  'KE': 'Kenya',
};

export interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
}

export interface PaymentMethods {
  cod: { enabled: boolean };
  stripe: { enabled: boolean; secret_key: string | null; publishable_key: string | null };
  razorpay: { enabled: boolean; key_id: string | null; key_secret: string | null };
  paypal: { enabled: boolean; client_id: string | null; client_secret: string | null };
}

export interface CountryTaxRate {
  country_code: string;
  country_name: string;
  rate: number;
  tax_name?: string;
}

export interface TaxSettings {
  enabled: boolean;
  default_rate: number;
  include_in_price: boolean;
  country_rates: CountryTaxRate[];
}

export function validateCheckoutForm(formData: {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}): FormErrors {
  const errors: FormErrors = {};
  if (!formData.name.trim()) errors.name = 'Name is required';
  if (!formData.email.trim()) errors.email = 'Email is required';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = 'Invalid email';
  if (!formData.phone.trim()) errors.phone = 'Phone is required';
  if (!formData.address.trim()) errors.address = 'Address is required';
  if (!formData.city.trim()) errors.city = 'City is required';
  if (formData.country === 'IN' && !formData.state) errors.state = 'State is required';
  if (!formData.pincode.trim()) errors.pincode = 'PIN code is required';
  return errors;
}

export function calculateOrderTotals(
  cart: any[],
  appliedDiscount: any | null,
  taxSettings: TaxSettings | null,
  selectedCountry: string,
  shippingCost: number = 0
) {
  const subtotal = cart.reduce((acc, item) => acc + ((item.bargainedPrice || item.price) * item.quantity), 0);

  let discountAmount = 0;
  if (appliedDiscount) {
    const eligibleAmount = cart.reduce((acc, item) => {
      if (!item.bargainedPrice) return acc + (item.price * item.quantity);
      return acc;
    }, 0);
    const base = appliedDiscount.excludeBargainedItems ? eligibleAmount : subtotal;
    if (appliedDiscount.discountType === 'percentage') {
      discountAmount = (base * appliedDiscount.discountValue) / 100;
    } else {
      discountAmount = Math.min(appliedDiscount.discountValue, base);
    }
  }

  let taxAmount = 0;
  let taxRate = 0;
  if (taxSettings?.enabled) {
    const countryRate = taxSettings.country_rates?.find((r) => r.country_code === selectedCountry);
    taxRate = countryRate ? countryRate.rate : taxSettings.default_rate;
    const taxableAmount = subtotal - discountAmount;
    taxAmount = (taxableAmount * taxRate) / 100;
  }

  const total = subtotal - discountAmount + taxAmount + shippingCost;

  return { subtotal, discountAmount, taxAmount, taxRate, total };
}
