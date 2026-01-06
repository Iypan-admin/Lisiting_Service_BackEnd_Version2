// controllers/teachersController.js

const { supabase, supabaseAdmin } = require("../config/supabaseClient");

/**
 * Fetch all teachers with optional pagination.
 */
const getAllTeachers = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('teachers')
      .select(`
        teacher_id,
        created_at,
        center,
        teacher,
        teacher_info:users!inner(id, name)
      `);

    if (error) throw error;

    // Transform the response to include teacher name and remove nested object
    const transformedData = data.map(teacher => ({
      ...teacher,
      teacher_name: teacher.teacher_info?.name,
      center_id: teacher.center,
      teacher_info: undefined // Remove the nested object
    }));

    res.status(200).json({
      success: true,
      data: transformedData
    });
  } catch (error) {
    console.error('Error fetching teachers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch teachers.'
    });
  }
};

/**
 * Fetch a single teacher by their ID.
 */
const getTeacherById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('teachers')
      .select('teacher_id, created_at, center, teacher')
      .eq('teacher_id', id)
      .single();

    if (error) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found.',
      });
    }

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error fetching teacher by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch teacher details.',
    });
  }
};

/**
 * Fetch all batches assigned to a teacher (both as main teacher and assistant tutor)
 */
const getTeacherBatches = async (req, res) => {
  try {
    const { id: user_id } = req.user; // Get user_id from auth middleware

    // First, get the teacher record for this user
    const { data: teacherData, error: teacherError } = await supabase
      .from('teachers')
      .select('teacher_id')
      .eq('teacher', user_id)
      .single();

    if (teacherError || !teacherData) {
      return res.status(404).json({
        success: false,
        message: 'Teacher record not found for this user.',
      });
    }

    const teacher_id = teacherData.teacher_id;

    // Fetch batches where teacher is the main teacher
    const { data: mainTeacherBatches, error: mainTeacherError } = await supabase
      .from('batches')
      .select(`
        batch_id,
        batch_name,
        duration,
        created_at,
        center,
        course_id,
        status,
        start_date,
        end_date,
        time_from,
        time_to,
        center_details:centers!batches_center_fkey(center_id, center_name),
        course_details:courses(course_name, type)
      `)
      .eq('teacher', teacher_id);

    if (mainTeacherError) throw mainTeacherError;

    // Fetch batches where teacher is the assistant tutor
    const { data: assistantTutorBatches, error: assistantTutorError } = await supabase
      .from('batches')
      .select(`
        batch_id,
        batch_name,
        duration,
        created_at,
        center,
        course_id,
        status,
        start_date,
        end_date,
        time_from,
        time_to,
        center_details:centers!batches_center_fkey(center_id, center_name),
        course_details:courses(course_name, type)
      `)
      .eq('assistant_tutor', teacher_id);

    if (assistantTutorError) throw assistantTutorError;

    // Combine both results and remove duplicates (in case a batch has same teacher as main and assistant, which shouldn't happen but just in case)
    const batchesMap = new Map();
    
    // Add main teacher batches
    if (mainTeacherBatches) {
      mainTeacherBatches.forEach(batch => {
        batchesMap.set(batch.batch_id, batch);
      });
    }
    
    // Add assistant tutor batches
    if (assistantTutorBatches) {
      assistantTutorBatches.forEach(batch => {
        batchesMap.set(batch.batch_id, batch);
      });
    }

    // Convert map to array and transform
    const allBatches = Array.from(batchesMap.values());
    
    // Transform the response to include center name and course details
    const transformedData = allBatches.map(batch => ({
      ...batch,
      center_name: batch.center_details?.center_name,
      course_name: batch.course_details?.course_name,
      course_type: batch.course_details?.type,
      center_details: undefined, // Remove nested object
      course_details: undefined, // Remove nested object
    }));

    res.status(200).json({
      success: true,
      data: transformedData,
    });
  } catch (error) {
    console.error('Error fetching teacher batches:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch teacher batches.',
    });
  }
};

/**
 * Fetch all students assigned to a teacher (across all batches)
 */
const getStudentsByTeacher = async (req, res) => {
  try {
    const { id: user_id } = req.user; // Get user_id from auth middleware

    // First, get the teacher record for this user
    const { data: teacherData, error: teacherError } = await supabase
      .from('teachers')
      .select('teacher_id')
      .eq('teacher', user_id)
      .single();

    if (teacherError || !teacherData) {
      return res.status(404).json({
        success: false,
        message: 'Teacher record not found for this user.',
      });
    }

    const teacher_id = teacherData.teacher_id;

    // First, get all batches for this teacher
    const { data: batches, error: batchError } = await supabase
      .from('batches')
      .select('batch_id')
      .eq('teacher', teacher_id);

    if (batchError) throw batchError;

    if (!batches.length) {
      return res.status(200).json({
        success: true,
        data: [] // No batches, so no students
      });
    }

    // Get batch IDs
    const batchIds = batches.map(batch => batch.batch_id);

    // Get all students enrolled in these batches
    const { data, error } = await supabase
      .from('enrollment')
      .select(`
        enrollment_id,
        batch,
        student:students (
          student_id,
          registration_number,
          name,
          email,
          phone,
          status,
          center_details:centers!students_center_fkey (center_id, center_name)
        ),
        batch_details:batches (batch_id, batch_name)
      `)
      .in('batch', batchIds)
      .eq('status', true); // Only active enrollments

    if (error) throw error;

    // Transform the response to flatten the structure
    const transformedData = data.map(enrollment => ({
      enrollment_id: enrollment.enrollment_id,
      batch_id: enrollment.batch,
      batch_name: enrollment.batch_details?.batch_name,
      ...enrollment.student,
      center_name: enrollment.student?.center_details?.center_name,
      center_details: undefined,
      student: undefined,
      batch_details: undefined
    }));

    res.status(200).json({
      success: true,
      data: transformedData
    });
  } catch (error) {
    console.error('Error fetching teacher students:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch students assigned to teacher.'
    });
  }
};

/**
 * Get students from a specific batch assigned to a teacher
 */
const getTeacherBatchStudents = async (req, res) => {
  try {
    const { id: user_id } = req.user; // Get user_id from auth middleware
    const { batchId } = req.params; // Get batch ID from route params
    const date = (req.query && req.query.date) ? req.query.date : new Date().toISOString().slice(0,10);

    // First, verify this teacher exists and get teacher_id
    const { data: teacherData, error: teacherError } = await supabase
      .from('teachers')
      .select('teacher_id')
      .eq('teacher', user_id)
      .single();

    if (teacherError || !teacherData) {
      return res.status(404).json({
        success: false,
        message: 'Teacher record not found for this user.'
      });
    }

    // Verify this batch belongs to this teacher OR teacher is assistant tutor OR teacher is approved sub on given date
    let isAuthorized = false;
    // 1) main teacher ownership
    {
      const { data: batchData, error: batchError } = await supabase
        .from('batches')
        .select('batch_id')
        .eq('teacher', teacherData.teacher_id)
        .eq('batch_id', batchId)
        .single();
      if (!batchError && batchData) isAuthorized = true;
    }

    // 2) assistant tutor check
    if (!isAuthorized) {
      const { data: assistantTutorBatch, error: assistantTutorError } = await supabase
        .from('batches')
        .select('batch_id')
        .eq('assistant_tutor', teacherData.teacher_id)
        .eq('batch_id', batchId)
        .single();
      if (!assistantTutorError && assistantTutorBatch) isAuthorized = true;
    }

    // 3) sub-teacher approved assignment with visibility window
    if (!isAuthorized) {
      const { data: subRows, error: subErr } = await supabaseAdmin
        .from('teacher_batch_requests')
        .select('approved_at, date_from, date_to')
        .eq('batch_id', batchId)
        .in('status', ['APPROVED','Approved'])
        .eq('sub_teacher_id', teacherData.teacher_id);
      if (subErr) {
        console.error('Sub assignment check error:', subErr);
      } else {
        const hasVisible = (subRows || []).some(r => {
          const visStart = r.approved_at ? new Date(r.approved_at).toISOString().slice(0,10) : r.date_from;
          return visStart <= date && r.date_to >= date;
        });
        if (hasVisible) isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to access this batch or batch does not exist.'
      });
    }

    // Get students enrolled in this batch
    const { data, error } = await supabase
      .from('enrollment')
      .select(`
        enrollment_id,
        batch,
        student:students (
          student_id,
          registration_number,
          name,
          email,
          phone,
          status,
          center_details:centers!students_center_fkey (center_id, center_name)
        ),
        batch_details:batches (batch_id, batch_name)
      `)
      .eq('batch', batchId)
      .eq('status', true); // Only active enrollments

    if (error) throw error;

    // Transform the response to flatten the structure
    const transformedData = data.map(enrollment => ({
      enrollment_id: enrollment.enrollment_id,
      batch_id: enrollment.batch,
      batch_name: enrollment.batch_details?.batch_name,
      ...enrollment.student,
      center_name: enrollment.student?.center_details?.center_name,
      center_details: undefined,
      student: undefined,
      batch_details: undefined
    }));

    res.status(200).json({
      success: true,
      data: transformedData
    });
  } catch (error) {
    console.error('Error fetching batch students:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch students in this batch.'
    });
  }
};

/**
 * Fetch all teachers from a specific center
 */
const getTeachersByCenter = async (req, res) => {
  try {
    const { centerId } = req.params;

    const { data, error } = await supabase
      .from('teachers')
      .select(`
        teacher_id,
        created_at,
        center,
        teacher,
        teacher_info:users!inner(
          id, 
          name,
          full_name
        )
      `)
      .eq('center', centerId);

    if (error) throw error;

    // Transform the response
    const transformedData = data.map(teacher => ({
      ...teacher,
      teacher_name: teacher.teacher_info?.name,
      teacher_full_name: teacher.teacher_info?.full_name,
      email: teacher.teacher_info?.email,
      teacher_info: undefined // Remove the nested object
    }));

    res.status(200).json({
      success: true,
      data: transformedData
    });
  } catch (error) {
    console.error('Error fetching center teachers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch teachers for this center.'
    });
  }
};

/**
 * Get teacher_id for the logged-in teacher
 */
const getMyTeacherId = async (req, res) => {
  try {
    const { id: user_id } = req.user; // Get user_id from auth middleware

    // Get the teacher_id from teachers table
    const { data: teacherData, error: teacherError } = await supabase
      .from('teachers')
      .select('teacher_id')
      .eq('teacher', user_id)
      .single();

    if (teacherError || !teacherData) {
      return res.status(404).json({
        success: false,
        message: 'Teacher record not found for this user.',
      });
    }

    res.status(200).json({
      success: true,
      teacher_id: teacherData.teacher_id,
    });
  } catch (error) {
    console.error('Error fetching teacher ID:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch teacher ID.',
    });
  }
};

// Update the module exports to include the new function
module.exports = {
  getAllTeachers,
  getTeacherById,
  getTeacherBatches,
  getStudentsByTeacher,
  getTeacherBatchStudents,
  getTeachersByCenter,
  getMyTeacherId
};
