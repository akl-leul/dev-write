import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { GoogleProfileDisplay } from '@/components/GoogleProfileDisplay';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

const GoogleProfile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  if (!user) {
    return null;
  }

  // Check if user signed in with Google
  const isGoogleUser = user.identities?.some(identity => identity.provider === 'google');

  if (!isGoogleUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-900">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Google Profile Only</h1>
          <p className="text-slate-500 dark:text-slate-400">This page is only for users who signed in with Google.</p>
          <Link to="/feed">
            <Button>
              <Home className="w-4 h-4 mr-2" />
              Go to Feed
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-6 flex items-center gap-4">
          <Link to="/feed">
            <Button variant="ghost" className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 gap-2 pl-0 hover:bg-transparent">
              <ArrowLeft className="w-4 h-4" />
              Back to Feed
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Google Profile Information</h1>
        </div>
        
        <GoogleProfileDisplay user={user} />
      </div>
    </div>
  );
};

export default GoogleProfile;
