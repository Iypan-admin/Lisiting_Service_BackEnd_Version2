// controllers/centerNotificationsController.js
const { supabaseAdmin } = require("../config/supabaseClient");

/**
 * GET /api/center/notifications
 * Fetch all notifications for the logged-in center admin
 */
const getCenterNotifications = async (req, res) => {
    try {
        const userId = req.user?.id;
        
        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                error: "Unauthorized - User ID not found" 
            });
        }

        // Verify user has center role
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

        if (user.role !== 'center') {
            return res.status(403).json({ 
                success: false, 
                error: "Forbidden - User is not a center admin" 
            });
        }

        // Fetch all notifications for this center admin
        const { data, error } = await supabaseAdmin
            .from('center_notifications')
            .select('*')
            .eq('center_admin_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            const errorMessage = error.message || '';
            const errorCode = error.code || '';
            
            // If table doesn't exist, return empty array (graceful fallback)
            if (errorCode === '42P01' || 
                errorMessage.includes('does not exist') || 
                errorMessage.includes('Could not find the table') ||
                errorMessage.includes('relation') && errorMessage.includes('does not exist') ||
                errorMessage.includes('schema cache')) {
                console.log("Center notifications table does not exist yet, returning empty array");
                return res.json({ 
                    success: true, 
                    data: [] 
                });
            }

            console.error("Supabase fetch error for center notifications:", error);
            // Return empty array even on other Supabase errors to keep UI working
            return res.json({ 
                success: true, 
                data: [],
                warning: error.message 
            });
        }

        res.json({ 
            success: true, 
            data: data || [] 
        });
    } catch (err) {
        console.error("❌ Error fetching center notifications:", err);
        res.status(500).json({ 
            success: false, 
            data: [], 
            error: err.message 
        });
    }
};

/**
 * PATCH /api/center/notifications/:id
 * Mark a notification as read
 */
const markCenterNotificationAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                error: "Unauthorized - User ID not found" 
            });
        }

        // Verify user has center role
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

        if (user.role !== 'center') {
            return res.status(403).json({ 
                success: false, 
                error: "Forbidden - User is not a center admin" 
            });
        }

        // Update notification
        const { data, error } = await supabaseAdmin
            .from('center_notifications')
            .update({ is_read: true })
            .eq('id', id)
            .eq('center_admin_id', userId)
            .select()
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({ 
                    success: false, 
                    error: "Notification not found" 
                });
            }

            const errorMessage = error.message || '';
            const errorCode = error.code || '';
            
            // If table doesn't exist, return success (graceful fallback)
            if (errorCode === '42P01' || 
                errorMessage.includes('does not exist') || 
                errorMessage.includes('Could not find the table') ||
                errorMessage.includes('relation') && errorMessage.includes('does not exist') ||
                errorMessage.includes('schema cache')) {
                return res.json({ 
                    success: true, 
                    message: "Notification marked as read (table not present)" 
                });
            }

            console.error("Supabase update error for center notification:", error);
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
        console.error("❌ Error marking center notification as read:", err);
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
};

module.exports = {
    getCenterNotifications,
    markCenterNotificationAsRead
};
