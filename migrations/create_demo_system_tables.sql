-- =====================================================
-- Demo Scheduling System - Database Migration
-- =====================================================
-- This migration creates tables for the demo scheduling flow:
-- Center → Academic Admin → Teacher → Back to Center
-- =====================================================

-- 1. Lead Status History Table
-- Tracks all status changes for leads
CREATE TABLE IF NOT EXISTS lead_status_history (
    history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(lead_id) ON DELETE CASCADE,
    old_status TEXT,
    new_status TEXT NOT NULL,
    changed_by_user_id UUID REFERENCES users(id),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_lead_status_history_lead_id 
    ON lead_status_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_status_history_changed_at 
    ON lead_status_history(changed_at DESC);

COMMENT ON TABLE lead_status_history IS 'Tracks all status changes for leads';

-- 2. Demo Requests Table
-- Stores demo scheduling requests when status changes to demo_schedule
CREATE TABLE IF NOT EXISTS demo_requests (
    demo_request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(lead_id) ON DELETE CASCADE,
    center_id UUID REFERENCES centers(center_id),
    requested_status TEXT NOT NULL DEFAULT 'demo_schedule',
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    requested_by_user_id UUID REFERENCES users(id),
    notes TEXT,
    state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'converted_to_batch', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_demo_requests_lead_id 
    ON demo_requests(lead_id);
CREATE INDEX IF NOT EXISTS idx_demo_requests_state 
    ON demo_requests(state);
CREATE INDEX IF NOT EXISTS idx_demo_requests_center_id 
    ON demo_requests(center_id);
CREATE INDEX IF NOT EXISTS idx_demo_requests_requested_at 
    ON demo_requests(requested_at DESC);

COMMENT ON TABLE demo_requests IS 'Stores demo scheduling requests from centers';

-- 3. Demo Batches Table
-- Stores demo batch information created by Academic Admin
CREATE TABLE IF NOT EXISTS demo_batches (
    demo_batch_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    demo_name TEXT NOT NULL,
    course TEXT NOT NULL,
    demo_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME,
    tutor_id UUID REFERENCES teachers(teacher_id),
    academic_admin_id UUID REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
    class_link TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_demo_batches_tutor_id 
    ON demo_batches(tutor_id);
CREATE INDEX IF NOT EXISTS idx_demo_batches_status 
    ON demo_batches(status);
CREATE INDEX IF NOT EXISTS idx_demo_batches_demo_date 
    ON demo_batches(demo_date);
CREATE INDEX IF NOT EXISTS idx_demo_batches_academic_admin_id 
    ON demo_batches(academic_admin_id);

COMMENT ON TABLE demo_batches IS 'Stores demo batch information created by Academic Admin';

-- 4. Demo Batch Students Table (Junction Table)
-- Links demo batches to leads (many-to-many relationship)
CREATE TABLE IF NOT EXISTS demo_batch_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    demo_batch_id UUID NOT NULL REFERENCES demo_batches(demo_batch_id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES leads(lead_id) ON DELETE CASCADE,
    attendance_status TEXT DEFAULT 'pending' CHECK (attendance_status IN ('pending', 'present', 'absent')),
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure one lead appears in one demo batch at a time (optional constraint)
    UNIQUE(demo_batch_id, lead_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_demo_batch_students_demo_batch_id 
    ON demo_batch_students(demo_batch_id);
CREATE INDEX IF NOT EXISTS idx_demo_batch_students_lead_id 
    ON demo_batch_students(lead_id);
CREATE INDEX IF NOT EXISTS idx_demo_batch_students_attendance_status 
    ON demo_batch_students(attendance_status);

COMMENT ON TABLE demo_batch_students IS 'Links demo batches to leads (many-to-many)';

-- 5. Add demo_link column to leads table (if not exists)
-- This will store the class link for easy access on the leads page
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'demo_link'
    ) THEN
        ALTER TABLE leads ADD COLUMN demo_link TEXT;
    END IF;
END $$;

COMMENT ON COLUMN leads.demo_link IS 'Class link from demo batch (displayed on leads page)';

-- =====================================================
-- Function to update updated_at timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to demo_batches and demo_requests
DROP TRIGGER IF EXISTS update_demo_batches_updated_at ON demo_batches;
CREATE TRIGGER update_demo_batches_updated_at
    BEFORE UPDATE ON demo_batches
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_demo_requests_updated_at ON demo_requests;
CREATE TRIGGER update_demo_requests_updated_at
    BEFORE UPDATE ON demo_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Insert sample data for testing (optional - remove in production)
-- =====================================================
-- Uncomment below if you want to test with sample data

/*
-- Sample demo request
INSERT INTO demo_requests (lead_id, center_id, requested_status, notes)
VALUES (
    (SELECT lead_id FROM leads LIMIT 1),
    (SELECT center_id FROM centers LIMIT 1),
    'demo_schedule',
    'Sample demo request - Please schedule soon'
);

-- Sample demo batch
INSERT INTO demo_batches (demo_name, course, demo_date, start_time, end_time, notes)
VALUES (
    'French Beginner Demo',
    'French',
    CURRENT_DATE + INTERVAL '7 days',
    '10:00:00',
    '11:00:00',
    'Demo session for interested French learners'
);
*/

-- =====================================================
-- Summary of Tables Created
-- =====================================================
-- ✅ lead_status_history: Tracks all lead status changes
-- ✅ demo_requests: Stores demo scheduling requests
-- ✅ demo_batches: Stores demo batch information
-- ✅ demo_batch_students: Junction table linking batches to leads
-- ✅ leads.demo_link: Column added to display class link
-- ✅ Indexes: Added for performance
-- ✅ Triggers: Auto-update updated_at timestamps
-- =====================================================
