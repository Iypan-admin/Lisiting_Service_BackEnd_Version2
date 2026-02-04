-- Migration: Create Manager Notifications Table
-- Purpose: Store notifications for managers (event-related notifications)
-- Date: January 2025

-- ==============================================
-- CREATE MANAGER_NOTIFICATIONS TABLE
-- ==============================================

CREATE TABLE IF NOT EXISTS public.manager_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manager_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    type VARCHAR(100) DEFAULT 'event', -- event, meeting, exam, holiday, training, workshop, conference
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Metadata for event-related notifications
    event_id UUID, -- Reference to academic_events if applicable
    metadata JSONB -- Additional data (event details, etc.)
);

-- Add comments
COMMENT ON TABLE public.manager_notifications IS 'Stores notifications for managers, primarily event-related';
COMMENT ON COLUMN public.manager_notifications.id IS 'Unique identifier for notification';
COMMENT ON COLUMN public.manager_notifications.manager_id IS 'Reference to the manager (user ID)';
COMMENT ON COLUMN public.manager_notifications.message IS 'Notification message content';
COMMENT ON COLUMN public.manager_notifications.type IS 'Type of notification: event, meeting, exam, holiday, training, workshop, conference';
COMMENT ON COLUMN public.manager_notifications.is_read IS 'Whether the notification has been read';
COMMENT ON COLUMN public.manager_notifications.event_id IS 'Reference to academic_events table if notification is event-related';
COMMENT ON COLUMN public.manager_notifications.metadata IS 'Additional JSON data for notification details';

-- ==============================================
-- CREATE INDEXES FOR PERFORMANCE
-- ==============================================

CREATE INDEX IF NOT EXISTS idx_manager_notifications_manager_id ON public.manager_notifications(manager_id);
CREATE INDEX IF NOT EXISTS idx_manager_notifications_is_read ON public.manager_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_manager_notifications_created_at ON public.manager_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_manager_notifications_type ON public.manager_notifications(type);
CREATE INDEX IF NOT EXISTS idx_manager_notifications_event_id ON public.manager_notifications(event_id);

-- ==============================================
-- CREATE TRIGGER FOR UPDATED_AT
-- ==============================================

CREATE OR REPLACE FUNCTION update_manager_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_manager_notifications_updated_at
    BEFORE UPDATE ON public.manager_notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_manager_notifications_updated_at();

-- ==============================================
-- DISABLE ROW LEVEL SECURITY (if needed)
-- ==============================================

ALTER TABLE public.manager_notifications DISABLE ROW LEVEL SECURITY;

