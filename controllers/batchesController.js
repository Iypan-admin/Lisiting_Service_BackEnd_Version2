// controllers/batchesController.js

const { supabase, supabaseAdmin } = require("../config/supabaseClient");
const { withRetry } = require("../utils/httpClient");

/**
 * Fetch all batches with optional pagination.
 */
const getAllBatches = async (req, res) => {
  try {

    const { data, error } = await supabase
      .from('batches')
      .select('batch_id, created_at, batch_name, duration, center, teacher, course_id');

    if (error) throw error;

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error fetching batches:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch batches.',
    });
  }
};

/**
 * Fetch a single batch by its ID with course details.
 */
const getBatchById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('batches')
      .select(`
        batch_id,
        created_at,
        batch_name,
        duration,
        center,
        teacher,
        course_id,
        total_sessions,
        course:courses(course_name, type),
        center_details:centers!inner(
          center_id,
          center_name
        )
      `)
      .eq('batch_id', id)
      .single();

    if (error) {
      // When record not found, return 404.
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'Batch not found.',
        });
      }
      throw error;
    }

    // Transform the response to flatten the structure
    const transformedData = {
      ...data,
      course_name: data.course?.course_name,
      course_type: data.course?.type,
      center_name: data.center_details?.center_name,
      course: undefined, // Remove nested object
      center_details: undefined // Remove nested object
    };

    res.status(200).json({
      success: true,
      data: transformedData,
    });
  } catch (error) {
    console.error('Error fetching batch by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch batch details.',
    });
  }
};

/**
 * Fetch all batches from a specific center
 */
const getBatchesByCenter = async (req, res) => {
  try {
    const { centerId } = req.params;

    const { data, error } = await withRetry(() => supabase
      .from('batches')
      .select(`
        batch_id,
        created_at,
        batch_name,
        duration,
        center,
        teacher,
        course_id,
        status,
        course:courses(course_name, type, mode),
        center_details:centers!batches_center_fkey(center_id, center_name),
        teacher_details:teachers!batches_teacher_fkey(
          teacher_id,
          teacher:users(
            id,
            name
          )
        ),
        assistant_teacher_details:teachers!batches_assistant_tutor_fkey(
          teacher_id,
          teacher:users(
            id,
            name
          )
        ),
        enrollment:enrollment(
          enrollment_id,
          student
        )
      `)
      .eq('center', centerId), 3, 2000, 'getBatchesByCenter');

    if (error) throw error;

    // Transform the response to flatten the nested structure
    const transformedData = data.map(batch => ({
      ...batch,
      course_name: batch.course?.course_name,
      course_type: batch.course?.type,
      mode: batch.course?.mode,
      center_name: batch.center_details?.center_name,
      teacher_name: batch.teacher_details?.teacher?.name,
      assistant_teacher_name: batch.assistant_teacher_details?.teacher?.name,
      student_count: batch.enrollment?.length || 0,
      status: batch.status || 'Pending',
      course: undefined,
      center_details: undefined,
      teacher_details: undefined,
      assistant_teacher_details: undefined,
      enrollment: undefined
    }));

    res.status(200).json({
      success: true,
      data: transformedData
    });
  } catch (error) {
    console.error('Error fetching center batches:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch batches for this center.'
    });
  }
};

/**
 * Create a new batch
 */
const createBatch = async (req, res) => {
  try {
    const batchData = req.body;
    const userId = req.user.id; // Get user ID from JWT token

    // Add created_by field
    const batchWithCreator = {
      ...batchData,
      created_by: userId,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('batches')
      .insert([batchWithCreator])
      .select()
      .single();

    if (error) throw error;

    // Create notifications for assigned teachers
    const batchName = data.batch_name || 'a new batch';
    
    // Notify main teacher if assigned
    if (data.teacher) {
      const title = `New Batch Assigned 🎉`;
      const message = `You have been assigned as the main teacher for batch ${batchName}.`;
      const fullMessage = `${title}\n${message}`;
      
      const { error: mainTeacherNotifError } = await supabaseAdmin
        .from("teacher_notifications")
        .insert({
          teacher_id: data.teacher,
          title: title,
          message: message,
          is_read: false,
        });
      
      if (mainTeacherNotifError) {
        console.error("Error creating notification for main teacher:", mainTeacherNotifError);
      }
    }
    
    // Notify assistant teacher if assigned
    if (data.assistant_tutor) {
      const title = `New Batch Assigned 🎉`;
      const message = `You have been assigned as the assistant teacher for batch ${batchName}.`;
      const fullMessage = `${title}\n${message}`;
      
      const { error: assistantNotifError } = await supabaseAdmin
        .from("teacher_notifications")
        .insert({
          teacher_id: data.assistant_tutor,
          title: title,
          message: message,
          is_read: false,
        });
      
      if (assistantNotifError) {
        console.error("Error creating notification for assistant teacher:", assistantNotifError);
      }
    }

    res.status(201).json({
      success: true,
      data,
      message: 'Batch created successfully'
    });
  } catch (error) {
    console.error('Error creating batch:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create batch.'
    });
  }
};

/**
 * Update a batch by ID
 */
const updateBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const userId = req.user.id; // Get user ID from JWT token

    // Get existing batch data to check for teacher changes
    const { data: existingBatch, error: fetchError } = await supabase
      .from('batches')
      .select('teacher, assistant_tutor, batch_name')
      .eq('batch_id', id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    // Add updated_by field
    const batchWithUpdater = {
      ...updateData,
      updated_by: userId,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('batches')
      .update(batchWithUpdater)
      .eq('batch_id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'Batch not found.'
        });
      }
      throw error;
    }

    // Create notifications for newly assigned teachers
    const batchName = data.batch_name || existingBatch?.batch_name || 'a batch';
    
    // Check if main teacher was changed/assigned
    if (updateData.teacher && updateData.teacher !== existingBatch?.teacher) {
      const title = `Batch Assigned 🎉`;
      const message = `You have been assigned as the main teacher for batch ${batchName}.`;
      
      const { error: mainTeacherNotifError } = await supabaseAdmin
        .from("teacher_notifications")
        .insert({
          teacher_id: updateData.teacher,
          title: title,
          message: message,
          is_read: false,
        });
      
      if (mainTeacherNotifError) {
        console.error("Error creating notification for main teacher:", mainTeacherNotifError);
      }
    }
    
    // Check if assistant teacher was changed/assigned
    if (updateData.assistant_tutor && updateData.assistant_tutor !== existingBatch?.assistant_tutor) {
      const title = `Batch Assigned 🎉`;
      const message = `You have been assigned as the assistant teacher for batch ${batchName}.`;
      
      const { error: assistantNotifError } = await supabaseAdmin
        .from("teacher_notifications")
        .insert({
          teacher_id: updateData.assistant_tutor,
          title: title,
          message: message,
          is_read: false,
        });
      
      if (assistantNotifError) {
        console.error("Error creating notification for assistant teacher:", assistantNotifError);
      }
    }

    res.status(200).json({
      success: true,
      data,
      message: 'Batch updated successfully'
    });
  } catch (error) {
    console.error('Error updating batch:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update batch.'
    });
  }
};

/**
 * Delete a batch by ID
 */
const deleteBatch = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('batches')
      .delete()
      .eq('batch_id', id);

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'Batch not found.'
        });
      }
      throw error;
    }

    res.status(200).json({
      success: true,
      message: 'Batch deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting batch:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete batch.'
    });
  }
};

module.exports = {
  getAllBatches,
  getBatchById,
  getBatchesByCenter,
  createBatch,
  updateBatch,
  deleteBatch
};
