// controllers/tutorInfoController.js

const { supabaseAdmin } = require("../config/supabaseClient"); // Admin client for storage
const path = require("path");

/**
 * Fetch tutor info for the logged-in tutor
 */
const getMyTutorInfo = async (req, res) => {
  try {
    const { id: tutor_id } = req.user;

    const { data, error } = await supabaseAdmin
      .from("tutor_info")
      .select("*")
      .eq("tutor_id", tutor_id)
      .maybeSingle();

    if (error) throw error;

    res.status(200).json({
      success: true,
      data: data || null,
    });
  } catch (error) {
    console.error("Error fetching tutor info:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch tutor info.",
    });
  }
};

/**
 * Create tutor info (only if not already exists)
 */
const createTutorInfo = async (req, res) => {
  try {
    const { id: tutor_id } = req.user;
    const tutorData = req.body;

    // Check if tutor info already exists
    const { data: existing, error: existingError } = await supabaseAdmin
      .from("tutor_info")
      .select("id")
      .eq("tutor_id", tutor_id)
      .maybeSingle();

    if (existingError) throw existingError;

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Tutor info already exists. Use update instead.",
      });
    }

    const { data, error } = await supabaseAdmin
      .from("tutor_info")
      .insert([{ tutor_id, ...tutorData }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      data,
      message: "Tutor info created successfully.",
    });
  } catch (error) {
    console.error("Error creating tutor info:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create tutor info.",
    });
  }
};

/**
 * Update existing tutor info
 */
const updateTutorInfo = async (req, res) => {
  try {
    const { id: tutor_id } = req.user;
    const tutorData = req.body;

    const { data, error } = await supabaseAdmin
      .from("tutor_info")
      .update(tutorData)
      .eq("tutor_id", tutor_id)
      .select()
      .single();

    if (error) throw error;

    res.status(200).json({
      success: true,
      data,
      message: "Tutor info updated successfully.",
    });
  } catch (error) {
    console.error("Error updating tutor info:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update tutor info.",
    });
  }
};

/**
 * Delete tutor info
 */
const deleteTutorInfo = async (req, res) => {
  try {
    const { id: tutor_id } = req.user;

    const { error } = await supabaseAdmin
      .from("tutor_info")
      .delete()
      .eq("tutor_id", tutor_id);

    if (error) throw error;

    res.status(200).json({
      success: true,
      message: "Tutor info deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting tutor info:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete tutor info.",
    });
  }
};

/**
 * Upload tutor profile photo
 */
const uploadProfilePhoto = async (req, res) => {
  try {
    if (!req.file)
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });

    const { id: tutor_id } = req.user;
    const fileBuffer = req.file.buffer;
    const fileExt = path.extname(req.file.originalname);
    const fileName = `${Date.now()}${fileExt}`;
    const filePath = `${tutor_id}/${fileName}`;

    // Upload to Supabase storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from("tutor-profiles")
      .upload(filePath, fileBuffer, { upsert: true });
    if (uploadError) throw uploadError;

    // Get public URL
    const { data: urlData, error: urlError } = supabaseAdmin.storage
      .from("tutor-profiles")
      .getPublicUrl(filePath);
    if (urlError) throw urlError;
    const publicUrl = urlData.publicUrl;

    // Check if tutor_info row exists
    const { data: existingRow, error: existingError } = await supabaseAdmin
      .from("tutor_info")
      .select("id")
      .eq("tutor_id", tutor_id)
      .maybeSingle();
    if (existingError) throw existingError;

    let updatedData;
    if (existingRow) {
      // Update row
      const { data, error } = await supabaseAdmin
        .from("tutor_info")
        .update({ profile_photo: publicUrl })
        .eq("tutor_id", tutor_id)
        .select()
        .single();
      if (error) throw error;
      updatedData = data;
    } else {
      // Insert new row
      const { data, error } = await supabaseAdmin
        .from("tutor_info")
        .insert([{ tutor_id, profile_photo: publicUrl }])
        .select()
        .single();
      if (error) throw error;
      updatedData = data;
    }

    res.status(200).json({ success: true, data: publicUrl });
  } catch (error) {
    console.error("Error uploading profile photo:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to upload profile photo" });
  }
};

// Get tutor info by user ID (for admin/manager use)
const getTutorInfoByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }


    // Get tutor info by user ID
    const { data: tutorInfo, error } = await supabaseAdmin
      .from("tutor_info")
      .select("*")
      .eq("tutor_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows returned
        return res.status(404).json({
          success: false,
          message: "Tutor information not found for this user",
        });
      }
      throw error;
    }
    res.status(200).json({
      success: true,
      data: tutorInfo,
    });
  } catch (error) {
    console.error("Error fetching tutor info by user ID:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch tutor information" });
  }
};

module.exports = {
  getMyTutorInfo,
  createTutorInfo,
  updateTutorInfo,
  deleteTutorInfo,
  uploadProfilePhoto,
  getTutorInfoByUserId,
};
