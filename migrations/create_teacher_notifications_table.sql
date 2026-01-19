-- Teacher Notifications Table
-- Creates notification system for teachers

CREATE TABLE IF NOT EXISTS teacher_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher uuid NOT NULL REFERENCES teachers(teacher_id) ON DELETE CASCADE,
  message text NOT NULL,
  type text, -- e.g., 'LEAVE_APPROVED', 'LEAVE_REJECTED', etc.
  related_id uuid, -- ID of related entity (e.g., leave request ID)
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_teacher_notifications_teacher ON teacher_notifications(teacher);
CREATE INDEX IF NOT EXISTS idx_teacher_notifications_is_read ON teacher_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_teacher_notifications_created_at ON teacher_notifications(created_at);

-- Add comments for documentation
COMMENT ON TABLE teacher_notifications IS 'Stores notifications for teachers (leave approvals, rejections, etc.)';
COMMENT ON COLUMN teacher_notifications.teacher IS 'Foreign key to teachers table';
COMMENT ON COLUMN teacher_notifications.message IS 'The notification message';
COMMENT ON COLUMN teacher_notifications.type IS 'Type of notification (LEAVE_APPROVED, LEAVE_REJECTED, etc.)';
COMMENT ON COLUMN teacher_notifications.related_id IS 'ID of related entity (e.g., leave request ID)';
COMMENT ON COLUMN teacher_notifications.is_read IS 'Whether the notification has been read';

