// controllers/academicNotificationsController.js
const { supabase, supabaseAdmin } = require("../config/supabaseClient");

/**
 * GET /api/academic/notifications
 * Fetch all notifications for the logged-in academic coordinator
 */
const getAcademicNotifications = async (req, res) => {
    try {
        // Get user ID from token (set by authMiddleware)
        const userId = req.user?.id;
        
        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                error: "Unauthorized - User ID not found" 
            });
        }

        // Verify user has academic role
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

        if (user.role !== 'academic') {
            return res.status(403).json({ 
                success: false, 
                error: "Forbidden - User is not an academic coordinator" 
            });
        }

        // Fetch all notifications for this academic coordinator (both read and unread)
        const { data, error } = await supabaseAdmin
            .from('academic_notifications')
            .select('*')
            .eq('academic_coordinator_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
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
        console.error("❌ Error fetching academic notifications:", err);
        res.status(500).json({ 
            success: false, 
            data: [], 
            error: err.message 
        });
    }
};

/**
 * PATCH /api/academic/notifications/:id
 * Mark a notification as read
 */
const markAcademicNotificationAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                error: "Unauthorized - User ID not found" 
            });
        }

        // Verify user has academic role
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

        if (user.role !== 'academic') {
            return res.status(403).json({ 
                success: false, 
                error: "Forbidden - User is not an academic coordinator" 
            });
        }

        // Update notification to mark as read
        const { data, error } = await supabaseAdmin
            .from('academic_notifications')
            .update({ is_read: true })
            .eq('id', id)
            .eq('academic_coordinator_id', userId) // Ensure user can only mark their own notifications
            .select()
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({ 
                    success: false, 
                    error: "Notification not found" 
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
        console.error("❌ Error marking academic notification as read:", err);
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
};

module.exports = {
    getAcademicNotifications,
    markAcademicNotificationAsRead
};

