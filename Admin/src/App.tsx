import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { AdminAuthProvider } from "@/contexts/AdminAuthContext";
import { AuthGuard } from "@/components/AuthGuard";
import ErrorBoundary from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import SignInPage from "./pages/SignInPage";
import SignUpPage from "./pages/SignUpPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import PostsPage from "./pages/PostsPage";
import CategoriesPage from "./pages/CategoriesPage";
import TagsPage from "./pages/TagsPage";
import ProfilesPage from "./pages/ProfilesPage";
import CommentsPage from "./pages/CommentsPage";
import LikesPage from "./pages/LikesPage";
import CommentLikesPage from "./pages/CommentLikesPage";
import BookmarksPage from "./pages/BookmarksPage";
import FollowersPage from "./pages/FollowersPage";
import NotificationsPage from "./pages/NotificationsPage";
import PostImagesPage from "./pages/PostImagesPage";
import PostTagsPage from "./pages/PostTagsPage";
import SearchPage from "./pages/SearchPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <ThemeProvider defaultTheme="system" storageKey="admin-theme">
      <AuthProvider>
        <AdminAuthProvider>
          <QueryClientProvider client={queryClient}>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  <Route path="/signin" element={<SignInPage />} />
                  <Route path="/signup" element={<SignUpPage />} />
                  <Route 
                    path="/*" 
                    element={
                      <AuthGuard>
                        <Routes>
                          <Route path="/" element={<Index />} />
                          <Route path="/posts" element={<PostsPage />} />
                          <Route path="/categories" element={<CategoriesPage />} />
                          <Route path="/tags" element={<TagsPage />} />
                          <Route path="/profiles" element={<ProfilesPage />} />
                          <Route path="/comments" element={<CommentsPage />} />
                          <Route path="/likes" element={<LikesPage />} />
                          <Route path="/comment-likes" element={<CommentLikesPage />} />
                          <Route path="/bookmarks" element={<BookmarksPage />} />
                          <Route path="/followers" element={<FollowersPage />} />
                          <Route path="/notifications" element={<NotificationsPage />} />
                          <Route path="/post-images" element={<PostImagesPage />} />
                          <Route path="/post-tags" element={<PostTagsPage />} />
                          <Route path="/search" element={<SearchPage />} />
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </AuthGuard>
                    } 
                  />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </QueryClientProvider>
        </AdminAuthProvider>
      </AuthProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

export default App;
