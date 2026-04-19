import { NextRequest, NextResponse } from 'next/server';
import { jsPDF } from 'jspdf';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';
import { getAuthUser, getMerchantAccess } from '@/lib/api-auth';
import logger from '@/lib/logger';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function formatCurrency(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

function generateInvoicePDF(order: any, merchant: any, orderItems: any[]): Buffer {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const currency = merchant?.currency || 'USD';
  const pageWidth = doc.internal.pageSize.getWidth();
  
  const taxInfo = order.customer_info?.tax_applied || {};
  const taxName = taxInfo.name || 'Tax';
  const taxRate = taxInfo.rate || 0;

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('TAX INVOICE', 20, 22);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Invoice #: INV-${order.id.slice(0, 8).toUpperCase()}`, 20, 32);
  doc.text(`Date: ${new Date(order.created_at).toLocaleDateString()}`, 20, 37);
  doc.text(`Order ID: ${order.id.slice(0, 8).toUpperCase()}`, 20, 42);
  doc.text(`Payment: ${order.payment_method === 'cod' ? 'Cash on Delivery' : (order.payment_method || 'N/A').toUpperCase()}`, 20, 47);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(merchant?.store_name || 'Store', pageWidth - 20, 22, { align: 'right' });
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  let sellerY = 30;
  
  if (merchant?.business_name) {
    doc.text(merchant.business_name, pageWidth - 20, sellerY, { align: 'right' });
    sellerY += 4;
  }
  if (merchant?.business_address) {
    doc.text(merchant.business_address, pageWidth - 20, sellerY, { align: 'right' });
    sellerY += 4;
  }
  if (merchant?.contact_email) {
    doc.text(merchant.contact_email, pageWidth - 20, sellerY, { align: 'right' });
    sellerY += 4;
  }
  if (merchant?.contact_phone) {
    doc.text(merchant.contact_phone, pageWidth - 20, sellerY, { align: 'right' });
    sellerY += 4;
  }
  if (merchant?.tax_id) {
    doc.setFont('helvetica', 'bold');
    doc.text(`Tax ID: ${merchant.tax_id}`, pageWidth - 20, sellerY, { align: 'right' });
  }

  doc.setDrawColor(200, 200, 200);
  doc.line(20, 55, pageWidth - 20, 55);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('BILL TO:', 20, 64);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  let billToY = 71;
  doc.text(order.customer_info?.name || 'Customer', 20, billToY);
  billToY += 4;
  if (order.customer_info?.email) {
    doc.text(order.customer_info.email, 20, billToY);
    billToY += 4;
  }
  if (order.customer_info?.phone) {
    doc.text(order.customer_info.phone, 20, billToY);
    billToY += 4;
  }
  if (order.customer_info?.address) {
    doc.text(order.customer_info.address, 20, billToY);
    billToY += 4;
  }
  let addressLine = '';
  if (order.customer_info?.city) addressLine += order.customer_info.city;
  if (order.customer_info?.state) addressLine += (addressLine ? ', ' : '') + order.customer_info.state;
  if (order.customer_info?.pincode) addressLine += (addressLine ? ' - ' : '') + order.customer_info.pincode;
  if (order.customer_info?.country) addressLine += (addressLine ? ', ' : '') + order.customer_info.country;
  if (addressLine) {
    doc.text(addressLine, 20, billToY);
  }

  if (order.customer_info?.address) {
    doc.setFont('helvetica', 'bold');
    doc.text('SHIP TO:', 110, 64);
    doc.setFont('helvetica', 'normal');
    let shipY = 71;
    doc.text(order.customer_info?.name || 'Customer', 110, shipY);
    shipY += 4;
    doc.text(order.customer_info.address, 110, shipY);
    shipY += 4;
    if (addressLine) {
      doc.text(addressLine, 110, shipY);
    }
  }

  const tableTop = 105;
  doc.setFillColor(240, 240, 240);
  doc.rect(20, tableTop - 4, pageWidth - 40, 8, 'F');
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);
  doc.text('#', 22, tableTop);
  doc.text('DESCRIPTION', 30, tableTop);
  doc.text('HSN/SAC', 95, tableTop);
  doc.text('QTY', 115, tableTop, { align: 'center' });
  doc.text('RATE', 135, tableTop, { align: 'right' });
  doc.text('AMOUNT', pageWidth - 22, tableTop, { align: 'right' });

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');

  let yPos = tableTop + 10;
  orderItems.forEach((item, index) => {
    const itemName = (item.products?.name || 'Product').substring(0, 35);
    const qty = item.quantity;
    const price = Number(item.price_at_purchase);
    const total = price * qty;

    doc.setFontSize(8);
    doc.text((index + 1).toString(), 22, yPos);
    doc.text(itemName, 30, yPos);
    doc.text('-', 95, yPos);
    doc.text(qty.toString(), 115, yPos, { align: 'center' });
    doc.text(formatCurrency(price, currency), 135, yPos, { align: 'right' });
    doc.text(formatCurrency(total, currency), pageWidth - 22, yPos, { align: 'right' });
    
    doc.setDrawColor(230, 230, 230);
    doc.line(20, yPos + 3, pageWidth - 20, yPos + 3);
    yPos += 8;
  });

  yPos += 5;
  doc.setDrawColor(200, 200, 200);
  doc.line(120, yPos, pageWidth - 20, yPos);

  yPos += 8;
  const subtotal = orderItems.reduce((sum, item) => sum + (Number(item.price_at_purchase) * item.quantity), 0);
  const shipping = order.shipping_amount || order.customer_info?.shipping_applied?.amount || 0;
  const tax = order.tax_amount || taxInfo.amount || 0;
  const discount = order.payment_details?.discount_amount || 0;

  doc.setFontSize(8);
  doc.text('Subtotal:', 145, yPos, { align: 'right' });
  doc.text(formatCurrency(subtotal, currency), pageWidth - 22, yPos, { align: 'right' });

  if (discount > 0) {
    yPos += 6;
    doc.setTextColor(0, 128, 96);
    doc.text(`Discount (${order.payment_details?.discount_applied || 'Applied'}):`, 145, yPos, { align: 'right' });
    doc.text(`-${formatCurrency(discount, currency)}`, pageWidth - 22, yPos, { align: 'right' });
    doc.setTextColor(0, 0, 0);
  }

  yPos += 6;
  doc.text('Shipping:', 145, yPos, { align: 'right' });
  doc.text(shipping > 0 ? formatCurrency(shipping, currency) : 'FREE', pageWidth - 22, yPos, { align: 'right' });

  if (tax > 0) {
    yPos += 6;
    const taxLabel = taxRate > 0 ? `${taxName} (${taxRate}%):` : `${taxName}:`;
    doc.text(taxLabel, 145, yPos, { align: 'right' });
    doc.text(formatCurrency(tax, currency), pageWidth - 22, yPos, { align: 'right' });
  }

  yPos += 10;
  doc.setDrawColor(0, 128, 96);
  doc.setLineWidth(0.5);
  doc.line(120, yPos - 3, pageWidth - 20, yPos - 3);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL:', 145, yPos, { align: 'right' });
  doc.text(formatCurrency(order.total_amount, currency), pageWidth - 22, yPos, { align: 'right' });

  const footerY = 250;
  doc.setDrawColor(200, 200, 200);
  doc.line(20, footerY, pageWidth - 20, footerY);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);

  if (taxRate > 0 || tax > 0) {
    doc.text(`Tax Summary: ${taxName} @ ${taxRate}% = ${formatCurrency(tax, currency)}`, 20, footerY + 8);
  }

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 128, 96);
  doc.text('Thank you for your business!', pageWidth / 2, footerY + 20, { align: 'center' });
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(130, 130, 130);
  doc.text('This is a computer-generated invoice. No signature required.', pageWidth / 2, footerY + 26, { align: 'center' });
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, footerY + 30, { align: 'center' });

  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orderId, sendEmail } = await request.json();

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*, order_items(*, products(*))')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const access = await getMerchantAccess(authUser.id, order.merchant_id);
    if (!access.ok) {
      return NextResponse.json({ error: 'Forbidden' }, { status: access.status });
    }

    const { data: merchant } = await supabaseAdmin
      .from('merchants')
      .select('*')
      .eq('id', order.merchant_id)
      .single();

    const pdfBuffer = generateInvoicePDF(order, merchant, order.order_items || []);

    if (sendEmail && order.customer_info?.email) {
      if (!merchant?.smtp_enabled || !merchant?.smtp_host || !merchant?.smtp_user || !merchant?.smtp_password) {
        return NextResponse.json({ 
          error: 'SMTP not configured. Please configure email settings in Settings > Email first.',
          pdfGenerated: true
        }, { status: 400 });
      }

      const transporter = nodemailer.createTransport({
        host: merchant.smtp_host,
        port: merchant.smtp_port || 587,
        secure: merchant.smtp_port === 465,
        auth: {
          user: merchant.smtp_user,
          pass: merchant.smtp_password,
        },
      });

      const invoiceNumber = `INV-${order.id.slice(0, 8).toUpperCase()}`;
      
      await transporter.sendMail({
        from: `"${merchant.smtp_from_name || merchant.store_name || 'Store'}" <${merchant.smtp_from_email || merchant.smtp_user}>`,
        to: order.customer_info.email,
        subject: `Tax Invoice ${invoiceNumber} from ${merchant?.store_name || 'Store'}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #202223;">Your Tax Invoice</h2>
            <p style="color: #6d7175;">Hi ${order.customer_info.name || 'Customer'},</p>
            <p style="color: #6d7175;">Please find attached the tax invoice for your recent order.</p>
            <div style="background: #f6f6f7; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #202223;"><strong>Invoice Number:</strong> ${invoiceNumber}</p>
              <p style="margin: 8px 0 0; color: #202223;"><strong>Order Total:</strong> ${formatCurrency(order.total_amount, merchant?.currency || 'USD')}</p>
              ${order.tax_amount > 0 ? `<p style="margin: 8px 0 0; color: #202223;"><strong>Tax Included:</strong> ${formatCurrency(order.tax_amount, merchant?.currency || 'USD')}</p>` : ''}
            </div>
            <p style="color: #6d7175;">This invoice can be used for tax purposes and record keeping.</p>
            <p style="color: #6d7175;">Thank you for your business!</p>
            <p style="color: #6d7175;">Best regards,<br>${merchant?.store_name || 'Store'}</p>
          </div>
        `,
        attachments: [
          {
            filename: `${invoiceNumber}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      });

      return NextResponse.json({ 
        success: true, 
        message: 'Tax invoice generated and sent via email',
        invoiceNumber 
      });
    }

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="INV-${order.id.slice(0, 8).toUpperCase()}.pdf"`,
      },
    });

  } catch (error: any) {
    logger.error('Invoice generation error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate invoice' }, { status: 500 });
  }
}
