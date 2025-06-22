import express from 'express';
import { supabase } from '../config/database.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// All admin routes require admin role
router.use(requireAdmin);

// Get dashboard statistics
router.get('/stats', async (req, res, next) => {
  try {
    // Get total spaces
    const { count: totalSpaces } = await supabase
      .from('parking_spaces')
      .select('*', { count: 'exact', head: true });

    // Get spaces by status
    const { data: spacesByStatus } = await supabase
      .from('parking_spaces')
      .select('status')
      .then(({ data }) => {
        const counts = { available: 0, occupied: 0, reserved: 0, maintenance: 0 };
        data?.forEach(space => counts[space.status]++);
        return { data: counts };
      });

    // Get total bookings
    const { count: totalBookings } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true });

    // Get bookings by status
    const { data: bookingsByStatus } = await supabase
      .from('bookings')
      .select('status')
      .then(({ data }) => {
        const counts = { pending: 0, confirmed: 0, active: 0, completed: 0, cancelled: 0 };
        data?.forEach(booking => counts[booking.status]++);
        return { data: counts };
      });

    // Get total revenue
    const { data: revenueData } = await supabase
      .from('payments')
      .select('amount')
      .eq('status', 'completed');

    const totalRevenue = revenueData?.reduce((sum, payment) => sum + payment.amount, 0) || 0;

    // Get total users
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    // Get users by role
    const { data: usersByRole } = await supabase
      .from('users')
      .select('role')
      .then(({ data }) => {
        const counts = { customer: 0, staff: 0, admin: 0 };
        data?.forEach(user => counts[user.role]++);
        return { data: counts };
      });

    // Get recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { count: recentBookings } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString());

    const { data: recentRevenue } = await supabase
      .from('payments')
      .select('amount')
      .eq('status', 'completed')
      .gte('created_at', thirtyDaysAgo.toISOString());

    const monthlyRevenue = recentRevenue?.reduce((sum, payment) => sum + payment.amount, 0) || 0;

    res.json({
      spaces: {
        total: totalSpaces,
        byStatus: spacesByStatus
      },
      bookings: {
        total: totalBookings,
        recent: recentBookings,
        byStatus: bookingsByStatus
      },
      revenue: {
        total: totalRevenue,
        monthly: monthlyRevenue
      },
      users: {
        total: totalUsers,
        byRole: usersByRole
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get all users
router.get('/users', async (req, res, next) => {
  try {
    const { role, limit = 100, offset = 0 } = req.query;
    
    let query = supabase
      .from('users')
      .select('id, email, name, role, phone, created_at, last_login');

    if (role) query = query.eq('role', role);

    const { data: users, error } = await query
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (error) throw error;

    res.json({ users });
  } catch (error) {
    next(error);
  }
});

// Update user role
router.put('/users/:id/role', async (req, res, next) => {
  try {
    const { role } = req.body;

    if (!['customer', 'staff', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .update({ role })
      .eq('id', req.params.id)
      .select('id, email, name, role')
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'User role updated successfully',
      user
    });
  } catch (error) {
    next(error);
  }
});

// Get revenue analytics
router.get('/analytics/revenue', async (req, res, next) => {
  try {
    const { period = 'month' } = req.query;
    
    let dateFormat;
    let dateRange;
    
    switch (period) {
      case 'week':
        dateFormat = 'YYYY-MM-DD';
        dateRange = 7;
        break;
      case 'month':
        dateFormat = 'YYYY-MM-DD';
        dateRange = 30;
        break;
      case 'year':
        dateFormat = 'YYYY-MM';
        dateRange = 365;
        break;
      default:
        dateFormat = 'YYYY-MM-DD';
        dateRange = 30;
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - dateRange);

    const { data: payments, error } = await supabase
      .from('payments')
      .select('amount, created_at')
      .eq('status', 'completed')
      .gte('created_at', startDate.toISOString())
      .order('created_at');

    if (error) throw error;

    // Group payments by date
    const revenueByDate = {};
    payments?.forEach(payment => {
      const date = new Date(payment.created_at).toISOString().split('T')[0];
      revenueByDate[date] = (revenueByDate[date] || 0) + payment.amount;
    });

    res.json({
      period,
      data: Object.entries(revenueByDate).map(([date, revenue]) => ({
        date,
        revenue
      }))
    });
  } catch (error) {
    next(error);
  }
});

// Get occupancy analytics
router.get('/analytics/occupancy', async (req, res, next) => {
  try {
    const { data: spaces, error } = await supabase
      .from('parking_spaces')
      .select('status, type, floor, section');

    if (error) throw error;

    // Group by different dimensions
    const byStatus = {};
    const byType = {};
    const byFloor = {};
    const bySection = {};

    spaces?.forEach(space => {
      byStatus[space.status] = (byStatus[space.status] || 0) + 1;
      byType[space.type] = (byType[space.type] || 0) + 1;
      byFloor[space.floor] = (byFloor[space.floor] || 0) + 1;
      bySection[space.section] = (bySection[space.section] || 0) + 1;
    });

    res.json({
      total: spaces?.length || 0,
      byStatus,
      byType,
      byFloor,
      bySection
    });
  } catch (error) {
    next(error);
  }
});

// System health check
router.get('/health', async (req, res, next) => {
  try {
    // Check database connection
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    const dbStatus = error ? 'error' : 'healthy';

    // Check for system alerts
    const alerts = [];

    // Check for spaces in maintenance
    const { count: maintenanceSpaces } = await supabase
      .from('parking_spaces')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'maintenance');

    if (maintenanceSpaces > 0) {
      alerts.push({
        type: 'warning',
        message: `${maintenanceSpaces} spaces in maintenance`
      });
    }

    // Check for failed payments
    const { count: failedPayments } = await supabase
      .from('payments')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'failed')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (failedPayments > 0) {
      alerts.push({
        type: 'error',
        message: `${failedPayments} failed payments in last 24 hours`
      });
    }

    res.json({
      status: 'healthy',
      database: dbStatus,
      alerts,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

export default router;