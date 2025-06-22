import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import { supabase } from '../config/database.js';
import { requireStaffOrAdmin } from '../middleware/auth.js';
import { validateRequest, schemas } from '../middleware/validation.js';

const router = express.Router();

// Get user's bookings
router.get('/', async (req, res, next) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    
    let query = supabase
      .from('bookings')
      .select(`
        *,
        parking_spaces (
          number, floor, section, type, hourly_rate
        )
      `)
      .eq('user_id', req.user.id);

    if (status) query = query.eq('status', status);

    const { data: bookings, error } = await query
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (error) throw error;

    res.json({
      bookings: bookings.map(booking => ({
        id: booking.id,
        spaceId: booking.space_id,
        space: booking.parking_spaces,
        startTime: booking.start_time,
        endTime: booking.end_time,
        totalAmount: booking.total_amount,
        status: booking.status,
        paymentStatus: booking.payment_status,
        vehicleNumber: booking.vehicle_number,
        qrCode: booking.qr_code,
        createdAt: booking.created_at
      }))
    });
  } catch (error) {
    next(error);
  }
});

// Get booking by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { data: booking, error } = await supabase
      .from('bookings')
      .select(`
        *,
        parking_spaces (
          number, floor, section, type, hourly_rate
        )
      `)
      .eq('id', req.params.id)
      .single();

    if (error || !booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Check if user owns this booking or is staff/admin
    if (booking.user_id !== req.user.id && !['staff', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      booking: {
        id: booking.id,
        userId: booking.user_id,
        spaceId: booking.space_id,
        space: booking.parking_spaces,
        startTime: booking.start_time,
        endTime: booking.end_time,
        totalAmount: booking.total_amount,
        status: booking.status,
        paymentStatus: booking.payment_status,
        vehicleNumber: booking.vehicle_number,
        qrCode: booking.qr_code,
        createdAt: booking.created_at
      }
    });
  } catch (error) {
    next(error);
  }
});

// Create new booking
router.post('/', validateRequest(schemas.createBooking), async (req, res, next) => {
  try {
    const { spaceId, startTime, endTime, vehicleNumber } = req.body;

    // Check if space exists and is available
    const { data: space, error: spaceError } = await supabase
      .from('parking_spaces')
      .select('*')
      .eq('id', spaceId)
      .single();

    if (spaceError || !space) {
      return res.status(404).json({ error: 'Parking space not found' });
    }

    if (space.status !== 'available') {
      return res.status(400).json({ error: 'Parking space is not available' });
    }

    // Check for conflicting bookings
    const { data: conflictingBookings } = await supabase
      .from('bookings')
      .select('id')
      .eq('space_id', spaceId)
      .in('status', ['confirmed', 'active'])
      .or(`start_time.lte.${endTime},end_time.gte.${startTime}`);

    if (conflictingBookings && conflictingBookings.length > 0) {
      return res.status(409).json({ error: 'Time slot is already booked' });
    }

    // Calculate total amount
    const start = new Date(startTime);
    const end = new Date(endTime);
    const hours = Math.ceil((end - start) / (1000 * 60 * 60));
    const totalAmount = hours * space.hourly_rate;

    // Generate QR code
    const bookingId = uuidv4();
    const qrCodeData = JSON.stringify({
      bookingId,
      spaceNumber: space.number,
      startTime,
      endTime
    });
    const qrCode = await QRCode.toDataURL(qrCodeData);

    // Create booking
    const { data: booking, error } = await supabase
      .from('bookings')
      .insert({
        id: bookingId,
        user_id: req.user.id,
        space_id: spaceId,
        start_time: startTime,
        end_time: endTime,
        total_amount: totalAmount,
        status: 'pending',
        payment_status: 'pending',
        vehicle_number: vehicleNumber,
        qr_code: qrCode,
        created_at: new Date().toISOString()
      })
      .select('*')
      .single();

    if (error) throw error;

    // Update space status to reserved
    await supabase
      .from('parking_spaces')
      .update({ status: 'reserved' })
      .eq('id', spaceId);

    res.status(201).json({
      message: 'Booking created successfully',
      booking: {
        id: booking.id,
        spaceId: booking.space_id,
        startTime: booking.start_time,
        endTime: booking.end_time,
        totalAmount: booking.total_amount,
        status: booking.status,
        paymentStatus: booking.payment_status,
        vehicleNumber: booking.vehicle_number,
        qrCode: booking.qr_code
      }
    });
  } catch (error) {
    next(error);
  }
});

// Update booking
router.put('/:id', validateRequest(schemas.updateBooking), async (req, res, next) => {
  try {
    const { status, vehicleNumber } = req.body;

    // Get existing booking
    const { data: existingBooking, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !existingBooking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Check permissions
    if (existingBooking.user_id !== req.user.id && !['staff', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updates = {};
    if (status) updates.status = status;
    if (vehicleNumber !== undefined) updates.vehicle_number = vehicleNumber;

    const { data: booking, error } = await supabase
      .from('bookings')
      .update(updates)
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (error) throw error;

    // Update space status based on booking status
    if (status) {
      let spaceStatus = 'available';
      if (status === 'active') spaceStatus = 'occupied';
      else if (status === 'confirmed') spaceStatus = 'reserved';

      await supabase
        .from('parking_spaces')
        .update({ status: spaceStatus })
        .eq('id', booking.space_id);
    }

    res.json({
      message: 'Booking updated successfully',
      booking: {
        id: booking.id,
        status: booking.status,
        vehicleNumber: booking.vehicle_number
      }
    });
  } catch (error) {
    next(error);
  }
});

// Cancel booking
router.delete('/:id', async (req, res, next) => {
  try {
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Check permissions
    if (booking.user_id !== req.user.id && !['staff', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if booking can be cancelled
    if (['completed', 'cancelled'].includes(booking.status)) {
      return res.status(400).json({ error: 'Booking cannot be cancelled' });
    }

    // Update booking status
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ 
        status: 'cancelled',
        cancelled_at: new Date().toISOString()
      })
      .eq('id', req.params.id);

    if (updateError) throw updateError;

    // Free up the parking space
    await supabase
      .from('parking_spaces')
      .update({ status: 'available' })
      .eq('id', booking.space_id);

    res.json({ message: 'Booking cancelled successfully' });
  } catch (error) {
    next(error);
  }
});

// Get all bookings (staff/admin only)
router.get('/admin/all', requireStaffOrAdmin, async (req, res, next) => {
  try {
    const { status, spaceId, userId, limit = 100, offset = 0 } = req.query;
    
    let query = supabase
      .from('bookings')
      .select(`
        *,
        parking_spaces (
          number, floor, section, type
        ),
        users (
          name, email
        )
      `);

    if (status) query = query.eq('status', status);
    if (spaceId) query = query.eq('space_id', spaceId);
    if (userId) query = query.eq('user_id', userId);

    const { data: bookings, error } = await query
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (error) throw error;

    res.json({
      bookings: bookings.map(booking => ({
        id: booking.id,
        user: booking.users,
        space: booking.parking_spaces,
        startTime: booking.start_time,
        endTime: booking.end_time,
        totalAmount: booking.total_amount,
        status: booking.status,
        paymentStatus: booking.payment_status,
        vehicleNumber: booking.vehicle_number,
        createdAt: booking.created_at
      }))
    });
  } catch (error) {
    next(error);
  }
});

export default router;