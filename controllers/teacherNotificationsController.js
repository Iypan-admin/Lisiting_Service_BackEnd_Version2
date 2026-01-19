// file: controllers/teacherNotificationsController.js
const { supabase, supabaseAdmin } = require("../config/supabaseClient");

/**
 * GET /api/teacher/notifications
 * Fetch unread notifications for the logged-in teacher
 */
const getNotifications = async (req, res) => {
    try {
        const { id: user_id } = req.user;
        
        // Get teacher_id for this user
        const { data: teacherData, error: teacherError } = await supabaseAdmin
            .from("teachers")
            .select("teacher_id")
            .eq("teacher", user_id)
            .single();

        if (teacherError || !teacherData) {
            return res.status(404).json({ success: false, data: [], error: "Teacher not found" });
        }

        const teacherId = teacherData.teacher_id;

        const { data, error } = await supabaseAdmin
            .from("teacher_notifications")
            .select("*")
            .eq("teacher", teacherId)
            .eq("is_read", false) // fetch only unread notifications
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Supabase fetch error:", error);
            return res.status(500).json({ success: false, data: [], error: error.message });
        }

        res.json({ success: true, data: data || [] });
    } catch (err) {
        console.error("❌ Error fetching teacher notifications:", err);
        res.status(500).json({ success: false, data: [], error: err.message });
    }
};

/**
 * PATCH /api/teacher/notifications/:id
 * Mark a notification as read
 */
const markAsRead = async (req, res) => {
    try {
        const { id: user_id } = req.user;
        const { id } = req.params;

        // Get teacher_id for this user
        const { data: teacherData, error: teacherError } = await supabaseAdmin
            .from("teachers")
            .select("teacher_id")
            .eq("teacher", user_id)
            .single();

        if (teacherError || !teacherData) {
            return res.status(404).json({ success: false, error: "Teacher not found" });
        }

        const teacherId = teacherData.teacher_id;

        const { data, error } = await supabaseAdmin
            .from("teacher_notifications")
            .update({ is_read: true })
            .eq("id", id)
            .eq("teacher", teacherId);

        if (error) {
            console.error("Supabase update error:", error);
            return res.status(500).json({ success: false, error: error.message });
        }

        res.json({ success: true, data });
    } catch (err) {
        console.error("❌ Error marking notification as read:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};

module.exports = { getNotifications, markAsRead };

