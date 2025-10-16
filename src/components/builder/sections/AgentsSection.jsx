import React, { useState } from "react";
import { Bot, Plus, MessageSquare, Edit, Trash2, Power, Smartphone, TrendingUp, Settings as SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import CreateAgentDialog from "../agents/CreateAgentDialog";
import EditAgentDialog from "../agents/EditAgentDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function AgentsSection({ appId }) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const queryClient = useQueryClient();

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ['agents', appId],
    queryFn: async () => {
      if (!appId) return [];
      return await base44.entities.Agent.filter({ app_id: appId });
    },
    enabled: !!appId,
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }) => {
      await base44.entities.Agent.update(id, { is_active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents', appId] });
    },
  });

  const deleteAgentMutation = useMutation({
    mutationFn: async (agentId) => {
      await base44.entities.Agent.delete(agentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents', appId] });
      setDeleteDialogOpen(false);
      setSelectedAgent(null);
    },
  });

  const handleEdit = (agent) => {
    setSelectedAgent(agent);
    setEditDialogOpen(true);
  };

  const handleDelete = (agent) => {
    setSelectedAgent(agent);
    setDeleteDialogOpen(true);
  };

  const getAgentIcon = (name) => {
    const icons = {
      'customer': '🤝',
      'support': '💬',
      'sales': '💰',
      'assistant': '🤖',
      'task': '✓',
      'data': '📊'
    };
    
    const key = Object.keys(icons).find(k => name.toLowerCase().includes(k));
    return icons[key] || '🤖';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="backdrop-blur-xl bg-gradient-to-br from-white/30 to-white/10 border border-white/40 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                <Bot className="w-5 h-5 text-white" />
              </div>
              AI Agents
            </h1>
            <p className="text-gray-800 font-medium">Create and manage intelligent AI agents for your app</p>
          </div>
          <Button 
            onClick={() => setCreateDialogOpen(true)}
            disabled={!appId}
            className="backdrop-blur-sm bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 shadow-xl"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Agent
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      {agents.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="backdrop-blur-xl bg-gradient-to-br from-white/30 to-white/10 border border-white/40 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{agents.length}</div>
                <div className="text-sm text-gray-700">Total Agents</div>
              </div>
            </div>
          </div>

          <div className="backdrop-blur-xl bg-gradient-to-br from-white/30 to-white/10 border border-white/40 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                <Power className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {agents.filter(a => a.is_active).length}
                </div>
                <div className="text-sm text-gray-700">Active Agents</div>
              </div>
            </div>
          </div>

          <div className="backdrop-blur-xl bg-gradient-to-br from-white/30 to-white/10 border border-white/40 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {agents.reduce((sum, a) => sum + (a.total_conversations || 0), 0)}
                </div>
                <div className="text-sm text-gray-700">Total Conversations</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Agents List */}
      <div className="backdrop-blur-xl bg-gradient-to-br from-white/30 to-white/10 border border-white/40 rounded-2xl p-6 shadow-2xl">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="backdrop-blur-sm bg-white/20 border border-white/30 rounded-xl p-6 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white/20 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="h-6 bg-white/20 rounded w-1/3" />
                    <div className="h-4 bg-white/20 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : agents.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
              <Bot className="w-12 h-12 text-purple-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No Agents Yet</h3>
            <p className="text-gray-700 mb-6 max-w-md mx-auto">
              Create your first AI agent to automate tasks, provide support, or enhance your app with intelligent features
            </p>
            <Button 
              onClick={() => setCreateDialogOpen(true)}
              disabled={!appId}
              className="backdrop-blur-sm bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 shadow-xl"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create First Agent
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="backdrop-blur-sm bg-white/20 border border-white/30 rounded-xl p-6 hover:bg-white/30 transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="text-5xl">{getAgentIcon(agent.name)}</div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-bold text-gray-900">{agent.name}</h3>
                      <Badge className={cn(
                        "backdrop-blur-sm border",
                        agent.is_active
                          ? "bg-green-500/20 border-green-500/40 text-green-900"
                          : "bg-gray-500/20 border-gray-500/40 text-gray-900"
                      )}>
                        {agent.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      {agent.whatsapp_enabled && (
                        <Badge className="backdrop-blur-sm bg-green-500/20 border-green-500/40 text-green-900">
                          <Smartphone className="w-3 h-3 mr-1" />
                          WhatsApp
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-gray-700 mb-4">{agent.description}</p>
                    
                    <div className="flex items-center gap-6 text-sm text-gray-700">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        <span>{agent.total_conversations || 0} conversations</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        <span>{agent.total_messages || 0} messages</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <SettingsIcon className="w-4 h-4" />
                        <span>{agent.model}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleActiveMutation.mutate({ 
                        id: agent.id, 
                        is_active: !agent.is_active 
                      })}
                      className={cn(
                        "text-gray-800 hover:text-gray-900",
                        agent.is_active && "text-green-600 hover:text-green-700"
                      )}
                      title={agent.is_active ? 'Deactivate' : 'Activate'}
                    >
                      <Power className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(agent)}
                      className="text-gray-800 hover:text-gray-900"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(agent)}
                      className="text-red-600 hover:text-red-700"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CreateAgentDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        appId={appId}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['agents', appId] });
        }}
      />

      <EditAgentDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        agent={selectedAgent}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['agents', appId] });
          setSelectedAgent(null);
        }}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="backdrop-blur-xl bg-white/95 border-white/30">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Agent</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedAgent?.name}"? This action cannot be undone.
              All conversations and data associated with this agent will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteAgentMutation.mutate(selectedAgent?.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Agent
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}