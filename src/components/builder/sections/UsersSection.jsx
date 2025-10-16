import React, { useState, useEffect } from "react";
import { Users, UserPlus, Search, Shield, User, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { backend } from "@/api/backendClient";
import InviteUserDialog from "../InviteUserDialog";
import { useQuery } from "@tanstack/react-query";

export default function UsersSection({ appId }) {
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: users = [], isLoading, refetch } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const allUsers = await backend.entities.User.list();
      return allUsers;
    },
    initialData: [],
  });

  // Filter users based on search query
  const filteredUsers = users.filter(user => 
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Refetch users when dialog closes
  useEffect(() => {
    if (!inviteDialogOpen) {
      refetch();
    }
  }, [inviteDialogOpen]);

  return (
    <div className="space-y-6">
      <div className="backdrop-blur-xl bg-white/20 border border-white/30 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Users className="w-8 h-8" />
              Users Management
            </h1>
            <p className="text-gray-800 mt-2">Manage your app users and permissions</p>
          </div>
          <Button 
            onClick={() => setInviteDialogOpen(true)}
            className="backdrop-blur-sm bg-white/90 hover:bg-white text-purple-600 border border-white/50 shadow-xl"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Invite User
          </Button>
        </div>

        <div className="backdrop-blur-sm bg-white/20 border border-white/30 rounded-xl p-3 mb-6">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-gray-700" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none text-gray-900 placeholder-gray-600 focus-visible:ring-0"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="backdrop-blur-sm bg-white/10 border border-white/20 rounded-xl p-4 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-white/20" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-white/20 rounded w-1/3" />
                    <div className="h-3 bg-white/20 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="backdrop-blur-sm bg-white/10 border border-white/20 rounded-xl p-12 text-center">
            <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {searchQuery ? 'No users found' : 'No users yet'}
            </h3>
            <p className="text-gray-700 mb-6">
              {searchQuery 
                ? 'Try adjusting your search query' 
                : 'Invite users to get started with your app'}
            </p>
            {!searchQuery && (
              <Button 
                onClick={() => setInviteDialogOpen(true)}
                className="backdrop-blur-sm bg-white/90 hover:bg-white text-purple-600 border border-white/50"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Invite First User
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map((user) => {
              const initials = user.full_name 
                ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                : user.email[0].toUpperCase();
              
              return (
                <div key={user.id} className="backdrop-blur-sm bg-white/10 border border-white/20 rounded-xl p-4 hover:bg-white/20 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold border border-white/30">
                        {initials}
                      </div>
                      <div>
                        <div className="text-gray-900 font-medium flex items-center gap-2">
                          {user.full_name || 'No name'}
                          {user.role === 'admin' && (
                            <Shield className="w-4 h-4 text-purple-600" />
                          )}
                        </div>
                        <div className="text-gray-700 text-sm flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {user.email}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`backdrop-blur-sm border px-3 py-1 rounded-lg text-sm font-medium ${
                        user.role === 'admin'
                          ? 'bg-purple-500/20 border-purple-500/40 text-purple-900'
                          : 'bg-white/20 border-white/30 text-gray-900'
                      }`}>
                        {user.role === 'admin' ? 'Admin' : 'User'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <InviteUserDialog 
        open={inviteDialogOpen} 
        onOpenChange={setInviteDialogOpen}
      />
    </div>
  );
}