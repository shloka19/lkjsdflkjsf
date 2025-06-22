import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../config/database.js';

const router = express.Router();

// Get user's notifications
router.get('/', async (req, res, next) => {
  try {
    const { read, type, limit = 50, offset = 0 } = req.query;
    
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', req.user.id);

    if (read !== undefined) query = query.eq('read', read === 'true');
    if (type) query = query.eq('type', type);

    const { data: notifications, error } = await query
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (error) throw error;

    res.json({
      notifications: notifications.map(notification => ({
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        read: notification.read,
        createdAt: notification.created_at
      }))
    });
  } catch (error) {
    next(error);
  }
});

// Mark notification as read
router.put('/:id/read', async (req, res, next) => {
  try {
    const { data: notification, error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select('*')
      .single();

    if (error || !notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    next(error);
  }
});

// Mark all notifications as read
router.put('/read-all', async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', req.user.id)
      .eq('read', false);

    if (error) throw error;

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
});

// Delete notification
router.delete('/:id', async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (error) throw error;

    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Create notification (internal use)
export const createNotification = async (userId, type, title, message) => {
  try {
    const notificationId = uuidv4();
    const { error } = await supabase
      .from('notifications')
      .insert({
        id: notificationId,
        user_id: userId,
        type,
        title,
        message,
        read: false,
        created_at: new Date().toISOString()
      });

    if (error) throw error;
    return notificationId;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

export default router;