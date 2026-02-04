// controllers/adminNotificationsController.js
const { supabase, supabaseAdmin } = require("../config/supabaseClient");

/**
 * GET /api/admin/notifications
 * Fetch all notifications for the logged-in admin
 */
const getAdminNotifications = async (req, res) => {
    try {
        // Get user ID from token (set by authMiddleware)
        const userId = req.user?.id;
        
        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                error: "Unauthorized - User ID not found" 
            });
        }

        // Verify user has admin role
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

        if (user.role !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                error: "Forbidden - User is not an admin" 
            });
        }

        // Fetch all notifications for this admin (both read and unread)
        const { data, error } = await supabaseAdmin
            .from('admin_notifications')
            .select('*')
            .eq('admin_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            // If table doesn't exist, return empty array (graceful fallback)
            const errorMessage = error.message || '';
            const errorCode = error.code || '';
            
            if (errorCode === '42P01' || 
                errorMessage.includes('does not exist') || 
                errorMessage.includes('Could not find the table') ||
                errorMessage.includes('relation') && errorMessage.includes('does not exist') ||
                errorMessage.includes('schema cache')) {
                console.log("Admin notifications table does not exist yet, returning empty array");
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
        console.error("❌ Error fetching admin notifications:", err);
        res.status(500).json({ 
            success: false, 
            data: [], 
            error: err.message 
        });
    }
};

/**
 * PATCH /api/admin/notifications/:id
 * Mark a notification as read
 */
const markAdminNotificationAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                error: "Unauthorized - User ID not found" 
            });
        }

        // Verify user has admin role
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

        if (user.role !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                error: "Forbidden - User is not an admin" 
            });
        }

        // Update notification to mark as read
        const { data, error } = await supabaseAdmin
            .from('admin_notifications')
            .update({ is_read: true })
            .eq('id', id)
            .eq('admin_id', userId) // Ensure user can only mark their own notifications
            .select()
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({ 
                    success: false, 
                    error: "Notification not found" 
                });
            }
            // If table doesn't exist, return success (graceful fallback)
            const errorMessage = error.message || '';
            const errorCode = error.code || '';
            
            if (errorCode === '42P01' || 
                errorMessage.includes('does not exist') || 
                errorMessage.includes('Could not find the table') ||
                errorMessage.includes('relation') && errorMessage.includes('does not exist') ||
                errorMessage.includes('schema cache')) {
                return res.json({ 
                    success: true, 
                    message: "Notification marked as read" 
                });
            }
            console.error("Supabase update error:", error);
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
        console.error("❌ Error marking admin notification as read:", err);
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
};

module.exports = {
    getAdminNotifications,
    markAdminNotificationAsRead
};
