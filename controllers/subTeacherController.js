const { supabase, supabaseAdmin } = require("../config/supabaseClient");

// Helper: get teacher_id for current user
async function getCurrentTeacherId(userId) {
  const { data, error } = await supabaseAdmin
    .from("teachers")
    .select("teacher_id")
    .eq("teacher", userId)
    .single();
  if (error || !data) return null;
  return data.teacher_id;
}

// Teacher creates a request
const createRequest = async (req, res) => {
  try {
    const { id: user_id, role } = req.user;
    if (role !== "teacher") return res.status(403).json({ success: false, message: "Forbidden" });

    const teacherId = await getCurrentTeacherId(user_id);
    if (!teacherId) return res.status(404).json({ success: false, message: "Teacher not found" });

    const { batch_id, request_type, reason, date_from, date_to } = req.body;
    if (!batch_id || !request_type || !date_from || !date_to) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    // Verify batch belongs to this teacher (either as main teacher or assistant tutor)
    const { data: batchData, error: batchErr } = await supabaseAdmin
      .from("batches")
      .select("batch_id, batch_name, teacher, assistant_tutor")
      .eq("batch_id", batch_id)
      .single();
    
    if (batchErr || !batchData) {
      return res.status(403).json({ success: false, message: "Batch not found" });
    }

    // Check if teacher is main teacher or assistant tutor
    const isMainTeacher = batchData.teacher === teacherId;
    const isAssistantTutor = batchData.assistant_tutor === teacherId;
    
    if (!isMainTeacher && !isAssistantTutor) {
      return res.status(403).json({ success: false, message: "Batch not owned by teacher" });
    }

    const { data, error } = await supabase
      .from("teacher_batch_requests")
      .insert([
        {
          batch_id,
          main_teacher_id: teacherId,
          request_type,
          reason: reason || null,
          date_from,
          date_to,
          status: "PENDING",
        },
      ])
      .select()
      .single();

    if (error) throw error;

    // Create notification for Academic Coordinators when teacher requests leave
    // Only send notification for LEAVE requests (not SUB_TEACHER requests)
    if (request_type === 'LEAVE') {
      try {
        // Get teacher's name from users table
        const { data: teacherUserData, error: teacherUserError } = await supabaseAdmin
          .from("teachers")
          .select("teacher_info:users!teachers_teacher_fkey(full_name, name)")
          .eq("teacher_id", teacherId)
          .single();

        let teacherName = "Teacher";
        if (!teacherUserError && teacherUserData?.teacher_info) {
          teacherName = teacherUserData.teacher_info.full_name || teacherUserData.teacher_info.name || "Teacher";
        }

        // Determine teacher role
        const teacherRole = isMainTeacher ? "Main Teacher" : "Assistant Tutor";
        const batchName = batchData.batch_name || batch_id;

        // Get all academic coordinators
        const { data: academicCoordinators, error: coordError } = await supabaseAdmin
          .from('academic_coordinator')
          .select('user_id');

        if (!coordError && academicCoordinators && academicCoordinators.length > 0) {
          // Create notification message
          const notificationMessage = `In batch ${batchName}, ${teacherName} (${teacherRole}) is requesting leave approval`;

          // Create notification for each academic coordinator
          const notifications = academicCoordinators.map(coord => ({
            academic_coordinator_id: coord.user_id,
            message: notificationMessage,
            type: 'TEACHER_LEAVE_REQUEST',
            related_id: data.id,
            is_read: false
          }));

          // Insert notifications into academic_notifications table
          const { error: notifError } = await supabaseAdmin
            .from('academic_notifications')
            .insert(notifications);

          if (notifError) {
            console.error('Error creating academic notifications for leave request:', notifError);
            // Don't fail the request if notification creation fails
          } else {
            console.log(`✅ Notifications sent to ${academicCoordinators.length} academic coordinator(s) for leave request from ${teacherName}`);
          }
        }
      } catch (notifErr) {
        console.error('Error in notification creation for leave request:', notifErr);
        // Don't fail the request if notification creation fails
      }
    }

    return res.status(201).json({ success: true, message: "Request submitted successfully" });
  } catch (e) {
    console.error("createRequest error", e);
    return res.status(500).json({ success: false, message: "Failed to create request" });
  }
};

// Teacher lists own requests
const getMyRequests = async (req, res) => {
  try {
    const { id: user_id, role } = req.user;
    if (role !== "teacher") return res.status(403).json({ success: false, message: "Forbidden" });
    const teacherId = await getCurrentTeacherId(user_id);
    if (!teacherId) return res.status(404).json({ success: false, message: "Teacher not found" });

    const { data, error } = await supabaseAdmin
      .from("teacher_batch_requests")
      .select(
        `id, batch_id, request_type, reason, date_from, date_to, status, sub_teacher_id, approved_by, approved_at,
         batch:batches(batch_id, batch_name),
         sub_teacher:teachers!teacher_batch_requests_sub_teacher_id_fkey(teacher_id)`
      )
      .eq("main_teacher_id", teacherId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return res.status(200).json({ success: true, data });
  } catch (e) {
    console.error("getMyRequests error", e);
    return res.status(500).json({ success: false, message: "Failed to fetch requests" });
  }
};

// Teacher updates own request (only if status is PENDING)
const updateRequest = async (req, res) => {
  try {
    const { id: user_id, role } = req.user;
    if (role !== "teacher") return res.status(403).json({ success: false, message: "Forbidden" });

    const teacherId = await getCurrentTeacherId(user_id);
    if (!teacherId) return res.status(404).json({ success: false, message: "Teacher not found" });

    const { id } = req.params;
    const { batch_id, request_type, reason, date_from, date_to } = req.body;

    if (!batch_id || !request_type || !date_from || !date_to) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    // Verify the request belongs to this teacher and is PENDING
    const { data: existingRequest, error: fetchError } = await supabaseAdmin
      .from("teacher_batch_requests")
      .select("id, main_teacher_id, status")
      .eq("id", id)
      .single();

    if (fetchError || !existingRequest) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }

    if (existingRequest.main_teacher_id !== teacherId) {
      return res.status(403).json({ success: false, message: "You can only update your own requests" });
    }

    if (existingRequest.status !== "PENDING") {
      return res.status(400).json({ success: false, message: "Only PENDING requests can be updated" });
    }

    // Verify batch belongs to this teacher
    const { data: batchData, error: batchErr } = await supabase
      .from("batches")
      .select("batch_id")
      .eq("batch_id", batch_id)
      .eq("teacher", teacherId)
      .single();
    if (batchErr || !batchData) {
      return res.status(403).json({ success: false, message: "Batch not owned by teacher" });
    }

    // Update the request
    const { data, error } = await supabase
      .from("teacher_batch_requests")
      .update({
        batch_id,
        request_type,
        reason: reason || null,
        date_from,
        date_to,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return res.status(200).json({ success: true, message: "Request updated successfully", data });
  } catch (e) {
    console.error("updateRequest error", e);
    return res.status(500).json({ success: false, message: "Failed to update request" });
  }
};

// Teacher deletes own request (only if status is PENDING)
const deleteRequest = async (req, res) => {
  try {
    const { id: user_id, role } = req.user;
    if (role !== "teacher") return res.status(403).json({ success: false, message: "Forbidden" });

    const teacherId = await getCurrentTeacherId(user_id);
    if (!teacherId) return res.status(404).json({ success: false, message: "Teacher not found" });

    const { id } = req.params;

    // Verify the request belongs to this teacher and is PENDING
    const { data: existingRequest, error: fetchError } = await supabaseAdmin
      .from("teacher_batch_requests")
      .select("id, main_teacher_id, status")
      .eq("id", id)
      .single();

    if (fetchError || !existingRequest) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }

    if (existingRequest.main_teacher_id !== teacherId) {
      return res.status(403).json({ success: false, message: "You can only delete your own requests" });
    }

    if (existingRequest.status !== "PENDING") {
      return res.status(400).json({ success: false, message: "Only PENDING requests can be deleted" });
    }

    // Delete the request
    const { error } = await supabaseAdmin
      .from("teacher_batch_requests")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return res.status(200).json({ success: true, message: "Request deleted successfully" });
  } catch (e) {
    console.error("deleteRequest error", e);
    return res.status(500).json({ success: false, message: "Failed to delete request" });
  }
};

// Admin list requests (filterable by status)
const adminListRequests = async (req, res) => {
  try {
    const { role } = req.user;
    if (role !== "academic" && role !== "admin") return res.status(403).json({ success: false, message: "Forbidden" });
    const { status } = req.query;
    let q = supabaseAdmin
      .from("teacher_batch_requests")
      .select(
        `id, request_type, reason, date_from, date_to, status, created_at, main_teacher_id,
         batch:batches(batch_id, batch_name, center, course_id, teacher, assistant_tutor),
         main_teacher:teachers!teacher_batch_requests_main_teacher_id_fkey(
           teacher_id,
           teacher_info:users!teachers_teacher_fkey(id, name, full_name)
         ),
         sub_teacher:teachers!teacher_batch_requests_sub_teacher_id_fkey(
           teacher_id,
           teacher_info:users!teachers_teacher_fkey(id, name, full_name)
         )`
      )
      .order("created_at", { ascending: false });
    if (status) q = q.eq("status", status);
    const { data, error } = await q;
    if (error) throw error;
    return res.status(200).json({ success: true, data });
  } catch (e) {
    console.error("adminListRequests error", e);
    return res.status(500).json({ success: false, message: "Failed to fetch requests" });
  }
};

// Approve with sub_teacher
const approveRequest = async (req, res) => {
  try {
    const { role, id: user_id } = req.user;
    if (role !== "academic" && role !== "admin") return res.status(403).json({ success: false, message: "Forbidden" });
    const { id } = req.params;
    const { sub_teacher_id } = req.body;
    if (!sub_teacher_id) return res.status(400).json({ success: false, message: "sub_teacher_id required" });

    // Resolve sub_teacher_id to a valid teachers.teacher_id (supporting either teacher_id or users.id input)
    let resolvedSubTeacherId = sub_teacher_id;
    const { data: byTeacherId, error: errById } = await supabaseAdmin
      .from("teachers").select("teacher_id").eq("teacher_id", sub_teacher_id).single();
    if (errById || !byTeacherId) {
      const { data: byUserId, error: errByUser } = await supabaseAdmin
        .from("teachers").select("teacher_id").eq("teacher", sub_teacher_id).single();
      if (!errByUser && byUserId) {
        resolvedSubTeacherId = byUserId.teacher_id;
      }
    }

    // First, get the request details to create notification
    const { data: requestData, error: requestError } = await supabaseAdmin
      .from("teacher_batch_requests")
      .select("main_teacher_id, batch_id, request_type, date_from, date_to, batch:batches(batch_name)")
      .eq("id", id)
      .single();
    
    if (requestError || !requestData) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }

    const { data, error } = await supabase
      .from("teacher_batch_requests")
      .update({ status: "APPROVED", sub_teacher_id: resolvedSubTeacherId, approved_by: user_id, approved_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;

    // Create notification for the teacher
    const batchName = requestData.batch?.batch_name || "your batch";
    const requestTypeText = requestData.request_type === 'LEAVE' ? 'Leave' : 'Sub-Teacher';
    // Format: Title on first line, message on second line (matching image design)
    const title = `Your ${requestTypeText} has been approved 🎉`;
    const message = `Your ${requestTypeText} request for batch ${batchName} (${requestData.date_from} to ${requestData.date_to}) has been approved.`;
    const fullMessage = `${title}\n${message}`;
    
    const { error: notifError } = await supabaseAdmin
      .from("teacher_notifications")
      .insert({
        teacher: requestData.main_teacher_id,
        message: fullMessage,
        type: 'LEAVE_APPROVED',
        related_id: id
      });

    if (notifError) {
      console.error("Error creating notification:", notifError);
      // Don't fail the request if notification fails
    }

    return res.status(200).json({ success: true, data });
  } catch (e) {
    console.error("approveRequest error", e);
    return res.status(500).json({ success: false, message: "Failed to approve request" });
  }
};

// Reject
const rejectRequest = async (req, res) => {
  try {
    const { role, id: user_id } = req.user;
    if (role !== "academic" && role !== "admin") return res.status(403).json({ success: false, message: "Forbidden" });
    const { id } = req.params;

    const { data, error } = await supabase
      .from("teacher_batch_requests")
      .update({ status: "REJECTED", approved_by: user_id, approved_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return res.status(200).json({ success: true, data });
  } catch (e) {
    console.error("rejectRequest error", e);
    return res.status(500).json({ success: false, message: "Failed to reject request" });
  }
};

// Resolver: effective batches for current teacher for a date
const getEffectiveBatchesForDate = async (req, res) => {
  try {
    const { id: user_id, role } = req.user;
    if (role !== "teacher") return res.status(403).json({ success: false, message: "Forbidden" });
    const teacherId = await getCurrentTeacherId(user_id);
    if (!teacherId) return res.status(404).json({ success: false, message: "Teacher not found" });

    const { date } = req.query;
    if (!date) return res.status(400).json({ success: false, message: "date query param required (YYYY-MM-DD)" });

    // Get batch ids where this teacher is sub on that date
    console.log("[resolver] user_id=", user_id, "teacherId=", teacherId, "date=", date);
    const { data: asSubRows, error: subErr } = await supabaseAdmin
      .from("teacher_batch_requests")
      .select("batch_id, approved_at, date_from, date_to, main_teacher_id")
      .in("status", ["APPROVED", "Approved"]) 
      .in("sub_teacher_id", [teacherId, user_id]);
    if (subErr) throw subErr;
    // Filter sub teacher assignments for this date
    // Use date_from (actual assignment period), NOT approved_at
    const asSub = (asSubRows || []).filter(r => {
      // Always use date_from for comparison, not approved_at
      const fromDateStr = r.date_from ? (typeof r.date_from === 'string' ? r.date_from.split('T')[0] : new Date(r.date_from).toISOString().split('T')[0]) : null;
      const toDateStr = r.date_to ? (typeof r.date_to === 'string' ? r.date_to.split('T')[0] : new Date(r.date_to).toISOString().split('T')[0]) : null;
      
      if (!fromDateStr || !toDateStr) {
        return false;
      }
      
      // Check if the query date falls within the assignment period (inclusive)
      return fromDateStr <= date && toDateStr >= date;
    }).map(r => ({ batch_id: r.batch_id, date_from: r.date_from, date_to: r.date_to }));
    console.log("[resolver] asSub count=", asSub.length);

    // Batches where this teacher is main teacher
    const { data: myBatches, error: myErr } = await supabaseAdmin
      .from("batches")
      .select("batch_id, assistant_tutor")
      .eq("teacher", teacherId);
    if (myErr) throw myErr;
    console.log("[resolver] myBatches count=", (myBatches || []).length);

    // Batches where this teacher is assistant tutor
    const { data: assistantTutorBatches, error: assistantErr } = await supabaseAdmin
      .from("batches")
      .select("batch_id, teacher")
      .eq("assistant_tutor", teacherId);
    if (assistantErr) throw assistantErr;
    console.log("[resolver] assistantTutorBatches count=", (assistantTutorBatches || []).length);

    // Get all approved leave requests for this date (to check who is on leave)
    // IMPORTANT: Only filter LEAVE type requests, and only use date_from (not approved_at)
    const { data: allLeaveRequests, error: leaveErr } = await supabaseAdmin
        .from("teacher_batch_requests")
      .select("batch_id, main_teacher_id, approved_at, date_from, date_to, request_type")
      .in("status", ["APPROVED", "Approved"])
      .eq("request_type", "LEAVE"); // Only LEAVE requests, not SUB_TEACHER
    if (leaveErr) throw leaveErr;

    // Filter leave requests for this date
    // CRITICAL: Use date_from (actual leave start date), NOT approved_at
    // Batch should only be hidden when: date_from <= date <= date_to
    const activeLeaveRequests = (allLeaveRequests || []).filter(r => {
        // Always use date_from for comparison, not approved_at
        // This ensures batches are only hidden during the actual leave period
        const fromDateStr = r.date_from ? (typeof r.date_from === 'string' ? r.date_from.split('T')[0] : new Date(r.date_from).toISOString().split('T')[0]) : null;
        const toDateStr = r.date_to ? (typeof r.date_to === 'string' ? r.date_to.split('T')[0] : new Date(r.date_to).toISOString().split('T')[0]) : null;
        
        if (!fromDateStr || !toDateStr) {
          console.log(`[resolver] Skipping leave request - missing dates. From: ${r.date_from}, To: ${r.date_to}`);
          return false;
        }
        
        // Check if the query date falls within the leave period (inclusive)
        return fromDateStr <= date && toDateStr >= date;
      });
    
    console.log(`[resolver] Active leave requests for date ${date}:`, activeLeaveRequests.length);

    // Build maps for quick lookup
    const batchesWhereIAmOnLeave = new Set(
      activeLeaveRequests
        .filter(r => r.main_teacher_id === teacherId)
        .map(r => r.batch_id)
    );
    console.log("[resolver] batchesWhereIAmOnLeave count=", batchesWhereIAmOnLeave.size);

    // Map: batch_id -> main_teacher_id who is on leave
    const batchesWhereMainTeacherOnLeave = new Map();
    activeLeaveRequests.forEach(r => {
      if (!batchesWhereMainTeacherOnLeave.has(r.batch_id)) {
        batchesWhereMainTeacherOnLeave.set(r.batch_id, r.main_teacher_id);
      }
    });

    // Build effective batches:
    const effectiveBatchIds = new Set();

    // 1. Batches where I'm main teacher
    (myBatches || []).forEach(batch => {
      // Include if I'm NOT on leave
      if (!batchesWhereIAmOnLeave.has(batch.batch_id)) {
        effectiveBatchIds.add(batch.batch_id);
      }
      
      // ALSO include if assistant tutor IS on leave (but I'm not on leave)
      const assistantTutorOnLeaveId = batchesWhereMainTeacherOnLeave.get(batch.batch_id);
      if (assistantTutorOnLeaveId && assistantTutorOnLeaveId === batch.assistant_tutor && !batchesWhereIAmOnLeave.has(batch.batch_id)) {
        effectiveBatchIds.add(batch.batch_id);
      }
    });

    // 2. Batches where I'm assistant tutor
    (assistantTutorBatches || []).forEach(batch => {
      // Include if I'm NOT on leave
      if (!batchesWhereIAmOnLeave.has(batch.batch_id)) {
        effectiveBatchIds.add(batch.batch_id);
      }
      
      // ALSO include if main teacher IS on leave (but I'm not on leave)
      const mainTeacherOnLeaveId = batchesWhereMainTeacherOnLeave.get(batch.batch_id);
      if (mainTeacherOnLeaveId && mainTeacherOnLeaveId === batch.teacher && !batchesWhereIAmOnLeave.has(batch.batch_id)) {
        effectiveBatchIds.add(batch.batch_id);
      }
    });

    const effectiveMainIds = Array.from(effectiveBatchIds);
    const subIds = (asSub || []).map(r => r.batch_id);
    const subDateMap = {};
    (asSub || []).forEach(r => { subDateMap[r.batch_id] = { date_from: r.date_from, date_to: r.date_to }; });
    const allIds = Array.from(new Set([...effectiveMainIds, ...subIds]));
    console.log("[resolver] effectiveMainIds=", effectiveMainIds.length, "subIds=", subIds.length, "allIds=", allIds.length);

    let details = [];
    if (allIds.length) {
      let detailRows = null;
      let detErr = null;
      try {
        const resp = await supabaseAdmin
          .from("batches")
          .select(`
            batch_id, batch_name, status, start_date, end_date, time_from, time_to, created_at, teacher, assistant_tutor,
            center_details:centers!batches_center_fkey(center_id, center_name),
            course_details:courses(course_name, type),
            teacher_details:teachers!batches_teacher_fkey(teacher_id, user:users(id, full_name, name)),
            assistant_tutor_details:teachers!batches_assistant_tutor_fkey(teacher_id, user:users(id, full_name, name))
          `)
          .in("batch_id", allIds);
        detailRows = resp.data;
        detErr = resp.error;
      } catch (err) {
        detErr = err;
      }
      if (detErr) {
        console.error("resolver details join error, falling back", detErr);
        // Fallback: fetch minimal fields to avoid join errors
        const { data: minimalRows, error: minErr } = await supabaseAdmin
          .from("batches")
          .select("batch_id, batch_name, status, start_date, end_date, time_from, time_to, created_at, teacher, assistant_tutor")
          .in("batch_id", allIds);
        if (minErr) throw minErr;
        details = minimalRows || [];
      } else {
        details = detailRows || [];
      }
    }

    // Determine role for each batch
    const result = details.map(b => {
      const isSubTeacher = subIds.includes(b.batch_id);
      const isMainTeacher = (myBatches || []).some(mb => mb.batch_id === b.batch_id);
      const isAssistantTutor = (assistantTutorBatches || []).some(ab => ab.batch_id === b.batch_id);
      
      let role_tag = null;
      let assistant_tutor_name = null;
      let main_teacher_name = null;
      
      if (isSubTeacher) {
        role_tag = "Sub Teacher";
      } else if (isMainTeacher) {
        role_tag = "Main Teacher";
        // Get assistant tutor name if exists
        if (b.assistant_tutor_details && b.assistant_tutor_details.user) {
          assistant_tutor_name = b.assistant_tutor_details.user.full_name || b.assistant_tutor_details.user.name;
        }
      } else if (isAssistantTutor) {
        role_tag = "Assistant Tutor";
        // Get main teacher name
        if (b.teacher_details && b.teacher_details.user) {
          main_teacher_name = b.teacher_details.user.full_name || b.teacher_details.user.name;
        }
      }
      
      return {
      ...b,
      center_name: b.center_details ? b.center_details.center_name : undefined,
      course_name: b.course_details ? b.course_details.course_name : undefined,
      course_type: b.course_details ? b.course_details.type : undefined,
      type: b.course_details ? b.course_details.type : undefined,
      center_details: undefined,
      course_details: undefined,
        teacher_details: undefined,
        assistant_tutor_details: undefined,
        role_tag: role_tag,
        sub_date_from: isSubTeacher ? (subDateMap[b.batch_id]?.date_from || null) : null,
        sub_date_to: isSubTeacher ? (subDateMap[b.batch_id]?.date_to || null) : null,
        assistant_tutor_name: assistant_tutor_name,
        main_teacher_name: main_teacher_name,
      };
    });

    return res.status(200).json({ success: true, data: result });
  } catch (e) {
    console.error("getEffectiveBatchesForDate error", e);
    return res.status(500).json({ success: false, message: "Failed to resolve effective batches" });
  }
};

module.exports = {
  createRequest,
  getMyRequests,
  updateRequest,
  adminListRequests,
  approveRequest,
  rejectRequest,
  getEffectiveBatchesForDate,
  deleteRequest,
};


