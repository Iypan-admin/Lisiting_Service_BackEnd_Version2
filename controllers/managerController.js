// controllers/managerController.js
const { supabase, supabaseAdmin } = require("../config/supabaseClient");

/**
 * Fetch all managers with optional pagination.
 */
const getAllManagers = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('manager')
      .select(`
        manager_id, 
        created_at, 
        active, 
        user_id,
        user_info:users!user_id(id, name)
      `);

    if (error) {
      throw error;
    }

    // Transform the response to include user name and remove nested object
    const transformedData = data.map(manager => ({
      ...manager,
      name: manager.user_info?.name,
      user_info: undefined // Remove the nested object
    }));

    res.status(200).json({
      success: true,
      data: transformedData,
    });
  } catch (error) {
    console.error('Error fetching managers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch managers.',
    });
  }
};

/**
 * Fetch a single manager by its ID.
 */
const getManagerById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('manager')
      .select(`
        manager_id, 
        created_at, 
        active, 
        user_id,
        user_info:users!user_id(id, name)
      `)
      .eq('manager_id', id)
      .single();

    if (error) {
      return res.status(404).json({
        success: false,
        message: 'Manager not found.',
      });
    }

    // Transform the response to include user name and remove nested object
    const transformedData = {
      ...data,
      name: data.user_info?.name,
      user_info: undefined // Remove the nested object
    };

    res.status(200).json({
      success: true,
      data: transformedData,
    });
  } catch (error) {
    console.error('Error fetching manager by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch manager details.',
    });
  }
};

module.exports = {
  getAllManagers,
  getManagerById,
};
