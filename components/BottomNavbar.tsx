import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Home, 
  PlusSquare, 
  Bookmark, 
  User, Search
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string; size?: string | number }>;
  path: string;
  badge?: number;
}

export const BottomNavbar: React.FC = () => {
  const { user, profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const navItems: NavItem[] = [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      path: '/feed'
    },
    {
      id: 'search',
      label: 'Search',
      icon: Search,
      path: '/search'
    },
    {
      id: 'create',
      label: 'Create',
      icon: PlusSquare,
      path: '/create'
    },
    {
      id: 'bookmarks',
      label: 'Bookmarks',
      icon: Bookmark,
      path: '/bookmarks'
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      path: '/profile'
    }
  ];

  // Handle scroll behavior
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const isScrollingDown = currentScrollY > lastScrollY;
      const isNearBottom = window.innerHeight + currentScrollY >= document.body.offsetHeight - 100;

      // Hide navbar when scrolling down, show when scrolling up or near bottom
      if (isScrollingDown && !isNearBottom && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const handleNavClick = (path: string) => {
    navigate(path);
  };

  const isActivePath = (path: string) => {
    if (path === '/feed' && location.pathname === '/') {
      return true;
    }
    return location.pathname === path || 
           (path !== '/feed' && location.pathname.startsWith(path));
  };

  // Only show navbar for logged in users
  if (!user || !profile) {
    return null;
  }

  return (
    <>
      {/* Add padding to bottom of body to account for navbar */}
      <div className="h-16 md:h-0"></div>
      
      {/* Bottom Navigation Bar */}
      <nav
        className={cn(
          'fixed bottom-6 left-4 right-4 z-50 bg-background/90 backdrop-blur-xl border border-border/30',
          'transform transition-all duration-500 ease-out',
          'md:hidden', // Hide on desktop screens
          'shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]',
          'shadow-lg shadow-black/20 dark:shadow-black/40',
          'rounded-3xl mx-auto max-w-sm',
          'hover:scale-[1.02] active:scale-[0.98]',
          'before:absolute before:inset-0 before:rounded-3xl before:bg-gradient-to-b before:from-white/10 before:to-transparent before:pointer-events-none',
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
        )}
      >
        <div className="relative">
          {/* Safe area padding for notched screens */}
          <div className="pb-safe-area-inset-bottom">
            <div className="flex items-center justify-around h-16 px-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = isActivePath(item.path);
                
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.path)}
                    className={cn(
                      'relative flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-colors duration-200',
                      'min-w-0 flex-1',
                      isActive
                        ? 'text-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                    aria-label={item.label}
                  >
                    <div className="relative">
                      {/* Show profile picture for profile item, otherwise show icon */}
                      {item.id === 'profile' && profile?.profile_image_url ? (
                        <img
                          src={profile.profile_image_url}
                          alt="Profile"
                          className={cn(
                            'w-5 h-5 rounded-full object-cover transition-transform duration-200',
                            isActive ? 'scale-110 ring-2 ring-primary ring-offset-2' : 'scale-100'
                          )}
                        />
                      ) : (
                        <Icon 
                          size={20} 
                          className={cn(
                            'transition-transform duration-200',
                            isActive ? 'scale-110' : 'scale-100'
                          )}
                        />
                      )}
                      
                      {/* Notification badge */}
                      {item.badge && item.badge > 0 && (
                        <Badge
                          variant="destructive"
                          className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-xs"
                        >
                          {item.badge > 99 ? '99+' : item.badge}
                        </Badge>
                      )}
                    </div>
                    
                    <span 
                      className={cn(
                        'text-xs mt-1 font-medium truncate max-w-full',
                        isActive ? 'text-primary' : 'text-muted-foreground'
                      )}
                    >
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Optional: Add a subtle shadow for depth */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent"></div>
        </div>
      </nav>
    </>
  );
};

export default BottomNavbar;
