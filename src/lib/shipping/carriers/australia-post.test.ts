import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/logger', () => ({
  default: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { AustraliaPostCarrier } from './australia-post';
import type { Address, PackageDetails, CarrierCredentials } from '../types';

const carrier = new AustraliaPostCarrier();

const creds: CarrierCredentials = {
  apiKey: 'test-api-key',
  accountNumber: 'ACC123',
  password: 'secret',
};

const fromAddr: Address = {
  name: 'Sender',
  street1: '123 Main St',
  city: 'Melbourne',
  state: 'VIC',
  postalCode: '3000',
  country: 'AU',
};

const toAddrDomestic: Address = {
  name: 'Receiver',
  street1: '456 George St',
  city: 'Sydney',
  state: 'NSW',
  postalCode: '2000',
  country: 'AU',
};

const toAddrInternational: Address = {
  name: 'Overseas',
  street1: '789 Queen St',
  city: 'Auckland',
  state: 'AKL',
  postalCode: '1010',
  country: 'NZ',
};

const pkg: PackageDetails = {
  weight: 1,
  weightUnit: 'kg',
  length: 20,
  width: 15,
  height: 10,
  dimensionUnit: 'cm',
};

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('AustraliaPostCarrier', () => {
  it('has correct carrier metadata', () => {
    expect(carrier.id).toBe('australia-post');
    expect(carrier.name).toBe('Australia Post');
    expect(carrier.countries).toEqual(['AU']);
    expect(carrier.requiredCredentials).toHaveLength(3);
  });

  describe('validateCredentials', () => {
    it('returns true when API responds ok', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response('{}', { status: 200 })
      );
      const result = await carrier.validateCredentials(creds, false);
      expect(result).toBe(true);
      expect(fetch).toHaveBeenCalledOnce();
    });

    it('returns false when API responds with error', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response('Unauthorized', { status: 401 })
      );
      const result = await carrier.validateCredentials(creds, false);
      expect(result).toBe(false);
    });

    it('returns false when fetch throws', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'));
      const result = await carrier.validateCredentials(creds, false);
      expect(result).toBe(false);
    });
  });

  describe('getRates — domestic', () => {
    it('returns parsed rates from API on success', async () => {
      const apiResponse = {
        services: {
          service: [
            { code: 'AUS_PARCEL_REGULAR', name: 'Parcel Post', price: '12.50' },
            { code: 'AUS_PARCEL_EXPRESS', name: 'Express Post', price: '18.00' },
          ],
        },
      };
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(apiResponse), { status: 200 })
      );

      const rates = await carrier.getRates(fromAddr, toAddrDomestic, [pkg], creds, false);
      expect(rates).toHaveLength(2);
      expect(rates[0].price).toBe(12.50);
      expect(rates[0].carrierId).toBe('australia-post');
      expect(rates[0].currency).toBe('AUD');
      expect(rates[1].price).toBe(18.00);
    });

    it('returns fallback rates when API fails', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response('Server Error', { status: 500 })
      );

      const rates = await carrier.getRates(fromAddr, toAddrDomestic, [pkg], creds, false);
      expect(rates).toHaveLength(2);
      expect(rates[0].serviceCode).toBe('AUS_PARCEL_REGULAR');
      expect(rates[1].serviceCode).toBe('AUS_PARCEL_EXPRESS');
      expect(rates[0].price).toBeGreaterThan(0);
      expect(rates[1].price).toBeGreaterThan(rates[0].price);
    });

    it('returns fallback rates when fetch throws', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('timeout'));

      const rates = await carrier.getRates(fromAddr, toAddrDomestic, [pkg], creds, false);
      expect(rates).toHaveLength(2);
      expect(rates[0].serviceCode).toBe('AUS_PARCEL_REGULAR');
    });

    it('sorts rates by price ascending', async () => {
      const apiResponse = {
        services: {
          service: [
            { code: 'AUS_PARCEL_EXPRESS', name: 'Express Post', price: '18.00' },
            { code: 'AUS_PARCEL_REGULAR', name: 'Parcel Post', price: '12.50' },
          ],
        },
      };
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(apiResponse), { status: 200 })
      );

      const rates = await carrier.getRates(fromAddr, toAddrDomestic, [pkg], creds, false);
      expect(rates[0].price).toBeLessThanOrEqual(rates[1].price);
    });
  });

  describe('getRates — international', () => {
    it('returns parsed international rates from API', async () => {
      const apiResponse = {
        services: {
          service: [
            { code: 'INT_PARCEL_STD_OWN_PACKAGING', name: 'International Standard', price: '30.00' },
          ],
        },
      };
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(apiResponse), { status: 200 })
      );

      const rates = await carrier.getRates(fromAddr, toAddrInternational, [pkg], creds, false);
      expect(rates).toHaveLength(1);
      expect(rates[0].price).toBe(30.00);
      expect(rates[0].currency).toBe('AUD');
    });

    it('returns international fallback rates when API fails', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response('Error', { status: 500 })
      );

      const rates = await carrier.getRates(fromAddr, toAddrInternational, [pkg], creds, false);
      expect(rates).toHaveLength(2);
      expect(rates[0].serviceCode).toBe('INT_PARCEL_STD_OWN_PACKAGING');
      expect(rates[1].serviceCode).toBe('INT_PARCEL_EXP_OWN_PACKAGING');
    });

    it('zone 1 rates are cheaper than zone 3', async () => {
      vi.spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(new Response('Error', { status: 500 }))
        .mockResolvedValueOnce(new Response('Error', { status: 500 }));

      const zone1Rates = await carrier.getRates(fromAddr, { ...toAddrInternational, country: 'NZ' }, [pkg], creds, false);
      const zone3Rates = await carrier.getRates(fromAddr, { ...toAddrInternational, country: 'GB' }, [pkg], creds, false);
      expect(zone1Rates[0].price).toBeLessThan(zone3Rates[0].price);
    });
  });

  describe('weight conversion', () => {
    it('handles grams correctly', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response('Error', { status: 500 })
      );
      const gPkg: PackageDetails = { ...pkg, weight: 500, weightUnit: 'g' };
      const rates = await carrier.getRates(fromAddr, toAddrDomestic, [gPkg], creds, false);
      expect(rates).toHaveLength(2);
      expect(rates[0].price).toBeGreaterThan(0);
    });

    it('handles pounds correctly', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response('Error', { status: 500 })
      );
      const lbPkg: PackageDetails = { ...pkg, weight: 2, weightUnit: 'lb' };
      const rates = await carrier.getRates(fromAddr, toAddrDomestic, [lbPkg], creds, false);
      expect(rates).toHaveLength(2);
    });

    it('handles ounces correctly', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response('Error', { status: 500 })
      );
      const ozPkg: PackageDetails = { ...pkg, weight: 16, weightUnit: 'oz' };
      const rates = await carrier.getRates(fromAddr, toAddrDomestic, [ozPkg], creds, false);
      expect(rates).toHaveLength(2);
    });
  });

  describe('dimension conversion', () => {
    it('converts inches to cm', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response('Error', { status: 500 })
      );
      const inPkg: PackageDetails = { ...pkg, dimensionUnit: 'in', length: 10, width: 8, height: 4 };
      const rates = await carrier.getRates(fromAddr, toAddrDomestic, [inPkg], creds, false);
      expect(rates).toHaveLength(2);
    });
  });
});
