import React, { useState } from "react";
import { Zap, Plus, Edit, Trash2, Power, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { backend } from "@/api/backendClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import CreateTriggerDialog from "../triggers/CreateTriggerDialog";
import EditTriggerDialog from "../triggers/EditTriggerDialog";
import TriggerLogsDialog from "../triggers/TriggerLogsDialog";
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

export default function TriggersSection({ appId }) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [logsDialogOpen, setLogsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTrigger, setSelectedTrigger] = useState(null);
  const queryClient = useQueryClient();

  const { data: triggers = [], isLoading } = useQuery({
    queryKey: ['triggers', appId],
    queryFn: async () => {
      if (!appId) return [];
      return await backend.entities.Trigger.filter({ app_id: appId });
    },
    enabled: !!appId,
  });

  const { data: recentLogs = [] } = useQuery({
    queryKey: ['trigger-logs', appId],
    queryFn: async () => {
      if (!appId) return [];
      const logs = await backend.entities.TriggerLog.filter({ app_id: appId });
      return logs.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 10);
    },
    enabled: !!appId,
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }) => {
      await backend.entities.Trigger.update(id, { is_active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['triggers', appId] });
    },
  });

  const deleteTriggerMutation = useMutation({
    mutationFn: async (triggerId) => {
      await backend.entities.Trigger.delete(triggerId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['triggers', appId] });
      setDeleteDialogOpen(false);
      setSelectedTrigger(null);
    },
  });

  const handleEdit = (trigger) => {
    setSelectedTrigger(trigger);
    setEditDialogOpen(true);
  };

  const handleDelete = (trigger) => {
    setSelectedTrigger(trigger);
    setDeleteDialogOpen(true);
  };

  const handleViewLogs = (trigger) => {
    setSelectedTrigger(trigger);
    setLogsDialogOpen(true);
  };

  const getEventBadgeColor = (event) => {
    const colors = {
      create: "bg-green-500/20 border-green-500/40 text-green-900",
      update: "bg-blue-500/20 border-blue-500/40 text-blue-900",
      delete: "bg-red-500/20 border-red-500/40 text-red-900"
    };
    return colors[event] || "bg-gray-500/20 border-gray-500/40 text-gray-900";
  };

  const getActionBadgeColor = (action) => {
    const colors = {
      create: "bg-purple-500/20 border-purple-500/40 text-purple-900",
      update: "bg-cyan-500/20 border-cyan-500/40 text-cyan-900",
      delete: "bg-orange-500/20 border-orange-500/40 text-orange-900"
    };
    return colors[action] || "bg-gray-500/20 border-gray-500/40 text-gray-900";
  };

  const activeTriggers = triggers.filter(t => t.is_active).length;
  const totalExecutions = triggers.reduce((sum, t) => sum + (t.execution_count || 0), 0);
  const successRate = recentLogs.length > 0 
    ? ((recentLogs.filter(l => l.status === 'success').length / recentLogs.length) * 100).toFixed(1)
    : 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="backdrop-blur-xl bg-gradient-to-br from-white/30 to-white/10 border border-white/40 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                <Zap className="w-5 h-5 text-white" />
              </div>
              Triggers
            </h1>
            <p className="text-gray-800 font-medium">Automate data propagation between entities</p>
          </div>
          <Button 
            onClick={() => setCreateDialogOpen(true)}
            disabled={!appId}
            className="backdrop-blur-sm bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 shadow-xl"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Trigger
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      {triggers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="backdrop-blur-xl bg-gradient-to-br from-white/30 to-white/10 border border-white/40 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{activeTriggers}/{triggers.length}</div>
                <div className="text-sm text-gray-700">Active Triggers</div>
              </div>
            </div>
          </div>

          <div className="backdrop-blur-xl bg-gradient-to-br from-white/30 to-white/10 border border-white/40 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{totalExecutions.toLocaleString()}</div>
                <div className="text-sm text-gray-700">Total Executions</div>
              </div>
            </div>
          </div>

          <div className="backdrop-blur-xl bg-gradient-to-br from-white/30 to-white/10 border border-white/40 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{successRate}%</div>
                <div className="text-sm text-gray-700">Success Rate</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Triggers List */}
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
        ) : triggers.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
              <Zap className="w-12 h-12 text-purple-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No Triggers Yet</h3>
            <p className="text-gray-700 mb-6 max-w-md mx-auto">
              Create triggers to automatically propagate data changes between entities
            </p>
            <Button 
              onClick={() => setCreateDialogOpen(true)}
              disabled={!appId}
              className="backdrop-blur-sm bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 shadow-xl"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create First Trigger
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {triggers.map((trigger) => (
              <div
                key={trigger.id}
                className="backdrop-blur-sm bg-white/20 border border-white/30 rounded-xl p-6 hover:bg-white/30 transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="text-4xl">⚡</div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h3 className="text-xl font-bold text-gray-900">{trigger.name}</h3>
                      <Badge className={cn(
                        "backdrop-blur-sm border",
                        trigger.is_active
                          ? "bg-green-500/20 border-green-500/40 text-green-900"
                          : "bg-gray-500/20 border-gray-500/40 text-gray-900"
                      )}>
                        {trigger.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-4 flex-wrap text-sm">
                      <span className="text-gray-800 font-medium">{trigger.source_entity}</span>
                      <Badge className={cn("backdrop-blur-sm border", getEventBadgeColor(trigger.trigger_event))}>
                        {trigger.trigger_event}
                      </Badge>
                      <span className="text-gray-700">→</span>
                      <span className="text-gray-800 font-medium">{trigger.target_entity}</span>
                      <Badge className={cn("backdrop-blur-sm border", getActionBadgeColor(trigger.target_action))}>
                        {trigger.target_action}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-6 text-sm text-gray-700">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        <span>{trigger.execution_count || 0} executions</span>
                      </div>
                      {trigger.last_executed && (
                        <div className="flex items-center gap-2">
                          <span>Last: {new Date(trigger.last_executed).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewLogs(trigger)}
                      className="text-gray-800 hover:text-gray-900"
                      title="View Logs"
                    >
                      <TrendingUp className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleActiveMutation.mutate({ 
                        id: trigger.id, 
                        is_active: !trigger.is_active 
                      })}
                      className={cn(
                        "text-gray-800 hover:text-gray-900",
                        trigger.is_active && "text-green-600 hover:text-green-700"
                      )}
                      title={trigger.is_active ? 'Deactivate' : 'Activate'}
                    >
                      <Power className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(trigger)}
                      className="text-gray-800 hover:text-gray-900"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(trigger)}
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

      {/* Recent Activity */}
      {recentLogs.length > 0 && (
        <div className="backdrop-blur-xl bg-gradient-to-br from-white/30 to-white/10 border border-white/40 rounded-2xl p-6 shadow-2xl">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Recent Activity
          </h2>
          <div className="space-y-2">
            {recentLogs.slice(0, 5).map((log) => (
              <div
                key={log.id}
                className="backdrop-blur-sm bg-white/10 border border-white/20 rounded-lg p-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  {log.status === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600" />
                  )}
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {log.source_entity} → {log.target_entity}
                    </div>
                    <div className="text-xs text-gray-700">
                      {log.action} • {log.execution_time_ms}ms
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-600">
                  {new Date(log.created_date).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <CreateTriggerDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        appId={appId}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['triggers', appId] });
        }}
      />

      <EditTriggerDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        trigger={selectedTrigger}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['triggers', appId] });
          setSelectedTrigger(null);
        }}
      />

      <TriggerLogsDialog
        open={logsDialogOpen}
        onOpenChange={setLogsDialogOpen}
        trigger={selectedTrigger}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="backdrop-blur-xl bg-white/95 border-white/30">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Trigger</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedTrigger?.name}"? This action cannot be undone.
              All logs associated with this trigger will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTriggerMutation.mutate(selectedTrigger?.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Trigger
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}