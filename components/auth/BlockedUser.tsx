import { AlertCircle, Mail, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const BlockedUser = () => {
  const handleContactSupport = () => {
    // Create email with user information
    const subject = 'Account Blocked - Support Request';
    const body = `Dear Support Team,

My account has been blocked and I would like to understand why and request a review.

User Information:
- Email: ${localStorage.getItem('user_email') || 'Not available'}
- Time: ${new Date().toLocaleString()}

Please let me know what steps I need to take to resolve this issue.

Thank you`;

    window.location.href = `mailto:support@dev-write.vercel.app?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 text-center">
          {/* Alert Icon */}
          <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-6">
            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">
            Account Suspended
          </h1>

          {/* Message */}
          <p className="text-slate-600 dark:text-slate-300 mb-8 leading-relaxed">
            Your account has been temporarily suspended by our administration team. 
            This action is typically taken due to violations of our community guidelines 
            or terms of service.
          </p>

          {/* Contact Information */}
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-6 mb-8">
            <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Please Contact Our Team
            </h2>
            
            <div className="space-y-3 text-left">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span className="text-sm text-slate-600 dark:text-slate-300">
                  support@dev-write.vercel.app
                </span>
              </div>
              
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span className="text-sm text-slate-600 dark:text-slate-300">
                  Mon-Fri, 9AM-5PM EST
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-4">
              Please include your account email and any relevant details about your situation.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button 
              onClick={handleContactSupport}
              className="w-full gap-2"
              size="lg"
            >
              <Mail className="w-4 h-4" />
              Contact Support Team
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/'}
              className="w-full"
            >
              Back to Home
            </Button>
          </div>

          {/* Additional Information */}
          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              We typically respond to support requests within 24-48 hours. 
              Thank you for your patience and understanding.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
