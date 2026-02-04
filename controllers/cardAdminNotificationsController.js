// controllers/cardAdminNotificationsController.js
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
 * GET /api/card-admin/notifications
 * Fetch all notifications for the logged-in card admin
 */
const getCardAdminNotifications = async (req, res) => {
    try {
        // Get user ID from token (set by authMiddleware)
        const userId = req.user?.id;
        
        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                error: "Unauthorized - User ID not found" 
            });
        }

        // Verify user has card_admin role
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

        // DEBUG: specific logging
        console.log(`Checking notifications for user ${userId} with role: ${user.role}`);

        // Allow 'card_admin', 'card_administrator', 'cardadmin' role (and admins)
        const allowedRoles = ['card_admin', 'card_administrator', 'cardadmin', 'admin'];
        if (!allowedRoles.includes(user.role)) {
             return res.status(403).json({ 
                 success: false, 
                 error: `Forbidden - User role '${user.role}' is not a Card Admin` 
             });
        }

        // Fetch all notifications for this card admin
        const { data, error } = await fetchWithRetry(() => supabaseAdmin
            .from('card_admin_notifications')
            .select('*')
            .eq('card_admin_id', userId)
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
                console.log("Card admin notifications table does not exist yet returning empty array");
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
        console.error("❌ Error fetching card admin notifications:", err);
        res.status(500).json({ 
            success: false, 
            data: [], 
            error: err.message 
        });
    }
};

/**
 * PATCH /api/card-admin/notifications/:id
 * Mark a notification as read
 */
const markCardAdminNotificationAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                error: "Unauthorized - User ID not found" 
            });
        }

        // Verify user has card_admin role (or check if user exists)
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
            .from('card_admin_notifications')
            .update({ is_read: true })
            .eq('id', id)
            .eq('card_admin_id', userId) // Ensure user can only mark their own notifications
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
        console.error("❌ Error marking card admin notification as read:", err);
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
};

module.exports = {
    getCardAdminNotifications,
    markCardAdminNotificationAsRead
};
