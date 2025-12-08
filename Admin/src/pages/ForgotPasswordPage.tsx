import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Mail, Loader2, AlertTriangle, ArrowLeft, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/admin/reset-password`,
      });

      if (error) {
        setError(error.message || 'Failed to send reset email');
        return;
      }

      setIsSubmitted(true);
      toast.success('Password reset email sent successfully');
      
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Password reset error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <h1 className="text-2xl font-bold">Email Sent</h1>
            <p className="text-muted-foreground">
              We've sent a password reset link to your email address.
            </p>
            <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
              <p>Please check your inbox and follow the instructions to reset your password.</p>
            </div>
          </div>

          <Card>
            <CardFooter className="space-y-3">
              <Button
                onClick={() => window.location.href = '/signin'}
                className="w-full"
              >
                Return to Sign In
              </Button>
              
              <div className="text-center text-sm text-muted-foreground">
                Didn't receive the email?{' '}
                <button
                  onClick={() => setIsSubmitted(false)}
                  className="text-primary hover:underline"
                  disabled={isLoading}
                >
                  Try again
                </button>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

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
          <h1 className="text-2xl font-bold">Reset Password</h1>
          <p className="text-muted-foreground">
            Enter your email to receive a password reset link
          </p>
        </div>

        {/* Back to Sign In */}
        <div className="text-center">
          <Link 
            to="/signin" 
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to sign in
          </Link>
        </div>

        {/* Reset Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Forgot Password
            </CardTitle>
            <CardDescription>
              We'll send you a link to reset your password
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
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                  autoComplete="email"
                />
              </div>
            </CardContent>

            <CardFooter className="space-y-3">
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending Reset Link...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Send Reset Link
                  </>
                )}
              </Button>

              <div className="text-center">
                <Link 
                  to="/signin" 
                  className="text-sm text-primary hover:underline"
                >
                  Remember your password? Sign in
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>

        {/* Help Section */}
        <div className="text-center text-sm text-muted-foreground space-y-2">
          <p>
            Still having trouble? Contact your system administrator.
          </p>
          <div className="space-x-4">
            <Link 
              to="/admin/support" 
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
