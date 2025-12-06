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
  Calendar,
  BarChart3,
  Globe,
  Zap,
  Shield,
  BookOpen,
  Code2,
  Heart,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/feed');
    }
  }, [user, navigate]);

  // Function to handle smooth scrolling
  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    setIsMobileMenuOpen(false); // Close mobile menu on click
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start' 
      });
    }
  };

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
        <nav className="container mx-auto px-4 md:px-6 py-4 md:py-6 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-50 border-b border-transparent transition-all">
          <div className="flex items-center gap-2">
            <Link to="/" className="flex items-center gap-2" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white">
                <PenLine size={18} />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">Chronicle</h1>
            </Link>
          </div>
          
          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#features" onClick={(e) => scrollToSection(e, 'features')} className="hover:text-blue-600 transition-colors cursor-pointer">Features</a>
            <a href="#community" onClick={(e) => scrollToSection(e, 'community')} className="hover:text-blue-600 transition-colors cursor-pointer">Community</a>
            <a href="#resources" onClick={(e) => scrollToSection(e, 'resources')} className="hover:text-blue-600 transition-colors cursor-pointer">Resources</a>
          </div>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center gap-4">
            <Link to="/auth">
              <Button variant="ghost" className="text-slate-600 hover:text-slate-900 hover:bg-slate-100">Sign In</Button>
            </Link>
            <Link to="/auth?mode=signup">
              <Button className="bg-white border border-slate-200 text-slate-900 hover:bg-slate-50 shadow-sm rounded-lg">Get Started</Button>
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="md:hidden flex items-center">
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-600">
              {isMobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </nav>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden fixed inset-x-0 top-[70px] bg-white border-b border-slate-100 shadow-xl z-40 p-4 animate-in slide-in-from-top-5 duration-200">
             <div className="flex flex-col gap-4">
                <a href="#features" onClick={(e) => scrollToSection(e, 'features')} className="text-lg font-medium text-slate-600 py-2 border-b border-slate-50">Features</a>
                <a href="#community" onClick={(e) => scrollToSection(e, 'community')} className="text-lg font-medium text-slate-600 py-2 border-b border-slate-50">Community</a>
                <a href="#resources" onClick={(e) => scrollToSection(e, 'resources')} className="text-lg font-medium text-slate-600 py-2 border-b border-slate-50">Resources</a>
                <div className="flex gap-3 mt-2">
                  <Link to="/auth" className="w-full"><Button variant="outline" className="w-full bg-slate-100 justify-center text-slate-600">Sign In</Button></Link>
                  <Link to="/auth?mode=signup" className="w-full"><Button className="w-full justify-center bg-blue-600 text-white">Get Started</Button></Link>
                </div>
             </div>
          </div>
        )}

        {/* Hero Section */}
        <section className="relative pt-12 pb-20 md:pt-20 md:pb-40 overflow-hidden">
          <div className="container mx-auto px-4 relative z-10 text-center max-w-5xl">
            
            {/* Center Icon */}
            <div className="mx-auto w-16 h-16 md:w-20 md:h-20 bg-white rounded-2xl shadow-xl flex items-center justify-center mb-8 md:mb-10 border border-slate-100 rotate-3 hover:rotate-6 transition-transform duration-500">
              <div className="grid grid-cols-2 gap-1.5">
                <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-blue-500"></div>
                <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-slate-800"></div>
                <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-slate-800"></div>
                <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-slate-300"></div>
              </div>
            </div>

            {/* Main Headlines - Responsive Text Sizes */}
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold text-slate-900 mb-6 tracking-tight leading-[1.1]">
              Share Your Stories, <br />
              <span className="text-slate-400">Connect with the World</span>
            </h1>
            
            <p className="text-lg md:text-xl text-slate-500 mb-8 md:mb-10 max-w-2xl mx-auto leading-relaxed px-4">
              A beautiful platform for writers and readers to connect through compelling narratives. Think, write, and publish all in one place.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 px-4">
              <Link to="/auth?mode=signup" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-14 px-8 text-lg shadow-lg shadow-blue-600/20">
                  Start Writing Free
                </Button>
              </Link> 
              <Link to="/feed" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto bg-transparent outline-2 outline-blue-600 hover:bg-blue-100 text-blue-700 rounded-xl h-14 px-8 text-lg shadow-lg shadow-blue-600/20">
                  Read Now
                </Button>
              </Link>
            </div>
          </div>

          {/* Floating Decorative Elements - Hidden on Mobile to prevent clutter */}
          <div className="absolute inset-0 pointer-events-none max-w-[1400px] mx-auto hidden lg:block">
            {/* Top Left: Sticky Note */}
            <div className="absolute top-32 left-10 transform -rotate-6 hover:-rotate-3 transition-transform duration-300">
              <div className="bg-[#fef9c3] p-6 w-64 h-64 shadow-lg flex flex-col items-center justify-center text-center relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-red-500 shadow-sm border-2 border-red-600"></div>
                <p className="font-handwriting text-slate-700 text-lg leading-relaxed font-medium">
                  "Draft ideas for the new novel chapter. Remember to focus on character development!"
                </p>
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
        <section id="features" className="py-16 md:py-24 bg-slate-50 relative z-20">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
              <span className="text-blue-600 font-semibold tracking-wide uppercase text-sm">Features</span>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mt-2 mb-4">
                Everything You Need to Tell Your Story
              </h2>
              <p className="text-slate-500 text-lg">
                Powerful tools designed to help you focus on what matters most—your writing.
              </p>
            </div>
            
            {/* Responsive Grid: 1 col mobile, 2 col tablet, 3 col desktop */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {/* Feature 1 */}
              <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow group">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-6 text-blue-600 group-hover:scale-110 transition-transform">
                  <PenLine className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Rich Editor</h3>
                <p className="text-slate-500 leading-relaxed">
                  Write with markdown support, add images, and format your content beautifully without distractions.
                </p>
              </div>
              
              {/* Feature 2 */}
              <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow group">
                <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center mb-6 text-purple-600 group-hover:scale-110 transition-transform">
                  <BarChart3 className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Analytics</h3>
                <p className="text-slate-500 leading-relaxed">
                  Track your readership. See who is reading, where they are from, and what stories resonate the most.
                </p>
              </div>
              
              {/* Feature 3 */}
              <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow group">
                <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center mb-6 text-orange-600 group-hover:scale-110 transition-transform">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Discovery Engine</h3>
                <p className="text-slate-500 leading-relaxed">
                  Our algorithm helps your stories get found by the right people, boosting your reach automatically.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow group">
                <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center mb-6 text-green-600 group-hover:scale-110 transition-transform">
                  <Zap className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Lightning Fast</h3>
                <p className="text-slate-500 leading-relaxed">
                  Optimized for speed. Your profile and stories load instantly, keeping your readers engaged.
                </p>
              </div>

              {/* Feature 5 */}
              <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow group">
                <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mb-6 text-red-600 group-hover:scale-110 transition-transform">
                  <Shield className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Secure & Private</h3>
                <p className="text-slate-500 leading-relaxed">
                  You own your data. We provide industry-standard security to keep your drafts and account safe.
                </p>
              </div>

              {/* Feature 6 */}
              <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow group">
                <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center mb-6 text-teal-600 group-hover:scale-110 transition-transform">
                  <Globe className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Custom Domain</h3>
                <p className="text-slate-500 leading-relaxed">
                  Make it yours. Connect your own domain to your Chronicle blog for a fully branded experience.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Community Section */}
        <section id="community" className="py-16 md:py-24 bg-slate-900 text-white relative overflow-hidden">
          {/* Decorative faint pattern */}
          <div className="absolute inset-0 opacity-10 pointer-events-none" 
               style={{
                 backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)',
                 backgroundSize: '32px 32px'
               }}>
          </div>

          <div className="container mx-auto px-4 relative z-10">
            <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
              
              <div className="w-full lg:w-1/2 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-6">
                  <Users size={14} />
                  <span>Join the movement</span>
                </div>
                <h2 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
                  Join a Community of <br />
                  <span className="text-blue-500">Passionate Writers</span>
                </h2>
                <p className="text-slate-400 text-lg mb-8 leading-relaxed">
                  Chronicle isn't just a tool; it's a network. Engage with fellow writers, receive constructive feedback, and participate in weekly writing prompts.
                </p>
                
                <div className="grid grid-cols-2 gap-4 sm:gap-6 mb-8">
                  <div className="bg-slate-800/50 p-4 rounded-xl lg:bg-transparent lg:p-0">
                    <h4 className="text-2xl md:text-3xl font-bold text-white mb-1">10k+</h4>
                    <p className="text-slate-500 text-sm">Active Writers</p>
                  </div>
                  <div className="bg-slate-800/50 p-4 rounded-xl lg:bg-transparent lg:p-0">
                    <h4 className="text-2xl md:text-3xl font-bold text-white mb-1">500+</h4>
                    <p className="text-slate-500 text-sm">Daily Stories</p>
                  </div>
                  <div className="bg-slate-800/50 p-4 rounded-xl lg:bg-transparent lg:p-0">
                    <h4 className="text-2xl md:text-3xl font-bold text-white mb-1">50+</h4>
                    <p className="text-slate-500 text-sm">Countries</p>
                  </div>
                  <div className="bg-slate-800/50 p-4 rounded-xl lg:bg-transparent lg:p-0">
                    <h4 className="text-2xl md:text-3xl font-bold text-white mb-1">24/7</h4>
                    <p className="text-slate-500 text-sm">Support</p>
                  </div>
                </div>

                <Link to="/auth?mode=signup">
                  <Button className="w-full sm:w-auto bg-white text-slate-900 hover:bg-slate-100">
                    Join Community
                  </Button>
                </Link>
              </div>

              <div className="w-full lg:w-1/2 relative mt-8 lg:mt-0">
                {/* Visual representation of community comments */}
                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl blur opacity-30"></div>
                  <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 md:p-6 relative">
                    <div className="space-y-6">
                      {/* Fake Comment 1 */}
                      <div className="flex gap-3 md:gap-4">
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-xs md:text-sm shrink-0">JD</div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-white text-sm md:text-base">Jane Doe</span>
                            <span className="text-[10px] md:text-xs text-slate-500">2 hrs ago</span>
                          </div>
                          <p className="text-slate-300 text-xs md:text-sm">"This perspective on modern literature is exactly what I needed to read today. Great work!"</p>
                          <div className="flex gap-4 mt-2 text-[10px] md:text-xs text-slate-500">
                            <span className="flex items-center gap-1 hover:text-white cursor-pointer"><Heart size={12} /> 24</span>
                            <span className="flex items-center gap-1 hover:text-white cursor-pointer"><MessageSquare size={12} /> Reply</span>
                          </div>
                        </div>
                      </div>

                      {/* Fake Comment 2 */}
                      <div className="flex gap-3 md:gap-4 pl-4 md:pl-8 border-l-2 border-slate-700">
                        <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-[10px] md:text-xs shrink-0">AS</div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-white text-sm md:text-base">Alex Smith</span>
                            <span className="text-[10px] md:text-xs text-slate-500">1 hr ago</span>
                          </div>
                          <p className="text-slate-300 text-xs md:text-sm">"Agreed! The character development in the second act was subtle but powerful."</p>
                        </div>
                      </div>

                       {/* Fake Comment 3 */}
                       <div className="flex gap-3 md:gap-4">
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-xs md:text-sm shrink-0">MK</div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-white text-sm md:text-base">Mike K.</span>
                            <span className="text-[10px] md:text-xs text-slate-500">5 hrs ago</span>
                          </div>
                          <p className="text-slate-300 text-xs md:text-sm">"Just subscribed. Looking forward to the next installment."</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Resources Section */}
        <section id="resources" className="py-16 md:py-24 bg-white relative">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                Resources to Help You Grow
              </h2>
              <p className="text-slate-500 text-lg">
                Whether you're just starting or a seasoned professional, we have the tools to support you.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Resource 1 */}
              <div className="group border border-slate-200 rounded-2xl p-1 bg-white hover:border-blue-200 transition-colors">
                <div className="bg-slate-50 rounded-xl p-6 md:p-8 h-full flex flex-col items-center text-center group-hover:bg-blue-50/50 transition-colors">
                  <BookOpen className="w-10 h-10 text-slate-700 mb-4 group-hover:text-blue-600 transition-colors" />
                  <h3 className="text-lg font-bold text-slate-900 mb-2">The Writer's Handbook</h3>
                  <p className="text-slate-500 text-sm mb-6">
                    A comprehensive guide to publishing on Chronicle, SEO best practices, and writing tips.
                  </p>
                  <Button variant="link" className="mt-auto text-blue-600">Read Guide <ArrowRight className="w-4 h-4 ml-1" /></Button>
                </div>
              </div>

              {/* Resource 2 */}
              <div className="group border border-slate-200 rounded-2xl p-1 bg-white hover:border-blue-200 transition-colors">
                <div className="bg-slate-50 rounded-xl p-6 md:p-8 h-full flex flex-col items-center text-center group-hover:bg-blue-50/50 transition-colors">
                  <Code2 className="w-10 h-10 text-slate-700 mb-4 group-hover:text-blue-600 transition-colors" />
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Developer API</h3>
                  <p className="text-slate-500 text-sm mb-6">
                    Access your content programmatically. Build custom front-ends or integrate with other tools.
                  </p>
                  <Button variant="link" className="mt-auto text-blue-600">View Docs <ArrowRight className="w-4 h-4 ml-1" /></Button>
                </div>
              </div>

              {/* Resource 3 */}
              <div className="group border border-slate-200 rounded-2xl p-1 bg-white hover:border-blue-200 transition-colors">
                <div className="bg-slate-50 rounded-xl p-6 md:p-8 h-full flex flex-col items-center text-center group-hover:bg-blue-50/50 transition-colors">
                  <Users className="w-10 h-10 text-slate-700 mb-4 group-hover:text-blue-600 transition-colors" />
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Help Center</h3>
                  <p className="text-slate-500 text-sm mb-6">
                    Got questions? Our support team and community forum are here to help you solve any issue.
                  </p>
                  <Button variant="link" className="mt-auto text-blue-600">Get Support <ArrowRight className="w-4 h-4 ml-1" /></Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-24 relative bg-slate-50">
          <div className="container mx-auto px-4 text-center">
            {/* Visual Anchor */}
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-8 transform -rotate-3 hover:rotate-0 transition-transform">
              <PenLine size={32} />
            </div>

            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight">
              Ready to Share Your Voice?
            </h2>
            <p className="text-lg md:text-xl text-slate-500 mb-10 max-w-2xl mx-auto">
              Join thousands of writers and readers connecting through stories. Start your journey with Chronicle today.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/auth?mode=signup" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-14 px-10 text-lg shadow-lg shadow-blue-600/20">
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
            <div className="flex items-center justify-center gap-2 mb-4 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
               <div className="w-6 h-6 bg-slate-900 rounded-md flex items-center justify-center text-white">
                  <PenLine size={12} />
               </div>
               <p className="font-bold text-xl text-slate-900">Chronicle</p>
            </div>
            <p className="text-slate-400 text-sm mb-6">&copy; 2025 Chronicle. All rights reserved.</p>
            
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Index;