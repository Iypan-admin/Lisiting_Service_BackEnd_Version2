const { supabase } = require('../config/supabaseClient');

const financeNotificationsController = {
    // Get all notifications for finance
    getNotifications: async (req, res) => {
        try {
            // Check if user has finance or admin role
            if (req.user.role !== 'finance' && req.user.role !== 'admin' && req.user.role !== 'financial') {
                return res.status(403).json({ success: false, error: 'Unauthorized access to finance notifications' });
            }

            const { data, error } = await supabase
                .from('finance_notifications')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            return res.status(200).json({
                success: true,
                data: data || []
            });
        } catch (error) {
            console.error('Error in getFinanceNotifications:', error);
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }
    },

    // Mark a notification as read
    markAsRead: async (req, res) => {
        try {
            const { id } = req.params;

            // Check if user has finance or admin role
            if (req.user.role !== 'finance' && req.user.role !== 'admin' && req.user.role !== 'financial') {
                return res.status(403).json({ success: false, error: 'Unauthorized access' });
            }

            const { error } = await supabase
                .from('finance_notifications')
                .update({ is_read: true })
                .eq('id', id);

            if (error) throw error;

            return res.status(200).json({
                success: true,
                message: 'Notification marked as read'
            });
        } catch (error) {
            console.error('Error in markFinanceNotificationAsRead:', error);
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
};

module.exports = financeNotificationsController;
