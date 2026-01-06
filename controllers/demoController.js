// controllers/demoController.js
const { supabase } = require("../config/supabaseClient");

// =====================================================
// Demo Requests Controller
// =====================================================

// ✅ Create demo request (automatically called when lead status changes to demo_schedule)
exports.createDemoRequest = async (req, res) => {
    try {
        const { id: user_id } = req.user;
        const { lead_id, notes } = req.body;

        if (!lead_id) {
            return res.status(400).json({
                success: false,
                message: "Lead ID is required",
            });
        }

        // Check if lead exists and belongs to the user
        const { data: lead, error: leadError } = await supabase
            .from("leads")
            .select("lead_id, user_id, center_id")
            .eq("lead_id", lead_id)
            .eq("user_id", user_id)
            .single();

        if (leadError || !lead) {
            return res.status(404).json({
                success: false,
                message: "Lead not found or not authorized",
            });
        }

        // Check if demo request already exists for this lead
        const { data: existingRequest } = await supabase
            .from("demo_requests")
            .select("demo_request_id")
            .eq("lead_id", lead_id)
            .eq("state", "pending")
            .single();

        if (existingRequest) {
            return res.status(400).json({
                success: false,
                message: "Demo request already exists for this lead",
            });
        }

        // Create demo request
        const { data, error } = await supabase
            .from("demo_requests")
            .insert([
                {
                    lead_id,
                    center_id: lead.center_id,
                    requested_by_user_id: user_id,
                    notes,
                    state: "pending",
                },
            ])
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            message: "Demo request created successfully",
            demo_request: data,
        });
    } catch (err) {
        console.error("❌ Error creating demo request:", err.message);
        res.status(500).json({
            success: false,
            message: err.message || "Server error",
        });
    }
};

// ✅ Get all demo requests (for Academic Admin)
exports.getDemoRequests = async (req, res) => {
    try {
        const { state, center_id } = req.query;

        let query = supabase
            .from("demo_requests")
            .select(`
                *,
                leads:lead_id (
                    lead_id,
                    name,
                    email,
                    phone,
                    course,
                    source,
                    status
                ),
                centers:center_id (
                    center_id,
                    center_name
                ),
                users:requested_by_user_id (
                    id,
                    name
                )
            `)
            .order("requested_at", { ascending: false });

        if (state) {
            query = query.eq("state", state);
        }
        if (center_id) {
            query = query.eq("center_id", center_id);
        }

        const { data, error } = await query;

        if (error) throw error;

        res.json({
            success: true,
            demo_requests: data,
            count: data?.length || 0,
        });
    } catch (err) {
        console.error("❌ Error fetching demo requests:", err.message);
        res.status(500).json({
            success: false,
            message: err.message || "Server error",
        });
    }
};

// ✅ Get demo request by ID
exports.getDemoRequestById = async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from("demo_requests")
            .select(`
                *,
                leads:lead_id (
                    lead_id,
                    name,
                    email,
                    phone,
                    course,
                    source,
                    status
                ),
                centers:center_id (
                    center_id,
                    center_name
                ),
                users:requested_by_user_id (
                    id,
                    name
                )
            `)
            .eq("demo_request_id", id)
            .single();

        if (error) throw error;

        if (!data) {
            return res.status(404).json({
                success: false,
                message: "Demo request not found",
            });
        }

        res.json({
            success: true,
            demo_request: data,
        });
    } catch (err) {
        console.error("❌ Error fetching demo request:", err.message);
        res.status(500).json({
            success: false,
            message: err.message || "Server error",
        });
    }
};

// =====================================================
// Demo Batches Controller
// =====================================================

// ✅ Create demo batch
exports.createDemoBatch = async (req, res) => {
    try {
        const { id: user_id } = req.user;
        const { demo_name, course, demo_date, start_time, end_time, tutor_id, lead_ids, notes } = req.body;

        // Validation
        if (!demo_name || !course || !demo_date || !start_time || !tutor_id) {
            return res.status(400).json({
                success: false,
                message: "Demo name, course, date, start time, and tutor ID are required",
            });
        }

        if (!lead_ids || !Array.isArray(lead_ids) || lead_ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: "At least one lead ID is required",
            });
        }

        // Create demo batch
        const { data: demoBatch, error: batchError } = await supabase
            .from("demo_batches")
            .insert([
                {
                    demo_name,
                    course,
                    demo_date,
                    start_time,
                    end_time,
                    tutor_id,
                    academic_admin_id: user_id,
                    notes,
                    status: "scheduled",
                },
            ])
            .select()
            .single();

        if (batchError) throw batchError;

        // Add leads to demo batch
        const demoBatchStudents = lead_ids.map(lead_id => ({
            demo_batch_id: demoBatch.demo_batch_id,
            lead_id,
            attendance_status: "pending",
        }));

        const { error: studentsError } = await supabase
            .from("demo_batch_students")
            .insert(demoBatchStudents);

        if (studentsError) throw studentsError;

        // Update demo requests state to "converted_to_batch"
        for (const lead_id of lead_ids) {
            await supabase
                .from("demo_requests")
                .update({ state: "converted_to_batch" })
                .eq("lead_id", lead_id)
                .eq("state", "pending");
        }

        res.json({
            success: true,
            message: "Demo batch created successfully",
            demo_batch: demoBatch,
        });
    } catch (err) {
        console.error("❌ Error creating demo batch:", err.message);
        res.status(500).json({
            success: false,
            message: err.message || "Server error",
        });
    }
};

// ✅ Get all demo batches
exports.getDemoBatches = async (req, res) => {
    try {
        const { status, tutor_id, date_from, date_to } = req.query;

        let query = supabase
            .from("demo_batches")
            .select(`
                *,
                tutors:tutor_id (
                    teacher_id,
                    users:teacher (
                        id,
                        name,
                        full_name
                    )
                ),
                users:academic_admin_id (
                    id,
                    name
                ),
                demo_batch_students (
                    id,
                    lead_id,
                    attendance_status,
                    note,
                    leads:lead_id (
                        lead_id,
                        name,
                        email,
                        phone,
                        course,
                        source
                    )
                )
            `)
            .order("demo_date", { ascending: true });

        if (status) {
            query = query.eq("status", status);
        }
        if (tutor_id) {
            query = query.eq("tutor_id", tutor_id);
        }
        if (date_from) {
            query = query.gte("demo_date", date_from);
        }
        if (date_to) {
            query = query.lte("demo_date", date_to);
        }

        const { data, error } = await query;

        if (error) throw error;

        // Fetch center information for each student
        if (data && data.length > 0) {
            for (let batch of data) {
                if (batch.demo_batch_students && batch.demo_batch_students.length > 0) {
                    for (let student of batch.demo_batch_students) {
                        if (student.leads?.lead_id) {
                            try {
                                // Get demo_requests for this lead to find center
                                const { data: requests, error: requestError } = await supabase
                                    .from("demo_requests")
                                    .select("center_id")
                                    .eq("lead_id", student.leads.lead_id)
                                    .order("requested_at", { ascending: false })
                                    .limit(1);
                                
                                if (requestError) {
                                    console.error("Error fetching demo_requests:", requestError);
                                }
                                
                                const request = Array.isArray(requests) ? requests[0] : requests;
                                
                                if (request?.center_id) {
                                    // Get center name
                                    const { data: center, error: centerError } = await supabase
                                        .from("centers")
                                        .select("center_id, center_name")
                                        .eq("center_id", request.center_id)
                                        .single();
                                    
                                    if (centerError) {
                                        console.error("Error fetching center:", centerError);
                                    }
                                    
                                    if (center) {
                                        student.leads.centers = center;
                                    }
                                }
                            } catch (err) {
                                console.error("Error processing center info:", err);
                            }
                        }
                    }
                }
            }
        }

        res.json({
            success: true,
            demo_batches: data,
            count: data?.length || 0,
        });
    } catch (err) {
        console.error("❌ Error fetching demo batches:", err.message);
        res.status(500).json({
            success: false,
            message: err.message || "Server error",
        });
    }
};

// ✅ Get demo batch by ID
exports.getDemoBatchById = async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from("demo_batches")
            .select(`
                *,
                tutors:tutor_id (
                    teacher_id,
                    users:teacher (
                        id,
                        name,
                        full_name
                    )
                ),
                users:academic_admin_id (
                    id,
                    name
                ),
                demo_batch_students (
                    id,
                    lead_id,
                    attendance_status,
                    note,
                    leads:lead_id (
                        lead_id,
                        name,
                        email,
                        phone,
                        course,
                        source
                    )
                )
            `)
            .eq("demo_batch_id", id)
            .single();

        if (error) throw error;

        if (!data) {
            return res.status(404).json({
                success: false,
                message: "Demo batch not found",
            });
        }

        // Fetch center information for each student
        if (data.demo_batch_students && data.demo_batch_students.length > 0) {
            for (let student of data.demo_batch_students) {
                if (student.leads?.lead_id) {
                    try {
                        // Get demo_requests for this lead to find center
                        const { data: requests, error: requestError } = await supabase
                            .from("demo_requests")
                            .select("center_id")
                            .eq("lead_id", student.leads.lead_id)
                            .order("requested_at", { ascending: false })
                            .limit(1);
                        
                        if (requestError) {
                            console.error("Error fetching demo_requests:", requestError);
                        }
                        
                        const request = Array.isArray(requests) ? requests[0] : requests;
                        
                        if (request?.center_id) {
                            // Get center name
                            const { data: center, error: centerError } = await supabase
                                .from("centers")
                                .select("center_id, center_name")
                                .eq("center_id", request.center_id)
                                .single();
                            
                            if (centerError) {
                                console.error("Error fetching center:", centerError);
                            }
                            
                            if (center) {
                                student.leads.centers = center;
                                console.log(`✅ Added center ${center.center_name} for lead ${student.leads.lead_id}`);
                            }
                        } else {
                            console.log(`⚠️ No center_id found for lead ${student.leads.lead_id}`);
                        }
                    } catch (err) {
                        console.error("Error processing center info:", err);
                    }
                }
            }
        }

        res.json({
            success: true,
            demo_batch: data,
        });
    } catch (err) {
        console.error("❌ Error fetching demo batch:", err.message);
        res.status(500).json({
            success: false,
            message: err.message || "Server error",
        });
    }
};

// ✅ Update demo batch
exports.updateDemoBatch = async (req, res) => {
    try {
        const { id } = req.params;
        const { demo_name, course, demo_date, start_time, end_time, tutor_id, status, notes } = req.body;

        const updateData = {};
        if (demo_name) updateData.demo_name = demo_name;
        if (course) updateData.course = course;
        if (demo_date) updateData.demo_date = demo_date;
        if (start_time) updateData.start_time = start_time;
        if (end_time) updateData.end_time = end_time;
        if (tutor_id) updateData.tutor_id = tutor_id;
        if (status) updateData.status = status;
        if (notes) updateData.notes = notes;

        const { data, error } = await supabase
            .from("demo_batches")
            .update(updateData)
            .eq("demo_batch_id", id)
            .select()
            .single();

        if (error) throw error;

        if (!data) {
            return res.status(404).json({
                success: false,
                message: "Demo batch not found",
            });
        }

        res.json({
            success: true,
            message: "Demo batch updated successfully",
            demo_batch: data,
        });
    } catch (err) {
        console.error("❌ Error updating demo batch:", err.message);
        res.status(500).json({
            success: false,
            message: err.message || "Server error",
        });
    }
};

// ✅ Update demo batch class link (by Teacher)
exports.updateDemoBatchClassLink = async (req, res) => {
    try {
        const { id } = req.params;
        const { class_link } = req.body;

        if (!class_link) {
            return res.status(400).json({
                success: false,
                message: "Class link is required",
            });
        }

        const { data, error } = await supabase
            .from("demo_batches")
            .update({ class_link })
            .eq("demo_batch_id", id)
            .select()
            .single();

        if (error) throw error;

        if (!data) {
            return res.status(404).json({
                success: false,
                message: "Demo batch not found",
            });
        }

        // Update leads table with class link for all students in this batch
        const { data: batchStudents, error: studentsError } = await supabase
            .from("demo_batch_students")
            .select("lead_id")
            .eq("demo_batch_id", id);

        if (!studentsError && batchStudents) {
            const leadIds = batchStudents.map(bs => bs.lead_id);
            await supabase
                .from("leads")
                .update({ demo_link: class_link })
                .in("lead_id", leadIds);
        }

        res.json({
            success: true,
            message: "Class link updated successfully",
            demo_batch: data,
        });
    } catch (err) {
        console.error("❌ Error updating class link:", err.message);
        res.status(500).json({
            success: false,
            message: err.message || "Server error",
        });
    }
};

// ✅ Update student attendance in demo batch
exports.updateDemoAttendance = async (req, res) => {
    try {
        const { demo_batch_id, lead_id, attendance_status, note } = req.body;

        if (!demo_batch_id || !lead_id || !attendance_status) {
            return res.status(400).json({
                success: false,
                message: "Demo batch ID, lead ID, and attendance status are required",
            });
        }

        const validStatuses = ["pending", "present", "absent"];
        if (!validStatuses.includes(attendance_status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid attendance status",
            });
        }

        const { data, error } = await supabase
            .from("demo_batch_students")
            .update({ attendance_status, note })
            .eq("demo_batch_id", demo_batch_id)
            .eq("lead_id", lead_id)
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            message: "Attendance updated successfully",
            attendance: data,
        });
    } catch (err) {
        console.error("❌ Error updating attendance:", err.message);
        res.status(500).json({
            success: false,
            message: err.message || "Server error",
        });
    }
};

// ✅ Get demo details for a specific lead (for Center Lead Page)
exports.getLeadDemoDetails = async (req, res) => {
    try {
        const { lead_id } = req.params;

        const { data, error } = await supabase
            .from("demo_batch_students")
            .select(`
                *,
                demo_batches:demo_batch_id (
                    demo_batch_id,
                    demo_name,
                    demo_date,
                    start_time,
                    end_time,
                    status,
                    class_link,
                    tutors:tutor_id (
                        teacher_id,
                        users:teacher (
                            id,
                            name,
                            full_name
                        )
                    )
                )
            `)
            .eq("lead_id", lead_id)
            .order("demo_batches(demo_date)", { ascending: false });

        if (error) throw error;

        res.json({
            success: true,
            demo_details: data,
        });
    } catch (err) {
        console.error("❌ Error fetching lead demo details:", err.message);
        res.status(500).json({
            success: false,
            message: err.message || "Server error",
        });
    }
};

module.exports = exports;
