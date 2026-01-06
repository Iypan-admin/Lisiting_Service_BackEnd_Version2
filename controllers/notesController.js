// controllers/notesController.js

const { supabase, supabaseAdmin } = require("../config/supabaseClient");
/**
 * Fetch all notes with optional pagination.
 */
const getAllNotes = async (req, res) => {
  try {

    const { data, error } = await supabase
      .from('notes')
      .select('notes_id, created_at, link, batch_id, title, note')

    if (error) {
      throw error;
    }

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notes.',
    });
  }
};

/**
 * Fetch a single note by its ID.
 */
const getNoteById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('notes')
      .select('notes_id, created_at, link, batch_id, title, note')
      .eq('notes_id', id)
      .single();

    if (error) {
      return res.status(404).json({
        success: false,
        message: 'Note not found.',
      });
    }

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error fetching note by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch note details.',
    });
  }
};

module.exports = {
  getAllNotes,
  getNoteById,
};
