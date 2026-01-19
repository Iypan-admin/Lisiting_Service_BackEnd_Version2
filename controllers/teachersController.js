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

    // Convert map to array
    const allBatches = Array.from(batchesMap.values());
    
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    console.log(`[getTeacherBatches] Teacher ID: ${teacher_id}, Today: ${today}`);
    
    // Fetch approved leave requests for this teacher
    // Only hide batches if today's date falls within the leave period (date_from <= today <= date_to)
    // This means:
    // - If from_date is in the future, batch remains visible
    // - If from_date has arrived, batch is hidden
    // - If to_date has passed, batch becomes visible again
    const { data: allApprovedRequests, error: leaveRequestError } = await supabaseAdmin
      .from('teacher_batch_requests')
      .select('batch_id, date_from, date_to, status, request_type')
      .eq('main_teacher_id', teacher_id)
      .eq('status', 'APPROVED')
      .eq('request_type', 'LEAVE'); // Only filter LEAVE requests, not SUB_TEACHER
    
    if (leaveRequestError) {
      console.error('[getTeacherBatches] Error fetching leave requests:', leaveRequestError);
      // Continue without filtering if there's an error
    }
    
    console.log(`[getTeacherBatches] Found ${allApprovedRequests?.length || 0} approved LEAVE requests for teacher ${teacher_id}`);
    if (allApprovedRequests && allApprovedRequests.length > 0) {
      console.log('[getTeacherBatches] Approved requests:', JSON.stringify(allApprovedRequests, null, 2));
    }
    
    // Filter to only include requests where today falls within the date range
    // Batch should be hidden only if: date_from <= today <= date_to
    const activeLeaveRequests = (allApprovedRequests || []).filter(request => {
      try {
        // Get dates from request (Supabase returns date type as YYYY-MM-DD string)
        let fromDateStr = request.date_from;
        let toDateStr = request.date_to;
        
        // Handle different date formats
        if (fromDateStr && typeof fromDateStr === 'string') {
          // If it's a string, extract just the date part (YYYY-MM-DD)
          fromDateStr = fromDateStr.split('T')[0].split(' ')[0];
        } else if (fromDateStr) {
          // If it's a Date object or other format, convert to YYYY-MM-DD
          fromDateStr = new Date(fromDateStr).toISOString().split('T')[0];
        }
        
        if (toDateStr && typeof toDateStr === 'string') {
          toDateStr = toDateStr.split('T')[0].split(' ')[0];
        } else if (toDateStr) {
          toDateStr = new Date(toDateStr).toISOString().split('T')[0];
        }
        
        if (!fromDateStr || !toDateStr) {
          console.log(`[Leave Request] Skipping request - missing dates. From: ${request.date_from}, To: ${request.date_to}`);
          return false; // Skip if dates are missing
        }
        
        // Convert to Date objects for proper comparison
        const fromDate = new Date(fromDateStr);
        const toDate = new Date(toDateStr);
        const todayDate = new Date(today);
        
        // Reset time to midnight for accurate date-only comparison
        fromDate.setHours(0, 0, 0, 0);
        toDate.setHours(0, 0, 0, 0);
        todayDate.setHours(0, 0, 0, 0);
        
        // Check if today is within the leave period (inclusive)
        // Hide batch only if: fromDate <= today <= toDate
        const isActive = fromDate <= todayDate && toDate >= todayDate;
        
        // Debug logging - ALWAYS log, not just when active
        console.log(`[Leave Request] Checking batch ${request.batch_id} - From: ${fromDateStr}, To: ${toDateStr}, Today: ${today}, IsActive: ${isActive}`);
        console.log(`[Leave Request] Date comparison - fromDate (${fromDateStr}) <= today (${today}): ${fromDateStr <= today}, toDate (${toDateStr}) >= today (${today}): ${toDateStr >= today}`);
        
        return isActive;
      } catch (error) {
        console.error(`[Leave Request] Error processing request for batch ${request.batch_id}:`, error);
        return false; // Skip on error
      }
    });
    
    // Create a set of batch_ids that should be hidden (have active approved leave requests)
    const hiddenBatchIds = new Set();
    if (activeLeaveRequests && activeLeaveRequests.length > 0) {
      console.log(`[getTeacherBatches] Hiding ${activeLeaveRequests.length} batches due to active leave requests`);
      activeLeaveRequests.forEach(request => {
        hiddenBatchIds.add(request.batch_id);
        console.log(`[getTeacherBatches] Hiding batch_id: ${request.batch_id}`);
      });
    } else {
      console.log(`[getTeacherBatches] No active leave requests - all batches will be visible`);
    }
    
    // Debug logging - ALWAYS log
    console.log(`[getTeacherBatches] Teacher ${teacher_id} - Total approved LEAVE requests: ${allApprovedRequests?.length || 0}, Active (hiding batches): ${activeLeaveRequests.length}, Today: ${today}`);
    console.log(`[getTeacherBatches] Total batches before filtering: ${allBatches.length}, Hidden batch IDs:`, Array.from(hiddenBatchIds));
    
    // Filter out batches that have active approved leave requests
    const visibleBatches = allBatches.filter(batch => {
      const shouldHide = hiddenBatchIds.has(batch.batch_id);
      if (shouldHide) {
        console.log(`[getTeacherBatches] Filtering out batch ${batch.batch_id} (${batch.batch_name}) - has active leave request`);
      }
      return !shouldHide;
    });
    
    console.log(`[getTeacherBatches] Total batches after filtering: ${visibleBatches.length}`);
    
    // Transform the response to include center name and course details
    const transformedData = visibleBatches.map(batch => ({
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
