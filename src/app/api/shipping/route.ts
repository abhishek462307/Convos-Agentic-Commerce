import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { carriers, getCarrier, validateCarrierCredentials, getAllRates, createShipment, trackShipment } from '@/lib/shipping';
import { getAuthUser, getMerchantAccess } from '@/lib/api-auth';
import logger from '@/lib/logger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getShippingConfigs(merchantId: string) {
  const { data: merchant } = await supabase
    .from('merchants')
    .select('shipping_carriers')
    .eq('id', merchantId)
    .single();
  
  const raw = merchant?.shipping_carriers;
  // Coerce legacy array values to an empty object
  if (!raw || Array.isArray(raw)) return {};
  return raw as Record<string, unknown>;
}

async function saveShippingConfig(merchantId: string, carrierId: string, config: Record<string, unknown>) {
  const existingConfigs = await getShippingConfigs(merchantId);
  const updatedConfigs = {
    ...existingConfigs,
    [carrierId]: config,
  };
  
  const { error } = await supabase
    .from('merchants')
    .update({ shipping_carriers: updatedConfigs })
    .eq('id', merchantId);
  
  return { error };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const merchantId = searchParams.get('merchantId');

  if (!merchantId) {
    return NextResponse.json({ carriers: Object.values(carriers).map(c => ({
      id: c.id,
      name: c.name,
      logo: c.logo,
      countries: c.countries,
      requiredCredentials: c.requiredCredentials,
    })) });
  }

  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const access = await getMerchantAccess(user.id, merchantId);
  if (!access.ok) {
    return NextResponse.json({ error: 'Forbidden' }, { status: access.status });
  }

  const configs = await getShippingConfigs(merchantId);

  const carrierData = Object.values(carriers).map(c => {
    const config = configs[c.id] as Record<string, unknown> | undefined;
    return {
      id: c.id,
      name: c.name,
      logo: c.logo,
      countries: c.countries,
      requiredCredentials: c.requiredCredentials,
      isConfigured: !!config,
      isEnabled: config?.is_enabled || false,
      isTestMode: config?.is_test_mode ?? true,
    };
  });

  return NextResponse.json({ carriers: carrierData, configs });
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, merchantId, carrierId, ...data } = body;

    if (!merchantId) {
      return NextResponse.json({ error: 'Merchant ID required' }, { status: 400 });
    }

    const access = await getMerchantAccess(user.id, merchantId);
    if (!access.ok) {
      return NextResponse.json({ error: 'Forbidden' }, { status: access.status });
    }

    switch (action) {
      case 'saveConfig': {
        const { credentials, settings, isEnabled, isTestMode } = data;
        const carrier = getCarrier(carrierId);
        
        if (!carrier) {
          return NextResponse.json({ error: 'Carrier not found' }, { status: 404 });
        }

        const isValid = await validateCarrierCredentials(carrierId, credentials, isTestMode);
        
        const config = {
          carrier_slug: carrierId,
          carrier_name: carrier.name,
          credentials: credentials,
          settings: settings || {},
          is_enabled: isEnabled,
          is_test_mode: isTestMode,
          updated_at: new Date().toISOString(),
        };

        const { error } = await saveShippingConfig(merchantId, carrierId, config);

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ 
          success: true, 
          config,
          credentialsValid: isValid,
          message: isValid ? 'Configuration saved and credentials verified' : 'Configuration saved but credentials could not be verified'
        });
      }

      case 'getRates': {
        const { from, to, packages } = data;

        const configs = await getShippingConfigs(merchantId);
        const enabledConfigs = Object.entries(configs)
          .filter(([, cfg]) => (cfg as Record<string, unknown>).is_enabled)
          .map(([id, cfg]) => {
            const config = cfg as Record<string, unknown>;
            return {
              carrierId: id,
              credentials: config.credentials as Record<string, string>,
              testMode: config.is_test_mode as boolean,
            };
          });

        if (enabledConfigs.length === 0) {
          return NextResponse.json({ error: 'No shipping carriers configured' }, { status: 400 });
        }

        const rates = await getAllRates(from, to, packages, enabledConfigs);
        return NextResponse.json({ rates });
      }

       case 'createLabel': {
          const { from, to, packageDetails, serviceCode, orderId, serviceCarrierName, serviceName, ratePrice, rateCurrency } = data;

          const configs = await getShippingConfigs(merchantId);
          const config = configs[carrierId] as Record<string, unknown> | undefined;

          if (!config) {
            return NextResponse.json({ error: 'Carrier not configured' }, { status: 400 });
          }

          const label = await createShipment(
            carrierId,
            from,
            to,
            packageDetails,
            serviceCode,
            config.credentials as Record<string, string>,
            config.is_test_mode as boolean
          );

            // Persist label to DB
            const { data: labelRecord } = await supabase
              .from('shipping_labels')
              .insert({
                merchant_id: merchantId,
                order_id: orderId || null,
                carrier_id: carrierId,
                carrier_name: serviceCarrierName || carrierId,
                service_code: serviceCode,
                service_name: serviceName || null,
                tracking_number: label.trackingNumber || null,
                tracking_url: label.trackingUrl || null,
                label_url: label.labelUrl || null,
                label_data: label.labelData || null,
                label_format: label.labelFormat || 'PDF',
                rate_price: ratePrice || null,
                rate_currency: rateCurrency || 'USD',
                from_address: from,
                to_address: to,
                package_details: packageDetails,
                raw_response: label,
                status: 'created',
              })
              .select('id')
              .single();

          // Update order with label ID
          if (labelRecord?.id && orderId) {
            await supabase
              .from('orders')
              .update({ shipping_label_id: labelRecord.id })
              .eq('id', orderId);
          }

          return NextResponse.json({ label, labelId: labelRecord?.id });
        }

      case 'track': {
        const { trackingNumber } = data;

        const configs = await getShippingConfigs(merchantId);
        const config = configs[carrierId] as Record<string, unknown> | undefined;

        if (!config) {
          return NextResponse.json({ error: 'Carrier not configured' }, { status: 400 });
        }

        const tracking = await trackShipment(
          carrierId,
          trackingNumber,
          config.credentials as Record<string, string>,
          config.is_test_mode as boolean
        );

        return NextResponse.json({ tracking });
      }

      case 'deleteConfig': {
        const existingConfigs = await getShippingConfigs(merchantId);
        delete existingConfigs[carrierId];
        
        const { error } = await supabase
          .from('merchants')
          .update({ shipping_carriers: existingConfigs })
          .eq('id', merchantId);

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    logger.error('Shipping API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
