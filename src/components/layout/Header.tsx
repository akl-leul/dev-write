import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  PenLine, 
  User, 
  LogOut, 
  Home, 
  FileText, 
  Search, 
  Menu, 
  X, 
  BarChart3, 
  Bookmark,
  Settings,
  Sparkles,
  Globe,
  Edit
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

export const Header = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      return data;
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
    setMobileMenuOpen(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/feed?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setMobileMenuOpen(false);
    }
  };

  return (
    // Floating Header Wrapper
    <div className="sticky top-4 z-50 px-4 md:px-0 mb-8 pointer-events-none">
      <div className="max-w-6xl mx-auto pointer-events-auto">
        <header className="bg-background/85 backdrop-blur-xl border border-border/50 shadow-xl shadow-foreground/5 rounded-2xl supports-[backdrop-filter]:bg-background/60 relative">
          <div className="container mx-auto flex h-16 items-center justify-between px-4">
            
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center text-primary-foreground shadow-sm group-hover:scale-105 transition-transform duration-200">
                <PenLine size={18} />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">Chronicle</h1>
            </Link>

            {/* Desktop Search */}
            <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-8">
              <div className="relative w-full group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-accent transition-colors" />
                <Input
                  type="search"
                  placeholder="Search stories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-muted/50 border-border focus:bg-background focus:border-accent focus:ring-4 focus:ring-accent/10 rounded-xl transition-all"
                />
              </div>
            </form>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1">
              <ThemeToggle />
              
              <Link to="/feed">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg">
                  <Home className="mr-2 h-4 w-4" />
                  Feed
                </Button>
              </Link>

              {user ? (
                <>
                  <Link to="/my-posts">
                    <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg">
                      <FileText className="mr-2 h-4 w-4" />
                      My Posts
                    </Button>
                  </Link>
                  
                  <Link to="/bookmarks">
                    <Button variant="ghost" size="icon" className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg" title="Bookmarks">
                      <Bookmark className="h-5 w-5" />
                    </Button>
                  </Link>

                  <div className="h-6 w-px bg-slate-200 mx-2" />

                  <Link to="/create">
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-600/20 mr-2">
                      <Sparkles className="mr-2 h-4 w-4" />
                      Write
                    </Button>
                  </Link>

                  <NotificationDropdown />

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="relative h-10 w-10 rounded-full ml-1 hover:bg-transparent px-0">
                        <Avatar className="h-9 w-9 border border-white dark:border-slate-900 shadow-sm transition-transform hover:scale-105">
                          <AvatarImage src={profile?.profile_image_url || ''} />
                          <AvatarFallback className="bg-slate-900 text-white font-medium">
                            {profile?.full_name?.[0]?.toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-60 rounded-xl border-slate-200 dark:border-slate-700 shadow-xl p-2 bg-white dark:bg-slate-900 mt-2">
                      <div className="flex items-center justify-start gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg mb-2">
                        <Avatar className="h-10 w-10 border border-white dark:border-slate-900 shadow-sm">
                          <AvatarImage src={profile?.profile_image_url || ''} />
                          <AvatarFallback className="bg-slate-900 text-white">
                            {profile?.full_name?.[0]?.toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col overflow-hidden">
                          <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{profile?.full_name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                        </div>
                      </div>
                      
                      <DropdownMenuItem onClick={() => navigate('/profile')} className="rounded-lg cursor-pointer focus:bg-slate-100 dark:focus:bg-slate-800">
                        <User className="mr-2 h-4 w-4 text-slate-500 dark:text-slate-400" />
                        Profile Settings
                      </DropdownMenuItem>
                      
                      {/* Prominent Edit Profile for Google users */}
                      {user?.identities?.some(identity => identity.provider === 'google') && (
                        <DropdownMenuItem onClick={() => navigate('/profile')} className="rounded-lg cursor-pointer focus:bg-blue-50 dark:focus:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Profile & Photo
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => navigate('/analytics')} className="rounded-lg cursor-pointer focus:bg-slate-100 dark:focus:bg-slate-800">
                        <BarChart3 className="mr-2 h-4 w-4 text-slate-500 dark:text-slate-400" />
                        Analytics Dashboard
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/bookmarks')} className="rounded-lg cursor-pointer focus:bg-slate-100 dark:focus:bg-slate-800">
                        <Bookmark className="mr-2 h-4 w-4 text-slate-500 dark:text-slate-400" />
                        Saved Stories
                      </DropdownMenuItem>
                      
                      {/* Show Google Profile link only for Google users */}
                      {user?.identities?.some(identity => identity.provider === 'google') && (
                        <DropdownMenuItem onClick={() => navigate('/google-profile')} className="rounded-lg cursor-pointer focus:bg-slate-100 dark:focus:bg-slate-800">
                          <Globe className="mr-2 h-4 w-4 text-slate-500 dark:text-slate-400" />
                          Google Profile Data
                        </DropdownMenuItem>
                      )}
                      
                      <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-700 my-2" />
                      
                      <DropdownMenuItem onClick={handleSignOut} className="rounded-lg cursor-pointer focus:bg-red-50 focus:text-red-600 text-red-500">
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <>
                  <div className="h-6 w-px bg-slate-200 mx-2" />
                  <Link to="/auth">
                    <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg">Sign In</Button>
                  </Link>
                  <Link to="/auth?mode=signup">
                    <Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg">Get Started</Button>
                  </Link>
                </>
              )}
            </nav>

            {/* Mobile Menu Button */}
            <div className="flex items-center gap-2 md:hidden">
               <ThemeToggle />
              {user && <NotificationDropdown />}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </header>

        {/* Floating Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-2 animate-in fade-in slide-in-from-top-4 duration-200">
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-100 dark:border-slate-700 rounded-2xl shadow-xl p-4 overflow-hidden">
              {/* Mobile Search */}
              <form onSubmit={handleSearch} className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                  <Input
                    type="search"
                    placeholder="Search posts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </form>

              <nav className="flex flex-col gap-1">
                <Link to="/feed" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full justify-start text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl h-10">
                    <Home className="mr-3 h-5 w-5 text-slate-400 dark:text-slate-500" />
                    Feed
                  </Button>
                </Link>

                {user ? (
                  <>
                    <Link to="/create" onClick={() => setMobileMenuOpen(false)}>
                      <Button size="sm" className="w-full justify-start bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-600/20 h-10 mb-2">
                        <Sparkles className="mr-3 h-5 w-5" />
                        Write New Story
                      </Button>
                    </Link>

                    <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 py-2 mt-2">
                      Library
                    </div>

                    <Link to="/my-posts" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="ghost" size="sm" className="w-full justify-start text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl h-10">
                        <FileText className="mr-3 h-5 w-5 text-slate-400 dark:text-slate-500" />
                        My Posts
                      </Button>
                    </Link>
                    
                    <Link to="/bookmarks" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="ghost" size="sm" className="w-full justify-start text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl h-10">
                        <Bookmark className="mr-3 h-5 w-5 text-slate-400 dark:text-slate-500" />
                        Bookmarks
                      </Button>
                    </Link>

                    <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 py-2 mt-2">
                      Account
                    </div>
                    
                    <Link to="/analytics" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="ghost" size="sm" className="w-full justify-start text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl h-10">
                        <BarChart3 className="mr-3 h-5 w-5 text-slate-400 dark:text-slate-500" />
                        Analytics
                      </Button>
                    </Link>

                    <Link to="/profile" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="ghost" size="sm" className="w-full justify-start text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl h-10">
                        <Settings className="mr-3 h-5 w-5 text-slate-400 dark:text-slate-500" />
                        Profile Settings
                      </Button>
                    </Link>

                    {/* Prominent Edit Profile for Google users - Mobile */}
                    {user?.identities?.some(identity => identity.provider === 'google') && (
                      <Link to="/profile" onClick={() => setMobileMenuOpen(false)}>
                        <Button variant="ghost" size="sm" className="w-full justify-start text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl h-10">
                          <Edit className="mr-3 h-5 w-5" />
                          Edit Profile & Photo
                        </Button>
                      </Link>
                    )}

                    {/* Show Google Profile link only for Google users */}
                    {user?.identities?.some(identity => identity.provider === 'google') && (
                      <Link to="/google-profile" onClick={() => setMobileMenuOpen(false)}>
                        <Button variant="ghost" size="sm" className="w-full justify-start text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl h-10">
                          <Globe className="mr-3 h-5 w-5 text-slate-400 dark:text-slate-500" />
                          Google Profile Data
                        </Button>
                      </Link>
                    )}

                    <div className="border-t border-slate-100 dark:border-slate-700 my-2 pt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-300 rounded-xl h-10"
                        onClick={handleSignOut}
                      >
                        <LogOut className="mr-3 h-5 w-5" />
                        Sign out
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="outline" size="sm" className="w-full border-slate-200 dark:border-slate-700 rounded-xl">Sign In</Button>
                    </Link>
                    <Link to="/auth?mode=signup" onClick={() => setMobileMenuOpen(false)}>
                      <Button size="sm" className="w-full bg-slate-900 text-white rounded-xl">Get Started</Button>
                    </Link>
                  </div>
                )}
              </nav>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};