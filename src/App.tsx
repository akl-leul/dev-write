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
import { PageLoader } from "@/components/ui/page-loader";

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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter future={routerFuture}>
      <ThemeProvider>
        <ThemeInitializer>
          <TooltipProvider>
            <AuthProvider>
              <BlockGuard>
                <Suspense fallback={<PageLoader />}>
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
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/bookmarks" element={<Bookmarks />} />
                    <Route path="/author/:username" element={<AuthorProfile />} />
                    <Route path="/google-profile" element={<GoogleProfile />} />
                    <Route path="/notifications" element={<Notifications />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </BlockGuard>
            </AuthProvider>
          </TooltipProvider>
        </ThemeInitializer>
      </ThemeProvider>
    </BrowserRouter>
    <Toaster />
    <Sonner />
  </QueryClientProvider>
);

export default App;
