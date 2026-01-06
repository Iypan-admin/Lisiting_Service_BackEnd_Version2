// controllers/leadsController.js
const { supabase } = require("../config/supabaseClient");
const fs = require("fs");
const csv = require("csv-parser");

// 🔹 Utility - validate course & source enums
const validCourses = ["French", "German", "Japanese"];
const validSources = [
    "Facebook",
    "Website",
    "Google",
    "Justdial",
    "Associate Reference",
    "Student Reference",
    "Walk-in",
    "ISML Leads",
];

const validStatuses = [
    "data_entry",
    "not_connected_1",
    "not_connected_2",
    "not_connected_3",
    "interested",
    "need_follow",
    "junk_lead",
    "demo_schedule",
    "lost_lead",
    "enrolled",
    "closed_lead",
];

// ✅ Create new lead
exports.createLead = async (req, res) => {
    try {
        const { id: user_id } = req.user; // JWT payload → user id
        const { name, phone, email, course, remark, source } = req.body;

        // Validation
        if (!name || !phone || !course || !source) {
            return res.status(400).json({
                success: false,
                message: "Name, phone, course and source are required",
            });
        }
        if (!validCourses.includes(course)) {
            return res.status(400).json({
                success: false,
                message: "Invalid course value",
            });
        }
        if (!validSources.includes(source)) {
            return res.status(400).json({
                success: false,
                message: "Invalid source value",
            });
        }

        const { data, error } = await supabase
            .from("leads")
            .insert([
                {
                    user_id,
                    name,
                    phone,
                    email,
                    course,
                    remark,
                    source,
                    status: "data_entry",
                },
            ])
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            message: "Lead created successfully",
            lead: data,
        });
    } catch (err) {
        console.error("❌ Error creating lead:", err.message);
        res.status(500).json({
            success: false,
            message: err.message || "Server error",
        });
    }
};

// ✅ Get all leads for logged-in user
exports.getLeads = async (req, res) => {
    try {
        const { id: user_id } = req.user;

        const { data, error } = await supabase
            .from("leads")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", { ascending: false });

        if (error) throw error;

        res.json({ success: true, leads: data });
    } catch (err) {
        console.error("❌ Error fetching leads:", err.message);
        res.status(500).json({
            success: false,
            message: err.message || "Server error",
        });
    }
};

// ✅ Update lead status
exports.updateLeadStatus = async (req, res) => {
    try {
        const { id: user_id } = req.user;
        const { id } = req.params; // lead_id
        const { status, notes } = req.body;

        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid status value",
            });
        }

        // Get current lead to capture old status
        const { data: oldLead } = await supabase
            .from("leads")
            .select("status")
            .eq("lead_id", id)
            .single();

        const old_status = oldLead?.status;

        // Get center_id from the user who is center admin
        const { data: centerData } = await supabase
            .from("centers")
            .select("center_id")
            .eq("center_admin", user_id)
            .single();
        
        const center_id = centerData?.center_id;

        // Update lead status
        const { data, error } = await supabase
            .from("leads")
            .update({ status })
            .eq("lead_id", id)
            .eq("user_id", user_id) // only owner can update
            .select()
            .single();

        if (error) throw error;
        if (!data) {
            return res.status(404).json({
                success: false,
                message: "Lead not found or not owned by user",
            });
        }

        // 1. Create lead status history entry
        try {
            await supabase
                .from("lead_status_history")
                .insert([
                    {
                        lead_id: id,
                        old_status,
                        new_status: status,
                        changed_by_user_id: user_id,
                        notes,
                    },
                ]);
        } catch (historyError) {
            console.error("Error creating status history:", historyError.message);
            // Don't fail the whole operation if history creation fails
        }

        // 2. Create demo request if status is "demo_schedule"
        if (status === "demo_schedule") {
            try {
                // Check if demo request already exists (in any state)
                const { data: existingRequests, error: checkError } = await supabase
                    .from("demo_requests")
                    .select("demo_request_id, state")
                    .eq("lead_id", id);

                if (!checkError && existingRequests && existingRequests.length > 0) {
                    // Demo request already exists, check if it's pending
                    const pendingRequest = existingRequests.find(r => r.state === "pending");
                    if (pendingRequest) {
                        console.log("⚠️ Demo request already exists for lead:", id);
                        // Don't create a new one
                    } else {
                        // All requests are converted/cancelled, create a new pending one
                        const { error: insertError } = await supabase
                            .from("demo_requests")
                            .insert([
                                {
                                    lead_id: id,
                                    center_id: center_id,
                                    requested_by_user_id: user_id,
                                    notes,
                                    state: "pending",
                                },
                            ]);
                        if (!insertError) {
                            console.log("✅ New demo request created for lead:", id);
                        }
                    }
                } else {
                    // No existing demo request, create a new one
                    const { error: insertError } = await supabase
                        .from("demo_requests")
                        .insert([
                            {
                                lead_id: id,
                                center_id: center_id,
                                requested_by_user_id: user_id,
                                notes,
                                state: "pending",
                            },
                        ]);
                        if (!insertError) {
                            console.log("✅ Demo request created for lead:", id);
                        }
                    }
                } catch (demoError) {
                console.error("Error creating demo request:", demoError.message);
                // Don't fail the whole operation if demo request creation fails
            }
        }

        res.json({
            success: true,
            message: "Lead status updated successfully",
            lead: data,
        });
    } catch (err) {
        console.error("❌ Error updating lead:", err.message);
        res.status(500).json({
            success: false,
            message: err.message || "Server error",
        });
    }
};

// ✅ Bulk upload leads from CSV
exports.uploadLeadsCSV = async (req, res) => {
    try {
        if (!req.file && !req.body.validRows) {
            return res.status(400).json({
                success: false,
                message: "CSV file is missing",
            });
        }

        const { id: user_id } = req.user;
        const forceInsert = req.query.forceInsert === "true";

        // 🔹 Stage 2: Force insert after user confirms (skips duplicates)
        if (forceInsert && req.body.validRows) {
            try {
                const validRows = req.body.validRows;
                if (validRows.length === 0) {
                    return res.status(200).json({
                        success: true,
                        status: "ok",
                        inserted: 0,
                        message: "No valid rows to insert",
                    });
                }

                // Insert all valid rows
                const { data, error } = await supabase
                    .from("leads")
                    .insert(validRows)
                    .select();

                if (error) {
                    return res.status(500).json({
                        success: false,
                        message: "Database insert failed: " + error.message,
                    });
                }

                return res.status(200).json({
                    success: true,
                    status: "ok",
                    inserted: data?.length || 0,
                    message: `${data?.length || 0} leads inserted successfully`,
                });
            } catch (err) {
                return res.status(500).json({
                    success: false,
                    message: "Force insert failed: " + err.message,
                });
            }
        }

        // 🔹 Stage 1: First upload → parse CSV and validate
        const results = [];
        fs.createReadStream(req.file.path)
            .pipe(csv())
            .on("data", (row) => results.push(row))
            .on("end", async () => {
                try {
                    // Get existing leads for this user to check duplicates
                    const { data: existingLeads, error: exError } = await supabase
                        .from("leads")
                        .select("phone, email")
                        .eq("user_id", user_id);

                    if (exError) throw exError;

                    const existingPhones = new Set(
                        (existingLeads || []).map((l) => l.phone?.toString().trim().toLowerCase())
                    );
                    const existingEmails = new Set(
                        (existingLeads || [])
                            .filter((l) => l.email)
                            .map((l) => l.email?.trim().toLowerCase())
                    );

                    const insertData = [];
                    const duplicates = [];
                    const errors = [];

                    // Process each CSV row
                    results.forEach((row, index) => {
                        const rowNum = index + 2; // +2 because header is row 1, first data row is row 2
                        const name = (row.name || row.Name || "").trim();
                        const phone = (row.phone || row.Phone || "").toString().trim();
                        const email = (row.email || row.Email || "").trim();
                        const course = (row.course || row.Course || "").trim();
                        const source = (row.source || row.Source || "").trim();
                        const remark = (row.remark || row.Remark || row.remarks || row.Remarks || "").trim();

                        // Validation
                        if (!name) {
                            errors.push(`Row ${rowNum}: Name is required`);
                            return;
                        }
                        if (!phone) {
                            errors.push(`Row ${rowNum}: Phone is required`);
                            return;
                        }
                        if (!course) {
                            errors.push(`Row ${rowNum}: Course is required`);
                            return;
                        }
                        if (!validCourses.includes(course)) {
                            errors.push(
                                `Row ${rowNum}: Invalid course "${course}". Must be one of: ${validCourses.join(", ")}`
                            );
                            return;
                        }
                        if (!source) {
                            errors.push(`Row ${rowNum}: Source is required`);
                            return;
                        }
                        if (!validSources.includes(source)) {
                            errors.push(
                                `Row ${rowNum}: Invalid source "${source}". Must be one of: ${validSources.join(", ")}`
                            );
                            return;
                        }

                        // Check for duplicates
                        const phoneLower = phone.toLowerCase();
                        const emailLower = email ? email.toLowerCase() : null;

                        if (existingPhones.has(phoneLower)) {
                            duplicates.push(`Row ${rowNum}: Phone ${phone} already exists`);
                            return;
                        }
                        if (emailLower && existingEmails.has(emailLower)) {
                            duplicates.push(`Row ${rowNum}: Email ${email} already exists`);
                            return;
                        }

                        // Add to insert data
                        insertData.push({
                            user_id,
                            name,
                            phone,
                            email: email || null,
                            course,
                            source,
                            remark: remark || null,
                            status: "data_entry",
                        });

                        // Track as existing for duplicate check within CSV
                        existingPhones.add(phoneLower);
                        if (emailLower) existingEmails.add(emailLower);
                    });

                    // Delete uploaded file
                    fs.unlinkSync(req.file.path);

                    // Return validation results
                    if (errors.length > 0) {
                        return res.status(200).json({
                            success: false,
                            status: "validation_errors",
                            errors,
                            validRows: insertData,
                            message: `Found ${errors.length} validation error(s)`,
                        });
                    }

                    if (duplicates.length > 0) {
                        return res.status(200).json({
                            success: true,
                            status: "duplicate_found",
                            duplicates,
                            validRows: insertData,
                            duplicateCount: duplicates.length,
                            validCount: insertData.length,
                            message: `Found ${duplicates.length} duplicate(s). ${insertData.length} valid row(s) ready to insert.`,
                        });
                    }

                    // No duplicates, insert directly
                    if (insertData.length > 0) {
                        const { data, error } = await supabase
                            .from("leads")
                            .insert(insertData)
                            .select();

                        if (error) {
                            return res.status(500).json({
                                success: false,
                                message: "Database insert failed: " + error.message,
                            });
                        }

                        return res.status(200).json({
                            success: true,
                            status: "ok",
                            inserted: data?.length || 0,
                            message: `${data?.length || 0} leads inserted successfully`,
                        });
                    }

                    return res.status(200).json({
                        success: true,
                        status: "ok",
                        inserted: 0,
                        message: "No valid rows to insert",
                    });
                } catch (err) {
                    if (req.file && fs.existsSync(req.file.path)) {
                        fs.unlinkSync(req.file.path);
                    }
                    return res.status(500).json({
                        success: false,
                        message: "CSV processing failed: " + err.message,
                    });
                }
            })
            .on("error", (err) => {
                if (req.file && fs.existsSync(req.file.path)) {
                    fs.unlinkSync(req.file.path);
                }
                return res.status(500).json({
                    success: false,
                    message: "CSV parsing error: " + err.message,
                });
            });
    } catch (err) {
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        return res.status(500).json({
            success: false,
            message: "Server error: " + err.message,
        });
    }
};

// ✅ Get all leads for a specific center (for academic admin)
// Leads are identified by users who are center_admin of that center
exports.getLeadsByCenter = async (req, res) => {
    try {
        const { centerId } = req.params;

        // Validate centerId
        if (!centerId || centerId === "null" || centerId === "undefined") {
            return res.status(400).json({
                success: false,
                message: "Invalid center ID",
            });
        }

        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(centerId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid center ID format",
            });
        }

        // First, get all users who are center_admin of this center
        const { data: centerData, error: centerError } = await supabase
            .from("centers")
            .select("center_admin")
            .eq("center_id", centerId)
            .single();

        if (centerError || !centerData) {
            return res.status(404).json({
                success: false,
                message: "Center not found",
            });
        }

        const centerAdminUserId = centerData.center_admin;

        // Get all leads created by users in this center
        // For now, we'll get leads created by the center_admin
        // If a center has multiple users, we may need to extend this logic
        const { data: leads, error: leadsError } = await supabase
            .from("leads")
            .select("*")
            .eq("user_id", centerAdminUserId)
            .order("created_at", { ascending: false });

        if (leadsError) throw leadsError;

        res.json({
            success: true,
            leads: leads || [],
            center_id: centerId,
        });
    } catch (err) {
        console.error("❌ Error fetching leads by center:", err.message);
        res.status(500).json({
            success: false,
            message: err.message || "Server error",
        });
    }
};
