// controllers/usersController.js
const { supabase, supabaseAdmin } = require("../config/supabaseClient");

/**
 * Fetch all users with optional filters (role, status).
 * Pagination removed to return all matching users.
 */
const getAllUsers = async (req, res) => {
  try {
    const { role, status } = req.query;

    let query = supabase.from('users').select('id, name, full_name, role, created_at, status');

    // Apply filters if provided
    if (role) {
      query = query.eq('role', role);
    }
    if (status) {
      query = query.eq('status', status);
    }

    // Pagination removed - will return all matching results

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users.',
    });
  }
};

/**
 * Fetch a single user by their ID.
 */
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('users')
      .select('id, name, full_name, role, created_at, status')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found error
        return res.status(404).json({
          success: false,
          message: 'User not found.',
        });
      }
      throw error;
    }

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error fetching user by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user details.',
    });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
};
