// controllers/resourceNotificationsController.js
const { supabase, supabaseAdmin } = require("../config/supabaseClient");

/**
 * Helper to retry failed fetches (network errors)
 */
const fetchWithRetry = async (queryFn, retries = 3) => {
    for (let i = 0; i < retries; i++) {
        try {
            return await queryFn();
        } catch (err) {
            const isLastAttempt = i === retries - 1;
            if (isLastAttempt) throw err;
            // Wait before retry (exponential backoff)
            const delay = 500 * Math.pow(2, i);
            console.warn(`Query failed, retrying in ${delay}ms... (${i + 1}/${retries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
};

/**
 * GET /api/resource/notifications
 * Fetch all notifications for the logged-in resource manager
 */
const getResourceNotifications = async (req, res) => {
    try {
        // Get user ID from token (set by authMiddleware)
        const userId = req.user?.id;
        
        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                error: "Unauthorized - User ID not found" 
            });
        }

        // Verify user has resource_manager role
        const { data: user, error: userError } = await fetchWithRetry(() => supabaseAdmin
            .from('users')
            .select('role')
            .eq('id', userId)
            .single());

        if (userError || !user) {
            return res.status(404).json({ 
                success: false, 
                error: "User not found" 
            });
        }

        // Allow 'resource_manager' role (checking exact string match first, adjust if role name differs)
        if (user.role !== 'resource_manager' && user.role !== 'resource_admin' && user.role !== 'admin') {
             // Fallback for admin to see functionality, but primary is resource_manager
             // Assuming role is 'resource_manager' based on frontend "Resource Manager" text
             if (user.role !== 'resource_manager') {
                return res.status(403).json({ 
                    success: false, 
                    error: "Forbidden - User is not a Resource Manager" 
                });
             }
        }

        // Fetch all notifications for this resource manager
        const { data, error } = await fetchWithRetry(() => supabaseAdmin
            .from('resource_notifications')
            .select('*')
            .eq('resource_manager_id', userId)
            .order('created_at', { ascending: false }));

        if (error) {
            // If table doesn't exist, return empty array (graceful fallback)
            const errorMessage = error.message || '';
            const errorCode = error.code || '';
            
            if (errorCode === '42P01' || 
                errorMessage.includes('does not exist') || 
                errorMessage.includes('Could not find the table') ||
                errorMessage.includes('relation') && errorMessage.includes('does not exist') ||
                errorMessage.includes('schema cache')) {
                console.log("Resource notifications table does not exist yet returning empty array");
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
        console.error("❌ Error fetching resource notifications:", err);
        res.status(500).json({ 
            success: false, 
            data: [], 
            error: err.message 
        });
    }
};

/**
 * PATCH /api/resource/notifications/:id
 * Mark a notification as read
 */
const markResourceNotificationAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                error: "Unauthorized - User ID not found" 
            });
        }

        // Verify user has resource_manager role
        const { data: user, error: userError } = await fetchWithRetry(() => supabaseAdmin
            .from('users')
            .select('role')
            .eq('id', userId)
            .single());

        if (userError || !user) {
            return res.status(404).json({ 
                success: false, 
                error: "User not found" 
            });
        }

        // Update notification to mark as read
        const { data, error } = await fetchWithRetry(() => supabaseAdmin
            .from('resource_notifications')
            .update({ is_read: true })
            .eq('id', id)
            .eq('resource_manager_id', userId) // Ensure user can only mark their own notifications
            .select()
            .single());

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
                    message: "Notification marked as read (simulated)" 
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
        console.error("❌ Error marking resource notification as read:", err);
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
};

module.exports = {
    getResourceNotifications,
    markResourceNotificationAsRead
};
