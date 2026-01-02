import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Sparkles, Users, TrendingUp } from "lucide-react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { SuggestedAuthors } from "@/components/social/SuggestedAuthors";
import { TrendingPosts } from "@/components/social/TrendingPosts";
import { PersonalizedFeed } from "@/components/feed/PersonalizedFeed";
import { DiscoverFeed } from "@/components/feed/DiscoverFeed";
import { Header } from "@/components/layout/Header";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const Feed = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const searchQuery = searchParams.get("search") || "";
  const [activeTab, setActiveTab] = useState<string>("discover");

  // Handle tab parameter from URL
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['discover', 'following', 'trending'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Handle tab change with URL update
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('tab', value);
    navigate(`/feed?${newSearchParams.toString()}`, { replace: true });
  };

  // Handle OAuth callback from Google login
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const hasCode = urlParams.get('code') || urlParams.get('access_token');

    // Debug OAuth callback
    console.log('Feed OAuth callback check:', {
      hasCode,
      user: !!user,
      urlParams: Object.fromEntries(urlParams.entries())
    });

    // If user arrives from OAuth callback and is authenticated, clear URL parameters
    if (hasCode && user) {
      console.log('OAuth callback successful in Feed - clearing URL parameters');
      // Clear the URL parameters to prevent issues with future navigation
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [user]);

  // Loading Skeleton used for initial page load only if absolutely necessary
  // Removed the early return to keep tabs persistent during data fetch

  return (
    <div className="min-h-screen bg-background dark:bg-slate-900 font-sans selection:bg-accent/20 dark:selection:bg-blue-900/20">
      {/* Background Dot Pattern */}
      <div
        className="fixed inset-0 z-0 pointer-events-none dark:opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(hsl(var(--muted-foreground) / 0.3) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      ></div>

      <div className="relative z-10">
        <main className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            {/* Page Header with Tabs */}

            <Header className="hidden md:block" />
            <div className="mb-10 sticky top-0 md:top-[6.5rem] z-30 bg-background/80 backdrop-blur-md pt-4 pb-2">
              <Tabs
                value={activeTab}
                onValueChange={handleTabChange}
                className="w-full"
              >
                <TabsList className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-1 w-full">
                  <div className="flex justify-center w-full">
                    <div className="flex gap-1 w-full max-w-2xl">
                      <TabsTrigger
                        value="discover"
                        className="rounded-xl data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-900/20 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 px-2 py-2 text-xs sm:px-3 sm:py-2 sm:text-sm flex-1 min-w-0"
                      >
                        <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
                        <span className="truncate">For You</span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="following"
                        className="rounded-xl data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-900/20 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 px-2 py-2 text-xs sm:px-3 sm:py-2 sm:text-sm flex-1 min-w-0"
                      >
                        <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
                        <span className="truncate">Following</span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="trending"
                        className="rounded-xl data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-900/20 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 px-2 py-2 text-xs sm:px-3 sm:py-2 sm:text-sm flex-1 min-w-0"
                      >
                        <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
                        <span className="truncate">Trending</span>
                      </TabsTrigger>
                    </div>
                  </div>
                </TabsList>
              </Tabs>
            </div>

            {/* Main Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
              {/* Main Feed Column */}
              <div>
                {activeTab === "following" ? (
                  <PersonalizedFeed />
                ) : activeTab === "trending" ? (
                  <div className="space-y-6">
                    <TrendingPosts />
                  </div>
                ) : (
                  <>
                    {searchQuery && (
                      <div className="mb-8 flex items-center gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-sm text-slate-600 dark:text-slate-400">
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                          <Search size={16} />
                        </div>
                        <p>
                          Results for:{" "}
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            {searchQuery}
                          </span>
                        </p>
                      </div>
                    )}
                    <DiscoverFeed searchQuery={searchQuery} />
                  </>
                )}
              </div>

              {/* Sidebar */}
              <aside className="hidden lg:block space-y-6 sticky top-20 self-start">
                <TrendingPosts />
                <SuggestedAuthors />
              </aside>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Feed;
