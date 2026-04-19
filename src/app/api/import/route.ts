import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getAuthUser, getMerchantAccess } from '@/lib/api-auth';
import logger from '@/lib/logger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const merchantId = formData.get('merchantId') as string;
    const type = formData.get('type') as string || 'products';

    if (!file || !merchantId) {
      return NextResponse.json({ error: 'Missing file or merchantId' }, { status: 400 });
    }

    const access = await getMerchantAccess(user.id, merchantId);
    if (!access.ok) {
      return NextResponse.json({ error: 'Forbidden' }, { status: access.status });
    }

    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSV file is empty or has no data rows' }, { status: 400 });
    }

    const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
    const results = { success: 0, errors: 0, messages: [] as string[] };

    if (type === 'products') {
      for (let i = 1; i < lines.length; i++) {
        try {

          const values = parseCSVLine(lines[i]);
          const row: Record<string, any> = {};
          headers.forEach((h, idx) => {
            row[h] = values[idx] || '';
          });

          const nameIdx = headers.indexOf('name');
          if (nameIdx === -1 || !values[nameIdx]) {
            results.errors++;
            results.messages.push(`Row ${i + 1}: Missing product name`);
            continue;
          }

          let categoryId = null;
          const categoryName = row['category'];
          if (categoryName) {
            const { data: existingCat } = await supabase
              .from('categories')
              .select('id')
              .eq('merchant_id', merchantId)
              .eq('name', categoryName)
              .single();
            
            if (existingCat) {
              categoryId = existingCat.id;
            } else {
              const { data: newCat } = await supabase
                .from('categories')
                .insert({ merchant_id: merchantId, name: categoryName })
                .select('id')
                .single();
              if (newCat) categoryId = newCat.id;
            }
          }

          const productData = {
            merchant_id: merchantId,
            name: row['name'],
            description: row['description'] || null,
            price: parseFloat(row['price']) || 0,
            sku: row['sku'] || null,
            stock_quantity: row['stock quantity'] ? parseInt(row['stock quantity']) : null,
            category_id: categoryId,
            badge: row['badge'] || null,
            image_url: row['image url'] || null,
            meta_title: row['meta title'] || null,
            meta_description: row['meta description'] || null,
          };

          const { error } = await supabase.from('products').insert(productData);
          
          if (error) {
            results.errors++;
            results.messages.push(`Row ${i + 1}: ${error.message}`);
          } else {
            results.success++;
          }
        } catch (err: any) {
          results.errors++;
          results.messages.push(`Row ${i + 1}: ${err.message}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      imported: results.success,
      errors: results.errors,
      messages: results.messages.slice(0, 10)
    });
  } catch (err: any) {
    logger.error('Import error:', err);
    return NextResponse.json({ error: err.message || 'Import failed' }, { status: 500 });
  }
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}
