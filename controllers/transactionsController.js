// controllers/transactionsController.js

const { supabase, supabaseAdmin } = require("../config/supabaseClient");

/**
 * Fetch all transactions with optional pagination.
 */
const getAllTransactions = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('payment_id, created_at, transaction_id, duration, status, enrollment_id')

    if (error) throw error;

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions.',
    });
  }
};

/**
 * Fetch a single transaction by its Payment ID.
 */
const getTransactionById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('transactions')
      .select('payment_id, created_at, transaction_id, duration, status, enrollment_id')
      .eq('payment_id', id)
      .single();

    if (error) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found.',
      });
    }

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error fetching transaction by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transaction details.',
    });
  }
};

module.exports = {
  getAllTransactions,
  getTransactionById,
};
