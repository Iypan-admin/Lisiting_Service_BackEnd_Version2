// controllers/statesController.js

const { supabase, supabaseAdmin } = require("../config/supabaseClient");

/**
 * Fetch all states with optional pagination.
 */
const getAllStates = async (req, res) => {
  try {

    const { data, error } = await supabase
      .from('states')
      .select(`
        state_id, 
        created_at, 
        state_name, 
        state_admin,
        academic_coordinator,
        admin:users!state_admin(id, name)
      `)

    if (error) throw error;

    // Transform the response to include admin name and remove nested object
    const transformedData = data.map(state => ({
      ...state,
      admin_name: state.admin?.name,
      admin: undefined // Remove the nested object
    }));

    res.status(200).json({
      success: true,
      data: transformedData,
    });
  } catch (error) {
    console.error('Error fetching states:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch states.',
    });
  }
};

/**
 * Fetch a single state by its ID.
 */
const getStateById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('states')
      .select(`
        state_id, 
        created_at, 
        state_name, 
        state_admin,
        academic_coordinator,
        admin:users!state_admin(id, name)
      `)
      .eq('state_id', id)
      .single();

    if (error) {
      return res.status(404).json({
        success: false,
        message: 'State not found.',
      });
    }

    // Transform the response to include admin name and remove nested object
    const transformedData = {
      ...data,
      admin_name: data.admin?.name,
      admin: undefined
    };

    res.status(200).json({
      success: true,
      data: transformedData,
    });
  } catch (error) {
    console.error('Error fetching state by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch state details.',
    });
  }
};


module.exports = {
  getAllStates,
  getStateById,
};
