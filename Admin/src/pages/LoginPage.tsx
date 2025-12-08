import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Eye, EyeOff, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { signIn } = useAuth();
  const { profile } = useAdminAuth();

  // If user is already logged in and has admin access, redirect to dashboard
  React.useEffect(() => {
    if (profile?.permissions?.can_access_admin_panel) {
      window.location.href = '/';
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await signIn(email, password);
      
      if (result.error) {
        setError(result.error.message || 'Failed to sign in');
        return;
      }

      toast.success('Successfully signed in');
      
      // Redirect will happen automatically via AuthGuard
      
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="p-3 bg-primary/10 rounded-full">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold">Admin Panel</h1>
          <p className="text-muted-foreground">
            Sign in to access the administrative dashboard
          </p>
        </div>

        {/* Login Form */}
        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              Enter your credentials to access the admin panel
            </CardDescription>
          </CardHeader>
          
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>

            <CardFooter className="space-y-4">
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>

              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Don't have admin access?{' '}
                  <Link 
                    to="/" 
                    className="text-primary hover:underline"
                  >
                    Return to main site
                  </Link>
                </p>
              </div>
            </CardFooter>
          </form>
        </Card>

        {/* Security Notice */}
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            This is a restricted area. Unauthorized access attempts are logged and may be reported.
          </AlertDescription>
        </Alert>

        {/* Help Section */}
        <div className="text-center text-sm text-muted-foreground space-y-2">
          <p>
            Need help? Contact your system administrator.
          </p>
          <div className="space-x-4">
            <Link 
              to="/forgot-password" 
              className="hover:text-foreground transition-colors"
            >
              Forgot password?
            </Link>
            <span>•</span>
            <Link 
              to="/support" 
              className="hover:text-foreground transition-colors"
            >
              Get support
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
