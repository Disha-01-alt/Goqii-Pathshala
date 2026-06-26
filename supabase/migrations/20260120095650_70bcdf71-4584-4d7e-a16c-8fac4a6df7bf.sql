-- Table for per-organization assignment settings
CREATE TABLE organization_assignment_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  module_id uuid REFERENCES modules(id) ON DELETE CASCADE NOT NULL,
  assignment_index integer NOT NULL,
  is_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, module_id, assignment_index)
);

ALTER TABLE organization_assignment_settings ENABLE ROW LEVEL SECURITY;

-- Managers can manage their org's assignment settings
CREATE POLICY "Managers can view their org assignment settings"
ON organization_assignment_settings
FOR SELECT
USING (
  has_role(auth.uid(), 'manager'::app_role) AND 
  user_has_organization(auth.uid(), organization_id)
);

CREATE POLICY "Managers can insert their org assignment settings"
ON organization_assignment_settings
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'manager'::app_role) AND 
  user_has_organization(auth.uid(), organization_id)
);

CREATE POLICY "Managers can update their org assignment settings"
ON organization_assignment_settings
FOR UPDATE
USING (
  has_role(auth.uid(), 'manager'::app_role) AND 
  user_has_organization(auth.uid(), organization_id)
);

CREATE POLICY "Managers can delete their org assignment settings"
ON organization_assignment_settings
FOR DELETE
USING (
  has_role(auth.uid(), 'manager'::app_role) AND 
  user_has_organization(auth.uid(), organization_id)
);

-- Admins have full access
CREATE POLICY "Admins can manage all assignment settings"
ON organization_assignment_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Course groups table
CREATE TABLE course_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE course_groups ENABLE ROW LEVEL SECURITY;

-- Managers can manage their organization's course groups
CREATE POLICY "Managers can view their org course groups"
ON course_groups
FOR SELECT
USING (
  has_role(auth.uid(), 'manager'::app_role) AND 
  user_has_organization(auth.uid(), organization_id)
);

CREATE POLICY "Managers can insert their org course groups"
ON course_groups
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'manager'::app_role) AND 
  user_has_organization(auth.uid(), organization_id)
);

CREATE POLICY "Managers can update their org course groups"
ON course_groups
FOR UPDATE
USING (
  has_role(auth.uid(), 'manager'::app_role) AND 
  user_has_organization(auth.uid(), organization_id)
);

CREATE POLICY "Managers can delete their org course groups"
ON course_groups
FOR DELETE
USING (
  has_role(auth.uid(), 'manager'::app_role) AND 
  user_has_organization(auth.uid(), organization_id)
);

-- Admins have full access
CREATE POLICY "Admins can manage all course groups"
ON course_groups
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Course group items table
CREATE TABLE course_group_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES course_groups(id) ON DELETE CASCADE NOT NULL,
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(group_id, course_id)
);

ALTER TABLE course_group_items ENABLE ROW LEVEL SECURITY;

-- Managers can manage course group items for their org's groups
CREATE POLICY "Managers can view their org course group items"
ON course_group_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM course_groups cg
    WHERE cg.id = course_group_items.group_id
    AND has_role(auth.uid(), 'manager'::app_role)
    AND user_has_organization(auth.uid(), cg.organization_id)
  )
);

CREATE POLICY "Managers can insert their org course group items"
ON course_group_items
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM course_groups cg
    WHERE cg.id = course_group_items.group_id
    AND has_role(auth.uid(), 'manager'::app_role)
    AND user_has_organization(auth.uid(), cg.organization_id)
  )
);

CREATE POLICY "Managers can update their org course group items"
ON course_group_items
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM course_groups cg
    WHERE cg.id = course_group_items.group_id
    AND has_role(auth.uid(), 'manager'::app_role)
    AND user_has_organization(auth.uid(), cg.organization_id)
  )
);

CREATE POLICY "Managers can delete their org course group items"
ON course_group_items
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM course_groups cg
    WHERE cg.id = course_group_items.group_id
    AND has_role(auth.uid(), 'manager'::app_role)
    AND user_has_organization(auth.uid(), cg.organization_id)
  )
);

-- Admins have full access
CREATE POLICY "Admins can manage all course group items"
ON course_group_items
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));