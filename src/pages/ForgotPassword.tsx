import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Mail, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setEmailSent(true);
      toast.success('Password reset email sent! Check your inbox.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-accent/5">
      <div className="w-full max-w-md">
        <Card className="shadow-lift">
          <CardHeader className="space-y-4">
            <Link to="/auth" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Sign In
            </Link>
            <div>
              <CardTitle className="text-2xl sm:text-3xl font-serif">Forgot Password?</CardTitle>
              <CardDescription className="mt-2">
                {emailSent 
                  ? "We've sent you a password reset link"
                  : "Enter your email and we'll send you a reset link"
                }
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {emailSent ? (
              <div className="space-y-6">
                <div className="flex flex-col items-center gap-4 p-6 bg-accent/10 rounded-lg">
                  <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center">
                    <Mail className="h-8 w-8 text-accent" />
                  </div>
                  <div className="text-center space-y-2">
                    <p className="font-medium">Check your email</p>
                    <p className="text-sm text-muted-foreground">
                      We sent a password reset link to <br />
                      <span className="font-medium text-foreground">{email}</span>
                    </p>
                  </div>
                </div>

                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>Didn't receive the email?</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Check your spam folder</li>
                    <li>Verify the email address is correct</li>
                    <li>Wait a few minutes and try again</li>
                  </ul>
                </div>

                <Button
                  onClick={() => setEmailSent(false)}
                  variant="outline"
                  className="w-full"
                >
                  Try another email
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-accent"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </Button>

                <div className="text-center">
                  <Link
                    to="/auth?mode=signup"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Don't have an account? <span className="font-medium text-accent">Sign Up</span>
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;
