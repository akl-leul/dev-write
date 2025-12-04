import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  ArrowRight, 
  PenLine, 
  Users, 
  Sparkles, 
  Check, 
  Clock, 
  Mail, 
  MessageSquare, 
  Calendar
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/feed');
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-100">
      
      {/* Background Dot Pattern */}
      <div className="fixed inset-0 z-0 pointer-events-none" 
           style={{
             backgroundImage: 'radial-gradient(#e5e7eb 1px, transparent 1px)',
             backgroundSize: '24px 24px'
           }}>
      </div>

      <div className="relative z-10">
        {/* Navigation */}
        <nav className="container mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white">
              <PenLine size={18} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Chronicle</h1>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-blue-600 transition-colors">Features</a>
            <a href="#community" className="hover:text-blue-600 transition-colors">Community</a>
            <a href="#pricing" className="hover:text-blue-600 transition-colors">Resources</a>
          </div>

          <div className="flex items-center gap-4">
            <Link to="/auth">
              <Button variant="ghost" className="text-slate-600 hover:text-slate-900 hover:bg-slate-100">
                Sign In
              </Button>
            </Link>
            <Link to="/auth?mode=signup">
              <Button className="bg-white border border-slate-200 text-slate-900 hover:bg-slate-50 shadow-sm rounded-lg">
                Get Started
              </Button>
            </Link>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="relative pt-20 pb-40 overflow-hidden">
          <div className="container mx-auto px-4 relative z-10 text-center max-w-5xl">
            
            {/* Center Icon */}
            <div className="mx-auto w-20 h-20 bg-white rounded-2xl shadow-xl flex items-center justify-center mb-10 border border-slate-100 rotate-3 hover:rotate-6 transition-transform duration-500">
              <div className="grid grid-cols-2 gap-1.5">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <div className="w-3 h-3 rounded-full bg-slate-800"></div>
                <div className="w-3 h-3 rounded-full bg-slate-800"></div>
                <div className="w-3 h-3 rounded-full bg-slate-300"></div>
              </div>
            </div>

            {/* Main Headlines */}
            <h1 className="text-6xl md:text-7xl font-bold text-slate-900 mb-6 tracking-tight leading-[1.1]">
              Share Your Stories, <br />
              <span className="text-slate-400">Connect with the World</span>
            </h1>
            
            <p className="text-xl text-slate-500 mb-10 max-w-2xl mx-auto leading-relaxed">
              A beautiful platform for writers and readers to connect through compelling narratives. Think, write, and publish all in one place.
            </p>

            <div className="flex items-center justify-center gap-4">
              <Link to="/auth?mode=signup">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-14 px-8 text-lg shadow-lg shadow-blue-600/20">
                  Start Writing Free
                </Button>
              </Link>
            </div>
          </div>

          {/* Floating Decorative Elements (Absolute Positioned) */}
          <div className="absolute inset-0 pointer-events-none max-w-[1400px] mx-auto hidden lg:block">
            
            {/* Top Left: Sticky Note */}
            <div className="absolute top-32 left-10 transform -rotate-6 hover:-rotate-3 transition-transform duration-300">
              <div className="bg-[#fef9c3] p-6 w-64 h-64 shadow-lg flex flex-col items-center justify-center text-center relative">
                {/* Red Pin */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-red-500 shadow-sm border-2 border-red-600"></div>
                <p className="font-handwriting text-slate-700 text-lg leading-relaxed font-medium">
                  "Draft ideas for the new novel chapter. Remember to focus on character development!"
                </p>
                
                {/* Check Icon overlay */}
                <div className="absolute -bottom-8 -left-8 bg-white p-4 rounded-2xl shadow-xl border border-slate-100">
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Check className="text-white w-6 h-6" />
                  </div>
                </div>
              </div>
            </div>

            {/* Top Right: Reminders Card */}
            <div className="absolute top-20 right-10 w-72 bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-100 shadow-2xl p-4 transform rotate-2">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-800">Reminders</h3>
                <div className="bg-slate-100 p-1 rounded-md">
                   <Clock className="w-4 h-4 text-slate-500" />
                </div>
              </div>
              <div className="space-y-3">
                <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                  <p className="text-xs font-bold text-slate-700">Editor's Meeting</p>
                  <p className="text-[10px] text-slate-400">Call with publishing team</p>
                  <div className="mt-2 flex items-center text-blue-500 text-[10px] font-medium bg-blue-50 w-fit px-2 py-1 rounded">
                    <Clock className="w-3 h-3 mr-1" /> 13:00 - 13:45
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Left: Tasks/Stats Card */}
            <div className="absolute bottom-10 left-20 w-80 bg-white rounded-2xl border border-slate-100 shadow-2xl p-6 transform rotate-2">
              <h3 className="font-bold text-slate-800 mb-4">Writing Progress</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium">Chapter 4 Draft</span>
                    <span className="text-slate-400">60%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full w-[60%] bg-blue-500 rounded-full"></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium">Proofreading</span>
                    <span className="text-slate-400">12%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full w-[12%] bg-red-400 rounded-full"></div>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 flex -space-x-2">
                 <div className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white"></div>
                 <div className="w-8 h-8 rounded-full bg-slate-300 border-2 border-white"></div>
                 <div className="w-8 h-8 rounded-full bg-slate-400 border-2 border-white flex items-center justify-center text-[10px] text-white font-bold">+3</div>
              </div>
            </div>

            {/* Bottom Right: Integrations */}
            <div className="absolute bottom-0 right-20 w-64 bg-white rounded-2xl border border-slate-100 shadow-2xl p-6 transform -rotate-3">
              <h3 className="font-bold text-slate-800 mb-4">100+ Integrations</h3>
              <div className="flex justify-between items-center gap-2">
                <div className="w-14 h-14 bg-white border border-slate-100 shadow-md rounded-2xl flex items-center justify-center">
                   <Mail className="w-6 h-6 text-red-500" />
                </div>
                <div className="w-14 h-14 bg-white border border-slate-100 shadow-md rounded-2xl flex items-center justify-center">
                   <MessageSquare className="w-6 h-6 text-green-500" />
                </div>
                <div className="w-14 h-14 bg-white border border-slate-100 shadow-md rounded-2xl flex items-center justify-center">
                   <Calendar className="w-6 h-6 text-blue-500" />
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 bg-slate-50 relative z-20">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                Everything You Need to Tell Your Story
              </h2>
              <p className="text-slate-500 text-lg">
                Powerful tools designed to help you focus on what matters most—your writing.
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6 text-blue-600">
                  <PenLine className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Rich Editor</h3>
                <p className="text-slate-500 leading-relaxed">
                  Write with markdown support, add images, and format your content beautifully without distractions.
                </p>
              </div>
              
              {/* Feature 2 */}
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-6 text-purple-600">
                  <Users className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Engage</h3>
                <p className="text-slate-500 leading-relaxed">
                  Connect with readers through nested comments, likes, and thoughtful discussions on your work.
                </p>
              </div>
              
              {/* Feature 3 */}
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-6 text-orange-600">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Discover</h3>
                <p className="text-slate-500 leading-relaxed">
                  Explore diverse perspectives and find stories that inspire you from creators around the globe.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 relative">
          <div className="container mx-auto px-4 text-center">
            {/* Visual Anchor */}
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-8 transform -rotate-3 hover:rotate-0 transition-transform">
              <PenLine size={32} />
            </div>

            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight">
              Ready to Share Your Voice?
            </h2>
            <p className="text-xl text-slate-500 mb-10 max-w-2xl mx-auto">
              Join thousands of writers and readers connecting through stories. Start your journey with Chronicle today.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/auth?mode=signup">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-14 px-10 text-lg shadow-lg shadow-blue-600/20">
                  Create Your Account
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </div>
            
            <p className="mt-8 text-sm text-slate-400">
              Free forever for readers · No credit card required
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 bg-white border-t border-slate-100">
          <div className="container mx-auto px-4 text-center">
            <p className="font-bold text-xl mb-4 text-slate-900">Chronicle</p>
            <p className="text-slate-400 text-sm">&copy; 2025 Chronicle. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Index;