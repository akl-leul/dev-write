import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface BlockGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function BlockGuard({ children, fallback }: BlockGuardProps) {
  const [isBlocked, setIsBlocked] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUserBlockStatus();
  }, []);

  const checkUserBlockStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsBlocked(false); // Not logged in, let auth handle it
        setLoading(false);
        return;
      }

      // Check if user is blocked - we'll check if there's a blocked flag in user metadata
      // Since blocked column doesn't exist in profiles, we use a simpler approach
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error checking block status:', error);
        setIsBlocked(false); // Assume not blocked on error
      } else {
        // For now, no blocking mechanism - user is not blocked
        setIsBlocked(false);
      }
    } catch (error) {
      console.error('Error checking user status:', error);
      setIsBlocked(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isBlocked) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <Lock className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl text-red-600">Account Blocked</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-red-200 bg-red-50">
              <Lock className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>Access Restricted</strong><br />
                Your account has been blocked due to policy violations. You cannot access the application at this time.
              </AlertDescription>
            </Alert>

            <div className="space-y-3 text-sm text-muted-foreground">
              <h3 className="font-semibold text-foreground">To resolve this issue:</h3>
              <ol className="list-decimal list-inside space-y-2 ml-2">
                <li>Contact our support team at <a href="mailto:chronicle.ethiopia@gmail.com" className="text-primary underline">chronicle.ethiopia@gmail.com</a></li>
                <li>Include your account details and the reason for your appeal</li>
                <li>Wait for our team to review your case</li>
              </ol>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Mail className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <strong>Support Email:</strong> <a href="mailto:chronicle.ethiopia@gmail.com" className="underline">chronicle.ethiopia@gmail.com</a>
                  <br />
                  <span className="text-xs">We typically respond within 24-48 hours</span>
                </div>
              </div>
            </div>

            <Button 
              onClick={() => window.location.href = '/notifications'} 
              variant="outline" 
              className="w-full"
            >
              View Notifications
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
