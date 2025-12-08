import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  FileText, 
  Users, 
  MessageSquare, 
  Calendar, 
  Eye, 
  Heart, 
  Bookmark,
  ExternalLink,
  Filter,
  Download,
  RefreshCw
} from "lucide-react";
import { useSearchParams } from "react-router-dom";

interface SearchResult {
  id: string;
  type: 'post' | 'user' | 'comment';
  displayText: string;
  subtitle: string;
  data: any;
}

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [filters, setFilters] = useState({
    posts: true,
    users: true,
    comments: true
  });

  // Perform comprehensive search
  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const supabaseClient = supabase as any;
      const results: SearchResult[] = [];

      // Search posts with detailed info
      if (filters.posts) {
        const { data: posts } = await supabaseClient
          .from('posts')
          .select(`
            id, 
            title, 
            slug, 
            content, 
            created_at, 
            updated_at, 
            status,
            view_count,
            profiles!posts_author_id_fkey (
              id, 
              full_name, 
              email, 
              profile_image_url
            )
          `)
          .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
          .order('created_at', { ascending: false })
          .limit(50);

        if (posts) {
          results.push(...posts.map(post => ({
            id: post.id,
            type: 'post' as const,
            displayText: post.title,
            subtitle: `By ${post.profiles?.full_name || 'Unknown'} • ${new Date(post.created_at).toLocaleDateString()}`,
            data: post
          })));
        }
      }

      // Search users with detailed info
      if (filters.users) {
        const { data: users } = await supabaseClient
          .from('profiles')
          .select(`
            id, 
            full_name, 
            email, 
            bio, 
            created_at, 
            updated_at,
            profile_image_url,
            phone,
            gender,
            age
          `)
          .or(`full_name.ilike.%${query}%,email.ilike.%${query}%,bio.ilike.%${query}%`)
          .order('created_at', { ascending: false })
          .limit(50);

        if (users) {
          results.push(...users.map(user => ({
            id: user.id,
            type: 'user' as const,
            displayText: user.full_name || user.email,
            subtitle: `User • ${new Date(user.created_at).toLocaleDateString()}`,
            data: user
          })));
        }
      }

      // Search comments with detailed info
      if (filters.comments) {
        const { data: comments } = await supabaseClient
          .from('comments')
          .select(`
            id, 
            content, 
            created_at, 
            updated_at,
            posts!comments_post_id_fkey (
              id, 
              title, 
              slug
            ),
            profiles!comments_user_id_fkey (
              id, 
              full_name, 
              email
            )
          `)
          .ilike('content', `%${query}%`)
          .order('created_at', { ascending: false })
          .limit(50);

        if (comments) {
          results.push(...comments.map(comment => ({
            id: comment.id,
            type: 'comment' as const,
            displayText: comment.content.substring(0, 100) + '...',
            subtitle: `Comment by ${comment.profiles?.full_name || 'Unknown'} on "${comment.posts?.title || 'Unknown Post'}" • ${new Date(comment.created_at).toLocaleDateString()}`,
            data: comment
          })));
        }
      }

      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  // Initial search and debounced search
  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery);
    }
  }, [initialQuery]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery) {
        setSearchParams({ q: searchQuery });
        performSearch(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, filters]);

  // Filter results by type
  const filteredResults = searchResults.filter(result => {
    if (activeTab === 'all') return true;
    return result.type === activeTab;
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      performSearch(searchQuery);
    }
  };

  const exportResults = () => {
    const csvContent = [
      ['Type', 'ID', 'Title/Name', 'Date', 'Details'],
      ...searchResults.map(result => [
        result.type,
        result.id,
        result.displayText,
        new Date(result.data.created_at).toLocaleDateString(),
        result.subtitle
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `search-results-${searchQuery}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout title="Search Results">
      <div className="space-y-6">
        {/* Search Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <form onSubmit={handleSearch} className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search posts, users, comments..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 text-lg"
                  />
                </div>
              </form>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => performSearch(searchQuery)}
                  disabled={isSearching}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isSearching ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button
                  variant="outline"
                  onClick={exportResults}
                  disabled={searchResults.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 mt-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filters:</span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.posts}
                  onChange={(e) => setFilters(prev => ({ ...prev, posts: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm">Posts</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.users}
                  onChange={(e) => setFilters(prev => ({ ...prev, users: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm">Users</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.comments}
                  onChange={(e) => setFilters(prev => ({ ...prev, comments: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm">Comments</span>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Results Summary */}
        {searchQuery && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">
                    {searchResults.length} results found for "{searchQuery}"
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {searchResults.filter(r => r.type === 'post').length} posts, 
                    {searchResults.filter(r => r.type === 'user').length} users, 
                    {searchResults.filter(r => r.type === 'comment').length} comments
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="cursor-pointer" onClick={() => setActiveTab('all')}>
                    All ({searchResults.length})
                  </Badge>
                  <Badge variant="outline" className="cursor-pointer" onClick={() => setActiveTab('post')}>
                    Posts ({searchResults.filter(r => r.type === 'post').length})
                  </Badge>
                  <Badge variant="outline" className="cursor-pointer" onClick={() => setActiveTab('user')}>
                    Users ({searchResults.filter(r => r.type === 'user').length})
                  </Badge>
                  <Badge variant="outline" className="cursor-pointer" onClick={() => setActiveTab('comment')}>
                    Comments ({searchResults.filter(r => r.type === 'comment').length})
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search Results */}
        <div className="space-y-4">
          {isSearching ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Searching...</p>
              </CardContent>
            </Card>
          ) : filteredResults.length === 0 && searchQuery ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Search className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No results found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search terms or filters
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredResults.map((result) => (
              <Card key={`${result.type}-${result.id}`} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-muted rounded-lg">
                      {result.type === 'post' && <FileText className="h-6 w-6 text-blue-500" />}
                      {result.type === 'user' && <Users className="h-6 w-6 text-green-500" />}
                      {result.type === 'comment' && <MessageSquare className="h-6 w-6 text-purple-500" />}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-lg mb-1">{result.displayText}</h3>
                          <p className="text-sm text-muted-foreground mb-3">{result.subtitle}</p>
                        </div>
                        <Badge variant="secondary" className="capitalize">
                          {result.type}
                        </Badge>
                      </div>

                      {/* Detailed Content Based on Type */}
                      {result.type === 'post' && (
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {result.data.content?.substring(0, 200)}...
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {result.data.view_count || 0} views
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Created {new Date(result.data.created_at).toLocaleDateString()}
                            </div>
                            <Badge variant={result.data.status === 'published' ? 'default' : 'secondary'}>
                              {result.data.status}
                            </Badge>
                          </div>
                        </div>
                      )}

                      {result.type === 'user' && (
                        <div className="space-y-2">
                          {result.data.bio && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {result.data.bio}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Email: {result.data.email}</span>
                            {result.data.phone && <span>Phone: {result.data.phone}</span>}
                            {result.data.gender && <span>Gender: {result.data.gender}</span>}
                            {result.data.age && <span>Age: {result.data.age}</span>}
                          </div>
                        </div>
                      )}

                      {result.type === 'comment' && (
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">
                            {result.data.content}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>On post: "{result.data.posts?.title}"</span>
                            <ExternalLink className="h-3 w-3" />
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-2 mt-4">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                        <Button variant="outline" size="sm">
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Open
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
