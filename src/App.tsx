import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ThemeInitializer } from "@/components/theme/ThemeInitializer";
import { BlockGuard } from "@/components/BlockGuard";
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';
import { NotificationPermissionPrompt } from '@/components/NotificationPermissionPrompt';
import { BottomNavbar } from "@/components/BottomNavbar";

// Create future flags for React Router v7 compatibility
const routerFuture = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
};

// Lazy load components for better performance
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Feed = lazy(() => import("./pages/Feed"));
const Profile = lazy(() => import("./pages/Profile"));
const CreatePost = lazy(() => import("./pages/CreatePost"));
const PostDetail = lazy(() => import("./pages/PostDetail"));
const MyPosts = lazy(() => import("./pages/MyPosts"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Bookmarks = lazy(() => import("./pages/Bookmarks"));
const AuthorProfile = lazy(() => import("./pages/AuthorProfile"));
const GoogleProfile = lazy(() => import("./pages/GoogleProfile"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Notifications = lazy(() => import("./pages/Notifications"));

// Lazy load Analytics with longer delay to prevent initial load bottleneck
const LazyAnalytics = lazy(() => import("./pages/Analytics"));

// Create QueryClient with optimized cache settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000, // 2 minutes - reduced from 5 minutes
      gcTime: 5 * 60 * 1000, // 5 minutes - reduced from 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      // Clear cache if it's too old to prevent slow loads
      structuralSharing: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Clear old React Query cache on app start if needed
if (typeof window !== 'undefined') {
  const cacheTimestamp = localStorage.getItem('query_cache_timestamp');
  const now = Date.now();
  const CACHE_MAX_AGE = 30 * 60 * 1000; // 30 minutes
  
  if (cacheTimestamp) {
    const cacheAge = now - parseInt(cacheTimestamp);
    if (cacheAge > CACHE_MAX_AGE) {
      // Clear React Query cache if it's older than 30 minutes
      queryClient.clear();
      localStorage.removeItem('query_cache_timestamp');
    }
  }
  
  // Update cache timestamp
  localStorage.setItem('query_cache_timestamp', now.toString());
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <ThemeInitializer>
        <BrowserRouter future={routerFuture}>
          <TooltipProvider>
            <AuthProvider>
              <BlockGuard>
                <Suspense fallback={
                  <div className="min-h-screen flex items-center justify-center bg-background">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                }>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/feed" element={<Feed />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/create" element={<CreatePost />} />
                    <Route path="/post/*" element={<PostDetail />} />
                    <Route path="/post/:slug" element={<PostDetail />} />
                    <Route path="/my-posts" element={<MyPosts />} />
                    <Route path="/analytics" element={<LazyAnalytics />} />
                    <Route path="/bookmarks" element={<Bookmarks />} />
                    <Route path="/author/:username" element={<AuthorProfile />} />
                    <Route path="/google-profile" element={<GoogleProfile />} />
                    <Route path="/notifications" element={<Notifications />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
                <BottomNavbar />
              </BlockGuard>
            </AuthProvider>
            <PWAInstallPrompt />
            <NotificationPermissionPrompt />
          </TooltipProvider>
        </BrowserRouter>
        <Toaster />
        <Sonner />
      </ThemeInitializer>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;