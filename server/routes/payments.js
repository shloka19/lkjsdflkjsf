import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../config/database.js';
import { validateRequest, schemas } from '../middleware/validation.js';

const router = express.Router();

// Get user's payments
router.get('/', async (req, res, next) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const { data: payments, error } = await supabase
      .from('payments')
      .select(`
        *,
        bookings (
          id,
          parking_spaces (
            number, floor, section
          )
        )
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (error) throw error;

    res.json({
      payments: payments.map(payment => ({
        id: payment.id,
        bookingId: payment.booking_id,
        booking: payment.bookings,
        amount: payment.amount,
        method: payment.method,
        status: payment.status,
        transactionId: payment.transaction_id,
        createdAt: payment.created_at
      }))
    });
  } catch (error) {
    next(error);
  }
});

// Process payment
router.post('/', validateRequest(schemas.processPayment), async (req, res, next) => {
  try {
    const { bookingId, method, amount } = req.body;

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Check if user owns this booking
    if (booking.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if payment amount matches booking amount
    if (amount !== booking.total_amount) {
      return res.status(400).json({ error: 'Payment amount does not match booking amount' });
    }

    // Check if booking is already paid
    if (booking.payment_status === 'paid') {
      return res.status(400).json({ error: 'Booking is already paid' });
    }

    // Simulate payment processing
    const paymentId = uuidv4();
    const transactionId = `txn_${Date.now()}`;
    
    // In a real application, you would integrate with payment providers like Stripe
    const paymentStatus = Math.random() > 0.1 ? 'completed' : 'failed'; // 90% success rate

    // Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        id: paymentId,
        user_id: req.user.id,
        booking_id: bookingId,
        amount,
        method,
        status: paymentStatus,
        transaction_id: transactionId,
        created_at: new Date().toISOString()
      })
      .select('*')
      .single();

    if (paymentError) throw paymentError;

    // Update booking payment status
    if (paymentStatus === 'completed') {
      await supabase
        .from('bookings')
        .update({ 
          payment_status: 'paid',
          status: 'confirmed'
        })
        .eq('id', bookingId);
    }

    res.status(201).json({
      message: paymentStatus === 'completed' ? 'Payment processed successfully' : 'Payment failed',
      payment: {
        id: payment.id,
        bookingId: payment.booking_id,
        amount: payment.amount,
        method: payment.method,
        status: payment.status,
        transactionId: payment.transaction_id
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get payment by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { data: payment, error } = await supabase
      .from('payments')
      .select(`
        *,
        bookings (
          id,
          parking_spaces (
            number, floor, section
          )
        )
      `)
      .eq('id', req.params.id)
      .single();

    if (error || !payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Check if user owns this payment
    if (payment.user_id !== req.user.id && !['staff', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      payment: {
        id: payment.id,
        bookingId: payment.booking_id,
        booking: payment.bookings,
        amount: payment.amount,
        method: payment.method,
        status: payment.status,
        transactionId: payment.transaction_id,
        createdAt: payment.created_at
      }
    });
  } catch (error) {
    next(error);
  }
});

// Refund payment (admin only)
router.post('/:id/refund', async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { data: payment, error: fetchError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.status !== 'completed') {
      return res.status(400).json({ error: 'Only completed payments can be refunded' });
    }

    // Update payment status
    const { error: updateError } = await supabase
      .from('payments')
      .update({ 
        status: 'refunded',
        refunded_at: new Date().toISOString()
      })
      .eq('id', req.params.id);

    if (updateError) throw updateError;

    // Update booking payment status
    await supabase
      .from('bookings')
      .update({ payment_status: 'refunded' })
      .eq('id', payment.booking_id);

    res.json({ message: 'Payment refunded successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;