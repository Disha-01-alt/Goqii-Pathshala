-- Create course_assignments table for direct course-to-learner assignment
CREATE TABLE course_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  assigned_by UUID,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  due_date TIMESTAMPTZ,
  UNIQUE(course_id, user_id)
);

-- Enable RLS
ALTER TABLE course_assignments ENABLE ROW LEVEL SECURITY;

-- Managers and admins can manage course assignments
CREATE POLICY "Managers can manage course assignments"
  ON course_assignments FOR ALL
  USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Learners can view their own assignments
CREATE POLICY "Learners can view their own assignments"
  ON course_assignments FOR SELECT
  USING (user_id = auth.uid());