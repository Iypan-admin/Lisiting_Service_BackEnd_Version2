// controllers/financialPartnersController.js

const { supabase, supabaseAdmin } = require("../config/supabaseClient");
/**
 * Fetch all financial partners with optional pagination.
 */
const getAllFinancialPartners = async (req, res) => {
  try {

    const { data, error } = await supabase
      .from('financial_partner')
      .select('financial_partner_id, created_at, user_id, manager')

    if (error) throw error;

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error fetching financial partners:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch financial partner details.',
    });
  }
};

/**
 * Fetch a single financial partner by its ID.
 */
const getFinancialPartnerById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('financial_partner')
      .select('financial_partner_id, created_at, user_id, manager')
      .eq('financial_partner_id', id)
      .single();

    if (error) {
      return res.status(404).json({
        success: false,
        message: 'Financial partner not found.',
      });
    }

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error fetching financial partner by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch financial partner details.',
    });
  }
};

module.exports = {
  getAllFinancialPartners,
  getFinancialPartnerById,
};
