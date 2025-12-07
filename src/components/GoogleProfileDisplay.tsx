import React from 'react';
import { User } from '@supabase/supabase-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Mail, Calendar, Shield, User as UserIcon, Globe, Phone, MapPin, Cake, Users } from 'lucide-react';

interface GoogleProfileDisplayProps {
  user: User;
}

export const GoogleProfileDisplay: React.FC<GoogleProfileDisplayProps> = ({ user }) => {
  const userMetadata = user.user_metadata;
  const identities = user.identities?.[0];
  
  return (
    <Card className="w-full max-w-4xl mx-auto bg-white shadow-lg border-slate-200">
      <CardHeader className="text-center pb-4">
        <div className="flex flex-col items-center space-y-4">
          <Avatar className="w-24 h-24 ring-4 ring-slate-100">
            <AvatarImage 
              src={userMetadata?.avatar_url || userMetadata?.picture} 
              alt={userMetadata?.full_name || userMetadata?.name || 'User avatar'} 
            />
            <AvatarFallback className="text-2xl bg-slate-100">
              {userMetadata?.full_name?.[0] || userMetadata?.name?.[0] || user.email?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="space-y-2">
            <CardTitle className="text-2xl font-bold text-slate-900">
              {userMetadata?.full_name || userMetadata?.name || 'Google User'}
            </CardTitle>
            <CardDescription className="text-slate-500">
              {user.email}
            </CardDescription>
            <div className="flex gap-2 justify-center">
              <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                <Shield className="w-3 h-3 mr-1" />
                Verified Google Account
              </Badge>
              {userMetadata?.verified && (
                <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
                  <Shield className="w-3 h-3 mr-1" />
                  Email Verified
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-slate-500" />
            Basic Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <UserIcon className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-sm text-slate-500">Full Name</p>
                <p className="text-sm font-medium text-slate-900">
                  {userMetadata?.full_name || userMetadata?.name || 'Not provided'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <Mail className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-sm text-slate-500">Email</p>
                <p className="text-sm font-medium text-slate-900">{user.email}</p>
              </div>
            </div>
            
            {userMetadata?.phone && (
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <Phone className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-sm text-slate-500">Phone</p>
                  <p className="text-sm font-medium text-slate-900">{userMetadata.phone}</p>
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <Calendar className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-sm text-slate-500">Joined</p>
                <p className="text-sm font-medium text-slate-900">
                  {new Date(user.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Personal Details */}
        {(userMetadata?.age || userMetadata?.gender || userMetadata?.bio) && (
          <>
            <Separator />
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-slate-500" />
                Personal Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {userMetadata?.age && (
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <Cake className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-sm text-slate-500">Age</p>
                      <p className="text-sm font-medium text-slate-900">{userMetadata.age} years old</p>
                    </div>
                  </div>
                )}
                
                {userMetadata?.gender && (
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <Users className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-sm text-slate-500">Gender</p>
                      <p className="text-sm font-medium text-slate-900 capitalize">{userMetadata.gender}</p>
                    </div>
                  </div>
                )}
              </div>
              
              {userMetadata?.bio && (
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-500 mb-2">Bio</p>
                  <p className="text-sm font-medium text-slate-900">{userMetadata.bio}</p>
                </div>
              )}
            </div>
          </>
        )}

        <Separator />

        {/* Google Account Information */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Globe className="w-5 h-5 text-slate-500" />
            Google Account Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <Globe className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-sm text-slate-500">Provider</p>
                <p className="text-sm font-medium text-slate-900 capitalize">
                  {identities?.provider || 'google'}
                </p>
              </div>
            </div>
            
            {userMetadata?.locale && (
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <Globe className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-sm text-slate-500">Locale</p>
                  <p className="text-sm font-medium text-slate-900">{userMetadata.locale}</p>
                </div>
              </div>
            )}
            
            {userMetadata?.hd && (
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <Globe className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-sm text-slate-500">Google Domain</p>
                  <p className="text-sm font-medium text-slate-900">{userMetadata.hd}</p>
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <Shield className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-sm text-slate-500">Email Verified</p>
                <p className="text-sm font-medium text-slate-900">
                  {user.email_confirmed_at ? 'Yes' : 'No'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Name Breakdown */}
        {(userMetadata?.given_name || userMetadata?.family_name) && (
          <>
            <Separator />
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-slate-900">Name Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {userMetadata?.given_name && (
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <UserIcon className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-sm text-slate-500">First Name</p>
                      <p className="text-sm font-medium text-slate-900">{userMetadata.given_name}</p>
                    </div>
                  </div>
                )}
                
                {userMetadata?.family_name && (
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <UserIcon className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-sm text-slate-500">Last Name</p>
                      <p className="text-sm font-medium text-slate-900">{userMetadata.family_name}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Raw Data Toggle */}
        <details className="mt-6">
          <summary className="cursor-pointer text-sm text-slate-500 hover:text-slate-700">
            View Raw User Data
          </summary>
          <pre className="mt-2 p-4 bg-slate-900 text-slate-100 rounded-lg text-xs overflow-x-auto">
            {JSON.stringify(user, null, 2)}
          </pre>
        </details>
      </CardContent>
    </Card>
  );
};
