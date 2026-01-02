import { Moon, Sun, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTheme } from '@/contexts/ThemeContext';

export const ThemeToggle = () => {
  const { theme, setTheme, resolvedTheme, toggleTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-9 w-9 rounded-xl hover:bg-muted transition-all duration-200 hover:scale-105"
          onClick={(e) => {
            // Allow quick toggle with single click
            if (e.shiftKey || e.detail === 2) {
              toggleTheme();
            }
          }}
        >
          <div className="relative">
            <Sun 
              className={`h-4 w-4 text-foreground transition-all duration-300 ${
                resolvedTheme === 'dark' ? 'opacity-0 scale-0 rotate-90' : 'opacity-100 scale-100 rotate-0'
              }`} 
            />
            <Moon 
              className={`absolute top-0 left-0 h-4 w-4 text-foreground transition-all duration-300 ${
                resolvedTheme === 'dark' ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-0 -rotate-90'
              }`} 
            />
          </div>
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-xl border-border bg-popover min-w-[140px]">
        <DropdownMenuItem 
          onClick={() => setTheme('light')}
          className={`cursor-pointer rounded-lg transition-colors ${
            theme === 'light' ? 'bg-muted text-foreground' : 'hover:bg-muted/50'
          }`}
        >
          <Sun className="mr-2 h-4 w-4" />
          Light
          {theme === 'light' && (
            <div className="ml-auto h-2 w-2 rounded-full bg-primary" />
          )}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme('dark')}
          className={`cursor-pointer rounded-lg transition-colors ${
            theme === 'dark' ? 'bg-muted text-foreground' : 'hover:bg-muted/50'
          }`}
        >
          <Moon className="mr-2 h-4 w-4" />
          Dark
          {theme === 'dark' && (
            <div className="ml-auto h-2 w-2 rounded-full bg-primary" />
          )}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme('system')}
          className={`cursor-pointer rounded-lg transition-colors ${
            theme === 'system' ? 'bg-muted text-foreground' : 'hover:bg-muted/50'
          }`}
        >
          <Monitor className="mr-2 h-4 w-4" />
          System
          {theme === 'system' && (
            <div className="ml-auto h-2 w-2 rounded-full bg-primary" />
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
