import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../config/database.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { validateRequest, schemas } from '../middleware/validation.js';

const router = express.Router();

// Get all parking spaces (public endpoint with optional filtering)
router.get('/', async (req, res, next) => {
  try {
    const { floor, section, type, status, available } = req.query;
    
    let query = supabase.from('parking_spaces').select('*');

    // Apply filters
    if (floor) query = query.eq('floor', parseInt(floor));
    if (section) query = query.eq('section', section);
    if (type) query = query.eq('type', type);
    if (status) query = query.eq('status', status);
    if (available === 'true') query = query.eq('status', 'available');

    const { data: spaces, error } = await query.order('floor').order('section').order('number');

    if (error) throw error;

    res.json({ spaces });
  } catch (error) {
    next(error);
  }
});

// Get space by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { data: space, error } = await supabase
      .from('parking_spaces')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !space) {
      return res.status(404).json({ error: 'Parking space not found' });
    }

    res.json({ space });
  } catch (error) {
    next(error);
  }
});

// Create new parking space (admin only)
router.post('/', authenticateToken, requireAdmin, validateRequest(schemas.createSpace), async (req, res, next) => {
  try {
    const { number, floor, section, type, hourlyRate, position } = req.body;

    // Check if space number already exists
    const { data: existingSpace } = await supabase
      .from('parking_spaces')
      .select('id')
      .eq('number', number)
      .single();

    if (existingSpace) {
      return res.status(409).json({ error: 'Parking space number already exists' });
    }

    const spaceId = uuidv4();
    const { data: space, error } = await supabase
      .from('parking_spaces')
      .insert({
        id: spaceId,
        number,
        floor,
        section,
        type,
        status: 'available',
        hourly_rate: hourlyRate,
        position,
        created_at: new Date().toISOString()
      })
      .select('*')
      .single();

    if (error) throw error;

    res.status(201).json({
      message: 'Parking space created successfully',
      space: {
        id: space.id,
        number: space.number,
        floor: space.floor,
        section: space.section,
        type: space.type,
        status: space.status,
        hourlyRate: space.hourly_rate,
        position: space.position
      }
    });
  } catch (error) {
    next(error);
  }
});

// Update parking space (admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { number, floor, section, type, hourlyRate, position, status } = req.body;
    const updates = {};

    if (number) updates.number = number;
    if (floor) updates.floor = floor;
    if (section) updates.section = section;
    if (type) updates.type = type;
    if (hourlyRate) updates.hourly_rate = hourlyRate;
    if (position) updates.position = position;
    if (status) updates.status = status;

    const { data: space, error } = await supabase
      .from('parking_spaces')
      .update(updates)
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (error || !space) {
      return res.status(404).json({ error: 'Parking space not found' });
    }

    res.json({
      message: 'Parking space updated successfully',
      space: {
        id: space.id,
        number: space.number,
        floor: space.floor,
        section: space.section,
        type: space.type,
        status: space.status,
        hourlyRate: space.hourly_rate,
        position: space.position
      }
    });
  } catch (error) {
    next(error);
  }
});

// Delete parking space (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    // Check if space has active bookings
    const { data: activeBookings } = await supabase
      .from('bookings')
      .select('id')
      .eq('space_id', req.params.id)
      .in('status', ['pending', 'confirmed', 'active']);

    if (activeBookings && activeBookings.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete space with active bookings' 
      });
    }

    const { error } = await supabase
      .from('parking_spaces')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;

    res.json({ message: 'Parking space deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Get space availability for date range
router.get('/:id/availability', async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ 
        error: 'Start date and end date are required' 
      });
    }

    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('start_time, end_time, status')
      .eq('space_id', req.params.id)
      .in('status', ['confirmed', 'active'])
      .gte('end_time', startDate)
      .lte('start_time', endDate);

    if (error) throw error;

    res.json({ 
      spaceId: req.params.id,
      bookings: bookings.map(booking => ({
        startTime: booking.start_time,
        endTime: booking.end_time,
        status: booking.status
      }))
    });
  } catch (error) {
    next(error);
  }
});

export default router;