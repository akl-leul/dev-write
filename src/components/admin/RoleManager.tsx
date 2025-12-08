import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Users, 
  Shield, 
  Search, 
  UserPlus, 
  Settings,
  AlertTriangle,
  CheckCircle,
  Clock,
  Mail,
  Phone,
  Calendar
} from 'lucide-react';
import { useRoleBasedAccess, ROLES, PERMISSIONS } from '@/hooks/useRoleBasedAccess';

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  is_active: boolean;
  last_login_at: string | null;
  login_count: number;
  created_at: string;
  phone: string | null;
  bio: string | null;
  blocked: boolean;
}

interface RoleChange {
  userId: string;
  oldRole: string;
  newRole: string;
  reason: string;
}

export const RoleManager = () => {
  const { hasPermission, canManageUsers } = useRoleBasedAccess();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [isChangingRole, setIsChangingRole] = useState(false);
  const [roleChange, setRoleChange] = useState<RoleChange | null>(null);
  const [showRoleDialog, setShowRoleDialog] = useState(false);

  // Check if user can access this component
  if (!hasPermission('CAN_MANAGE_ROLES')) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to manage user roles.</p>
        </div>
      </div>
    );
  }

  // Fetch users with their roles
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          role,
          is_active,
          last_login_at,
          login_count,
          created_at,
          phone,
          bio,
          blocked
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Filter users based on search and role
  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchQuery || 
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    
    return matchesSearch && matchesRole;
  });

  // Change user role
  const changeUserRole = async () => {
    if (!roleChange) return;

    try {
      setIsChangingRole(true);
      
      const { error } = await supabase
        .from('profiles')
        .update({ 
          role: roleChange.newRole,
          role_assigned_at: new Date().toISOString(),
          role_assigned_by: supabase.auth.getUser().then(({ data }) => data.user?.id)
        })
        .eq('id', roleChange.userId);

      if (error) throw error;

      // Log the role change
      await supabase
        .from('role_audit_log')
        .insert({
          user_id: roleChange.userId,
          old_role: roleChange.oldRole,
          new_role: roleChange.newRole,
          reason: roleChange.reason,
          changed_by: (await supabase.auth.getUser()).data.user?.id
        });

      toast.success(`Role changed from ${roleChange.oldRole} to ${roleChange.newRole}`);
      setShowRoleDialog(false);
      setRoleChange(null);
      fetchUsers();
    } catch (error) {
      console.error('Error changing role:', error);
      toast.error('Failed to change role');
    } finally {
      setIsChangingRole(false);
    }
  };

  // Get role badge color
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'moderator': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'editor': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      case 'user': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  // Get role icon
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Shield className="h-4 w-4" />;
      case 'moderator': return <AlertTriangle className="h-4 w-4" />;
      case 'editor': return <Settings className="h-4 w-4" />;
      case 'user': return <Users className="h-4 w-4" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-blue-500" />
              <div>
                <CardTitle>Role Management</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Manage user roles and permissions
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{users.length} total users</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search users by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="user">Users</SelectItem>
                  <SelectItem value="moderator">Moderators</SelectItem>
                  <SelectItem value="editor">Editors</SelectItem>
                  <SelectItem value="admin">Admins</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Users List */}
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-muted-foreground">Loading users...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No users found</h3>
                <p className="text-muted-foreground">
                  {searchQuery || selectedRole !== 'all' 
                    ? 'Try adjusting your filters' 
                    : 'No users in the system yet'}
                </p>
              </div>
            ) : (
              filteredUsers.map((user) => (
                <Card key={user.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={user.profile_image_url} />
                          <AvatarFallback>
                            {user.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-lg">
                              {user.full_name || 'Unknown User'}
                            </h3>
                            <Badge className={getRoleBadgeColor(user.role)}>
                              <div className="flex items-center gap-1">
                                {getRoleIcon(user.role)}
                                <span className="capitalize">{user.role}</span>
                              </div>
                            </Badge>
                            {!user.is_active && (
                              <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                                Inactive
                              </Badge>
                            )}
                            {user.blocked && (
                              <Badge variant="destructive">
                                Blocked
                              </Badge>
                            )}
                          </div>
                          
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Mail className="h-3 w-3" />
                              <span>{user.email}</span>
                            </div>
                            {user.phone && (
                              <div className="flex items-center gap-2">
                                <Phone className="h-3 w-3" />
                                <span>{user.phone}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3 w-3" />
                              <span>Joined {new Date(user.created_at).toLocaleDateString()}</span>
                            </div>
                            {user.last_login_at && (
                              <div className="flex items-center gap-2">
                                <Clock className="h-3 w-3" />
                                <span>Last login {new Date(user.last_login_at).toLocaleDateString()}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-4 text-xs">
                              <span>Login count: {user.login_count}</span>
                              <span>ID: {user.id.substring(0, 8)}...</span>
                            </div>
                          </div>
                          
                          {user.bio && (
                            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                              {user.bio}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setRoleChange({
                                userId: user.id,
                                oldRole: user.role,
                                newRole: '',
                                reason: ''
                              })}
                            >
                              <Settings className="h-4 w-4 mr-1" />
                              Change Role
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Change User Role</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="newRole">New Role</Label>
                                <Select 
                                  value={roleChange?.newRole || ''} 
                                  onValueChange={(value) => 
                                    setRoleChange(prev => prev ? { ...prev, newRole: value } : null)
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select new role" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="user">User</SelectItem>
                                    <SelectItem value="moderator">Moderator</SelectItem>
                                    <SelectItem value="editor">Editor</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              <div>
                                <Label htmlFor="reason">Reason for change</Label>
                                <Textarea
                                  id="reason"
                                  placeholder="Explain why this role change is necessary..."
                                  value={roleChange?.reason || ''}
                                  onChange={(e) => 
                                    setRoleChange(prev => prev ? { ...prev, reason: e.target.value } : null)
                                  }
                                />
                              </div>
                              
                              <div className="flex gap-2">
                                <Button
                                  onClick={changeUserRole}
                                  disabled={!roleChange?.newRole || isChangingRole}
                                >
                                  {isChangingRole ? 'Changing...' : 'Change Role'}
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setShowRoleDialog(false);
                                    setRoleChange(null);
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
