import { NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { verifyAndFinalizeRazorpayPayment } from '@/lib/domain/razorpay';

export async function POST(request: Request) {
  try {
    const { orderId, razorpay_payment_id, razorpay_order_id, razorpay_signature } = await request.json();

    if (!orderId || !razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = await verifyAndFinalizeRazorpayPayment({
      orderId,
      razorpayPaymentId: razorpay_payment_id,
      razorpayOrderId: razorpay_order_id,
      razorpaySignature: razorpay_signature,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    logger.error('Razorpay verification error:', error);

    switch (error?.message) {
      case 'ORDER_NOT_FOUND':
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      case 'INVALID_PAYMENT_METHOD':
        return NextResponse.json({ error: 'Order is not a Razorpay order' }, { status: 400 });
      case 'MERCHANT_NOT_FOUND':
        return NextResponse.json({ error: 'Merchant not found for order' }, { status: 404 });
      case 'RAZORPAY_SECRET_MISSING':
        return NextResponse.json({ error: 'Razorpay key secret not configured' }, { status: 400 });
      case 'PAYMENT_VERIFICATION_FAILED':
        return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 });
      default:
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }
}
