import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { FollowButton } from './FollowButton';
import { Link } from 'react-router-dom';
import { Users, Loader2, Search, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { UserBadge } from '@/components/UserBadge';

export const AllAuthors = ({ showSearch = true }: { showSearch?: boolean }) => {
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');

    const { data: authors, isLoading } = useQuery({
        queryKey: ['all-authors'],
        queryFn: async () => {
            // Get all profiles with counts
            const { data: profiles, error } = await supabase
                .from('profiles')
                .select(`
          id, 
          full_name, 
          profile_image_url, 
          bio,
          badge,
          followers:followers!following_id(count),
          posts:posts(count)
        `)
                .order('full_name');

            if (error) throw error;
            return profiles || [];
        },
        staleTime: 5 * 60 * 1000,
    });

    const filteredAuthors = authors?.filter(author =>
        author.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        author.bio?.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                    <Card key={i} className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm animate-pulse">
                        <div className="flex items-center gap-4">
                            <div className="h-16 w-16 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
                            <div className="flex-1 space-y-2">
                                <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded"></div>
                                <div className="h-3 w-32 bg-slate-200 dark:bg-slate-800 rounded"></div>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Search Bar for Authors */}
            {showSearch && (
                <div className="relative max-w-md mx-auto md:mx-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search authors by name or bio..."
                        className="pl-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl h-12 focus-visible:ring-blue-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            )}

            {filteredAuthors.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 border-dashed">
                    <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300 dark:text-slate-500">
                        <Users className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">No authors found</h3>
                    <p className="text-slate-500 dark:text-slate-400">Try a different search term.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredAuthors.map((author) => (
                        <Card key={author.id} className="group p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:shadow-blue-900/5 hover:border-blue-100 dark:hover:border-blue-900/50 transition-all duration-300">
                            <div className="flex items-start gap-4">
                                <Link to={`/author/${author.id}`} className="shrink-0 relative">
                                    <Avatar className="h-16 w-16 border-2 border-white dark:border-slate-900 shadow-md group-hover:ring-4 group-hover:ring-blue-100 dark:group-hover:ring-blue-900/20 transition-all duration-300">
                                        <AvatarImage src={author.profile_image_url || ''} />
                                        <AvatarFallback className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-slate-800 dark:to-slate-700 text-blue-600 dark:text-blue-400 font-bold text-xl">
                                            {author.full_name?.[0]?.toUpperCase() || 'U'}
                                        </AvatarFallback>
                                    </Avatar>
                                    {/* Status Indicator or Badge could go here */}
                                </Link>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                            <Link to={`/author/${author.id}`} className="block group/name">
                                                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg truncate group-hover/name:text-blue-600 dark:group-hover/name:text-blue-400 transition-colors flex items-center gap-2">
                                                    {author.full_name}
                                                    <UserBadge userId={author.id} />
                                                </h3>
                                            </Link>
                                            <div className="flex items-center gap-3 mt-1">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                                        {author.followers?.[0]?.count || 0}
                                                    </span>
                                                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Followers</span>
                                                </div>
                                                <div className="w-px h-6 bg-slate-100 dark:bg-slate-800" />
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                                        {author.posts?.[0]?.count || 0}
                                                    </span>
                                                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Posts</span>
                                                </div>
                                            </div>
                                        </div>
                                        <FollowButton userId={author.id} size="sm" className="rounded-xl shadow-sm" />
                                    </div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mt-3">
                                        {author.bio || "No bio yet."}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-800/50">
                                <Link
                                    to={`/author/${author.id}`}
                                    className="flex items-center justify-center w-full px-4 py-2.5 text-sm font-semibold text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all"
                                >
                                    View Full Profile
                                </Link>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};
