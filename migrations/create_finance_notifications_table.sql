-- Migration: Create Finance Notifications Table
-- Purpose: Store notifications for finance admins (payment, invoice, and elite pass related)
-- Date: January 2026

-- ==============================================
-- CREATE FINANCE_NOTIFICATIONS TABLE
-- ==============================================

CREATE TABLE IF NOT EXISTS public.finance_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message TEXT NOT NULL,
    type VARCHAR(100) DEFAULT 'payment', -- payment, invoice, refund, alert
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Metadata for related records
    payment_id UUID,
    invoice_id UUID,
    metadata JSONB -- Additional data (transaction details, amounts, etc.)
);

-- Add comments
COMMENT ON TABLE public.finance_notifications IS 'Stores notifications for finance admins, primarily payment and invoice related';
COMMENT ON COLUMN public.finance_notifications.id IS 'Unique identifier for notification';
COMMENT ON COLUMN public.finance_notifications.message IS 'Notification message content';
COMMENT ON COLUMN public.finance_notifications.type IS 'Type of notification: payment, invoice, refund, alert';
COMMENT ON COLUMN public.finance_notifications.is_read IS 'Whether the notification has been read';
COMMENT ON COLUMN public.finance_notifications.payment_id IS 'Reference to the payment record if applicable';
COMMENT ON COLUMN public.finance_notifications.invoice_id IS 'Reference to the invoice record if applicable';
COMMENT ON COLUMN public.finance_notifications.metadata IS 'Additional JSON data for notification details';

-- ==============================================
-- CREATE INDEXES FOR PERFORMANCE
-- ==============================================

CREATE INDEX IF NOT EXISTS idx_finance_notifications_is_read ON public.finance_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_finance_notifications_created_at ON public.finance_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_finance_notifications_type ON public.finance_notifications(type);
CREATE INDEX IF NOT EXISTS idx_finance_notifications_payment_id ON public.finance_notifications(payment_id);
CREATE INDEX IF NOT EXISTS idx_finance_notifications_invoice_id ON public.finance_notifications(invoice_id);

-- ==============================================
-- CREATE TRIGGER FOR UPDATED_AT
-- ==============================================

CREATE OR REPLACE FUNCTION update_finance_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_finance_notifications_updated_at
    BEFORE UPDATE ON public.finance_notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_finance_notifications_updated_at();

-- ==============================================
-- DISABLE ROW LEVEL SECURITY (if needed)
-- ==============================================

ALTER TABLE public.finance_notifications DISABLE ROW LEVEL SECURITY;
