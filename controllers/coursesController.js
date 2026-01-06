const { supabase, supabaseAdmin } = require("../config/supabaseClient");

/**
 * Fetch all courses with optional pagination
 */
const getAllCourses = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('courses')
            .select('*');

        if (error) throw error;

        res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Error fetching courses:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch courses.'
        });
    }
};

/**
 * Fetch a single course by its ID
 */
const getCourseById = async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('courses')
            .select('id, created_at, course_name, type')
            .eq('id', id)
            .single();

        if (error) {
            return res.status(404).json({
                success: false,
                message: 'Course not found.'
            });
        }

        res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Error fetching course by ID:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch course details.'
        });
    }
};

module.exports = {
    getAllCourses,
    getCourseById
};