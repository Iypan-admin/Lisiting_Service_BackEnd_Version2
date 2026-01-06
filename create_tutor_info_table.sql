-- Create tutor_info table for storing tutor information
CREATE TABLE IF NOT EXISTS public.tutor_info (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tutor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    bio TEXT,
    experience_years INTEGER,
    specialization TEXT,
    education TEXT,
    certifications TEXT,
    languages TEXT[],
    hourly_rate DECIMAL(10,2),
    availability_schedule JSONB,
    profile_photo TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tutor_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tutor_info_tutor_id ON public.tutor_info(tutor_id);
CREATE INDEX IF NOT EXISTS idx_tutor_info_verified ON public.tutor_info(is_verified);

-- Add comments
COMMENT ON TABLE public.tutor_info IS 'Stores detailed information about tutors';
COMMENT ON COLUMN public.tutor_info.tutor_id IS 'Reference to the user who is a tutor';
COMMENT ON COLUMN public.tutor_info.bio IS 'Tutor biography and description';
COMMENT ON COLUMN public.tutor_info.experience_years IS 'Years of teaching experience';
COMMENT ON COLUMN public.tutor_info.specialization IS 'Subject areas of expertise';
COMMENT ON COLUMN public.tutor_info.education IS 'Educational background';
COMMENT ON COLUMN public.tutor_info.certifications IS 'Professional certifications';
COMMENT ON COLUMN public.tutor_info.languages IS 'Languages spoken by tutor';
COMMENT ON COLUMN public.tutor_info.hourly_rate IS 'Rate per hour for tutoring';
COMMENT ON COLUMN public.tutor_info.availability_schedule IS 'JSON object with availability schedule';
COMMENT ON COLUMN public.tutor_info.profile_photo IS 'URL to profile photo';
COMMENT ON COLUMN public.tutor_info.is_verified IS 'Whether tutor is verified by admin';

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tutor_info TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;






