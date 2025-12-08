-- Add role-based functionality to profiles table
-- This migration adds roles and permissions system to the existing profiles table

-- First, add role column to profiles table
ALTER TABLE profiles 
ADD COLUMN role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator', 'editor'));

-- Add role-specific fields
ALTER TABLE profiles 
ADD COLUMN is_active BOOLEAN DEFAULT true,
ADD COLUMN last_login_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN login_count INTEGER DEFAULT 0,
ADD COLUMN permissions JSONB DEFAULT '{}',
ADD COLUMN role_assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN role_assigned_by UUID REFERENCES auth.users(id);

-- Create roles table for better role management
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '{}',
    is_system_role BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_roles table for many-to-many relationship between users and roles
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES auth.users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(user_id, role_id)
);

-- Insert default roles
INSERT INTO roles (name, display_name, description, permissions, is_system_role) VALUES
('user', 'User', 'Regular user with basic permissions', '{
    "can_read_posts": true,
    "can_create_posts": true,
    "can_edit_own_posts": true,
    "can_delete_own_posts": true,
    "can_comment": true,
    "can_like": true,
    "can_bookmark": true,
    "can_follow": true,
    "can_edit_profile": true,
    "can_upload_images": true
}', true),
('moderator', 'Moderator', 'Can moderate content and users', '{
    "can_read_posts": true,
    "can_create_posts": true,
    "can_edit_own_posts": true,
    "can_delete_own_posts": true,
    "can_edit_others_posts": true,
    "can_delete_others_posts": true,
    "can_comment": true,
    "can_like": true,
    "can_bookmark": true,
    "can_follow": true,
    "can_edit_profile": true,
    "can_upload_images": true,
    "can_moderate_comments": true,
    "can_moderate_posts": true,
    "can_view_reports": true,
    "can_ban_users": false,
    "can_view_analytics": false
}', true),
('editor', 'Editor', 'Can edit and manage all content', '{
    "can_read_posts": true,
    "can_create_posts": true,
    "can_edit_own_posts": true,
    "can_delete_own_posts": true,
    "can_edit_others_posts": true,
    "can_delete_others_posts": true,
    "can_publish_posts": true,
    "can_unpublish_posts": true,
    "can_feature_posts": true,
    "can_comment": true,
    "can_like": true,
    "can_bookmark": true,
    "can_follow": true,
    "can_edit_profile": true,
    "can_upload_images": true,
    "can_moderate_comments": true,
    "can_moderate_posts": true,
    "can_view_reports": true,
    "can_ban_users": false,
    "can_view_analytics": true,
    "can_manage_categories": true,
    "can_manage_tags": true
}', true),
('admin', 'Administrator', 'Full system access and control', '{
    "can_read_posts": true,
    "can_create_posts": true,
    "can_edit_own_posts": true,
    "can_delete_own_posts": true,
    "can_edit_others_posts": true,
    "can_delete_others_posts": true,
    "can_publish_posts": true,
    "can_unpublish_posts": true,
    "can_feature_posts": true,
    "can_comment": true,
    "can_like": true,
    "can_bookmark": true,
    "can_follow": true,
    "can_edit_profile": true,
    "can_upload_images": true,
    "can_moderate_comments": true,
    "can_moderate_posts": true,
    "can_view_reports": true,
    "can_ban_users": true,
    "can_view_analytics": true,
    "can_manage_categories": true,
    "can_manage_tags": true,
    "can_manage_users": true,
    "can_manage_roles": true,
    "can_manage_system": true,
    "can_access_admin_panel": true,
    "can_view_sensitive_data": true
}', true);

-- Update all existing profiles to have 'user' role
UPDATE profiles SET role = 'user' WHERE role IS NULL OR role = '';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_is_active ON user_roles(is_active);

-- Create RLS (Row Level Security) policies for roles table
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read roles" ON roles
    FOR SELECT USING (true);

CREATE POLICY "Only admins can manage roles" ON roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Create RLS policies for user_roles table
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own roles" ON user_roles
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'moderator')
        )
    );

CREATE POLICY "Only admins can manage user roles" ON user_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Create function to check user permissions
CREATE OR REPLACE FUNCTION check_permission(user_id UUID, permission TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
    user_permissions JSONB;
BEGIN
    -- Get user role
    SELECT role INTO user_role FROM profiles WHERE id = user_id;
    
    -- If no role found, deny permission
    IF user_role IS NULL THEN
        RETURN false;
    END IF;
    
    -- Get permissions for the role
    SELECT permissions INTO user_permissions 
    FROM roles 
    WHERE name = user_role;
    
    -- If no permissions found, deny
    IF user_permissions IS NULL THEN
        RETURN false;
    END IF;
    
    -- Check if permission exists and is true
    RETURN COALESCE(user_permissions->>permission, 'false')::boolean;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get user permissions
CREATE OR REPLACE FUNCTION get_user_permissions(user_id UUID)
RETURNS JSONB AS $$
DECLARE
    user_role TEXT;
    role_permissions JSONB;
BEGIN
    -- Get user role
    SELECT role INTO user_role FROM profiles WHERE id = user_id;
    
    -- If no role found, return empty permissions
    IF user_role IS NULL THEN
        RETURN '{}'::jsonb;
    END IF;
    
    -- Get permissions for the role
    SELECT permissions INTO role_permissions 
    FROM roles 
    WHERE name = user_role;
    
    -- Return permissions or empty object
    RETURN COALESCE(role_permissions, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update updated_at in roles table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_roles_updated_at
    BEFORE UPDATE ON roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create audit table for role changes
CREATE TABLE IF NOT EXISTS role_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id),
    old_role TEXT,
    new_role TEXT NOT NULL,
    changed_by UUID REFERENCES auth.users(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reason TEXT,
    ip_address INET,
    user_agent TEXT
);

-- Create RLS for audit log
ALTER TABLE role_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own role changes" ON role_audit_log
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can read all role changes" ON role_audit_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Only admins can insert audit logs (triggered automatically)
CREATE POLICY "Only system can insert role audit" ON role_audit_log
    FOR INSERT WITH CHECK (false);

-- Create trigger to log role changes
CREATE OR REPLACE FUNCTION log_role_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role THEN
        INSERT INTO role_audit_log (user_id, old_role, new_role, changed_by, reason)
        VALUES (NEW.id, OLD.role, NEW.role, auth.uid(), 'Role updated via trigger');
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO role_audit_log (user_id, old_role, new_role, changed_by, reason)
        VALUES (NEW.id, NULL, NEW.role, auth.uid(), 'Initial role assignment');
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER role_change_audit
    AFTER INSERT OR UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION log_role_change();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT SELECT ON roles TO authenticated, anon;
GRANT SELECT ON user_roles TO authenticated;
GRANT EXECUTE ON FUNCTION check_permission TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_permissions TO authenticated;
