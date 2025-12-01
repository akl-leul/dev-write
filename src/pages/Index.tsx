import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, PenLine, Users, Sparkles } from 'lucide-react';
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
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-hero">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItMnptMC0ydjItMnptMi0ydjItMnptLTItMnYyLTJ6bTItMnYyLTJ6bS0yLTJ2Mi0yem0yLTJ2Mi0yem0tMi0ydjItMnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-10"></div>
        
        <div className="container relative">
          <nav className="flex items-center justify-between py-6">
            <h1 className="text-2xl font-serif font-bold text-hero-foreground">Chronicle</h1>
            <div className="flex items-center gap-4">
              <Link to="/auth">
                <Button variant="ghost" className="text-hero-foreground hover:text-hero-foreground/80">
                  Sign In
                </Button>
              </Link>
              <Link to="/auth?mode=signup">
                <Button className="bg-accent hover:bg-accent/90">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </nav>

          <div className="py-24 md:py-32 text-center">
            <h1 className="text-5xl md:text-7xl font-serif font-bold text-hero-foreground mb-6 text-balance">
              Share Your Stories
              <br />
              <span className="text-accent">With The World</span>
            </h1>
            <p className="text-xl md:text-2xl text-hero-foreground/80 mb-12 max-w-2xl mx-auto">
              A beautiful platform for writers and readers to connect through compelling narratives
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link to="/auth?mode=signup">
                <Button size="lg" className="bg-accent hover:bg-accent/90 text-lg px-8">
                  Start Writing
                  <PenLine className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/feed">
                <Button size="lg" variant="outline" className="text-lg px-8 bg-transparent text-hero-foreground border-hero-foreground/30 hover:bg-hero-foreground/10">
                  Explore Stories
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-secondary">
        <div className="container">
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-center mb-16">
            Everything You Need to Tell Your Story
          </h2>
          
          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-accent flex items-center justify-center mx-auto mb-6">
                <PenLine className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-serif font-semibold mb-4">Rich Editor</h3>
              <p className="text-muted-foreground text-lg">
                Write with markdown support, add images, and format your content beautifully
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-accent flex items-center justify-center mx-auto mb-6">
                <Users className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-serif font-semibold mb-4">Engage</h3>
              <p className="text-muted-foreground text-lg">
                Connect with readers through nested comments, likes, and thoughtful discussions
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-accent flex items-center justify-center mx-auto mb-6">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-serif font-semibold mb-4">Discover</h3>
              <p className="text-muted-foreground text-lg">
                Explore diverse perspectives and find stories that inspire you
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="container text-center">
          <h2 className="text-4xl md:text-5xl font-serif font-bold mb-6">
            Ready to Share Your Voice?
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join our community of writers and readers today
          </p>
          <Link to="/auth?mode=signup">
            <Button size="lg" className="bg-gradient-accent text-lg px-8">
              Create Your Account
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 bg-muted/50">
        <div className="container text-center text-muted-foreground">
          <p className="font-serif text-2xl font-bold mb-2">Chronicle</p>
          <p>&copy; 2025 Chronicle. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
