// controllers/academicCoordinatorsController.js

const { supabase, supabaseAdmin } = require("../config/supabaseClient");

/**
 * Fetch all academic coordinators with pagination.
 */
const getAllAcademicCoordinators = async (req, res) => {
  try {
    let query = supabase
      .from('academic_coordinator')
      .select(`
        academic_coordinator_id, 
        created_at, 
        user_id,
        manager,
        coordinator_info:users!user_id(id, name)
      `)

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    // Transform the response to include coordinator name and remove nested object
    const transformedData = data.map(coordinator => ({
      ...coordinator,
      coordinator_name: coordinator.coordinator_info?.name,
      coordinator_info: undefined // Remove the nested object
    }));

    res.status(200).json({
      success: true,
      data: transformedData,
    });
  } catch (error) {
    console.error('Error fetching academic coordinators:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch academic coordinator details.',
    });
  }
};

/**
 * Fetch a single academic coordinator by their ID.
 */
const getAcademicCoordinatorById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('academic_coordinator')
      .select(`
        academic_coordinator_id, 
        created_at, 
        user_id,
        manager,
        coordinator_info:users!user_id(id, name)
      `)
      .eq('academic_coordinator_id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found error
        return res.status(404).json({
          success: false,
          message: 'Academic coordinator not found.',
        });
      }
      throw error;
    }

    // Transform the response to include coordinator name and remove nested object
    const transformedData = {
      ...data,
      coordinator_name: data.coordinator_info?.name,
      coordinator_info: undefined
    };

    res.status(200).json({
      success: true,
      data: transformedData,
    });
  } catch (error) {
    console.error('Error fetching academic coordinator by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch academic coordinator details.',
    });
  }
};

module.exports = {
  getAllAcademicCoordinators,
  getAcademicCoordinatorById,
};
