-- Migration: Create State Notifications Table
-- Purpose: Store notifications for state admins (batch, center, and invoice related notifications)
-- Date: January 2026

-- ==============================================
-- CREATE STATE_NOTIFICATIONS TABLE
-- ==============================================

CREATE TABLE IF NOT EXISTS public.state_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state_admin_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    type VARCHAR(100) DEFAULT 'general', -- batch, center, invoice, general
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Metadata for specific notification types
    reference_id UUID, -- Reference to batch_request_id, center_request_id, etc.
    metadata JSONB -- Additional data (details, links, etc.)
);

-- Add comments
COMMENT ON TABLE public.state_notifications IS 'Stores notifications for state admins regarding requests and administrative actions';
COMMENT ON COLUMN public.state_notifications.id IS 'Unique identifier for notification';
COMMENT ON COLUMN public.state_notifications.state_admin_id IS 'Reference to the state admin (user ID)';
COMMENT ON COLUMN public.state_notifications.message IS 'Notification message content';
COMMENT ON COLUMN public.state_notifications.type IS 'Type of notification: batch, center, invoice, general';
COMMENT ON COLUMN public.state_notifications.is_read IS 'Whether the notification has been read';
COMMENT ON COLUMN public.state_notifications.reference_id IS 'Reference ID to the related entity (batch request, center request, etc.)';
COMMENT ON COLUMN public.state_notifications.metadata IS 'Additional JSON data for notification details';

-- ==============================================
-- CREATE INDEXES FOR PERFORMANCE
-- ==============================================

CREATE INDEX IF NOT EXISTS idx_state_notifications_state_admin_id ON public.state_notifications(state_admin_id);
CREATE INDEX IF NOT EXISTS idx_state_notifications_is_read ON public.state_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_state_notifications_created_at ON public.state_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_state_notifications_type ON public.state_notifications(type);

-- ==============================================
-- CREATE TRIGGER FOR UPDATED_AT
-- ==============================================

CREATE OR REPLACE FUNCTION update_state_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_state_notifications_updated_at
    BEFORE UPDATE ON public.state_notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_state_notifications_updated_at();

-- ==============================================
-- DISABLE ROW LEVEL SECURITY
-- ==============================================

ALTER TABLE public.state_notifications DISABLE ROW LEVEL SECURITY;
