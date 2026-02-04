// controllers/stateNotificationsController.js
const { supabaseAdmin } = require("../config/supabaseClient");

/**
 * GET /api/state/notifications
 * Fetch all notifications for the logged-in state admin
 */
const getStateNotifications = async (req, res) => {
    try {
        const userId = req.user?.id;
        
        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                error: "Unauthorized - User ID not found" 
            });
        }

        // Verify user has state role
        const { data: user, error: userError } = await supabaseAdmin
            .from('users')
            .select('role')
            .eq('id', userId)
            .single();

        if (userError || !user) {
            return res.status(404).json({ 
                success: false, 
                error: "User not found" 
            });
        }

        if (user.role !== 'state') {
            return res.status(403).json({ 
                success: false, 
                error: "Forbidden - User is not a state admin" 
            });
        }

        // Fetch all notifications for this state admin
        const { data, error } = await supabaseAdmin
            .from('state_notifications')
            .select('*')
            .eq('state_admin_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            const errorMessage = error.message || '';
            const errorCode = error.code || '';
            
            if (errorCode === '42P01' || 
                errorMessage.includes('does not exist') || 
                errorMessage.includes('Could not find the table')) {
                return res.json({ 
                    success: true, 
                    data: [] 
                });
            }
            console.error("Supabase fetch error:", error);
            return res.status(500).json({ 
                success: false, 
                data: [], 
                error: error.message 
            });
        }

        res.json({ 
            success: true, 
            data: data || [] 
        });
    } catch (err) {
        console.error("❌ Error fetching state notifications:", err);
        res.status(500).json({ 
            success: false, 
            data: [], 
            error: err.message 
        });
    }
};

/**
 * PATCH /api/state/notifications/:id
 * Mark a notification as read
 */
const markStateNotificationAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                error: "Unauthorized - User ID not found" 
            });
        }

        // Verify user has state role
        const { data: user, error: userError } = await supabaseAdmin
            .from('users')
            .select('role')
            .eq('id', userId)
            .single();

        if (userError || !user) {
            return res.status(404).json({ 
                success: false, 
                error: "User not found" 
            });
        }

        if (user.role !== 'state') {
            return res.status(403).json({ 
                success: false, 
                error: "Forbidden - User is not a state admin" 
            });
        }

        // Update notification
        const { data, error } = await supabaseAdmin
            .from('state_notifications')
            .update({ is_read: true })
            .eq('id', id)
            .eq('state_admin_id', userId)
            .select()
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({ 
                    success: false, 
                    error: "Notification not found" 
                });
            }
            return res.status(500).json({ 
                success: false, 
                error: error.message 
            });
        }

        res.json({ 
            success: true, 
            data: data 
        });
    } catch (err) {
        console.error("❌ Error marking state notification as read:", err);
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
};

module.exports = {
    getStateNotifications,
    markStateNotificationAsRead
};
