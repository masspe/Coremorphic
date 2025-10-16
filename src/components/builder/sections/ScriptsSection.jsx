import React, { useState } from "react";
import { FileCode, Plus, Play, Edit, Trash2, Clock, CheckCircle2, AlertCircle, Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import CreateScriptDialog from "../scripts/CreateScriptDialog";
import EditScriptDialog from "../scripts/EditScriptDialog";
import ExecuteScriptDialog from "../scripts/ExecuteScriptDialog";
import ScriptLogsDialog from "../scripts/ScriptLogsDialog";
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

export default function ScriptsSection({ appId }) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [executeDialogOpen, setExecuteDialogOpen] = useState(false);
  const [logsDialogOpen, setLogsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedScript, setSelectedScript] = useState(null);
  const queryClient = useQueryClient();

  const { data: scripts = [], isLoading } = useQuery({
    queryKey: ['custom-scripts', appId],
    queryFn: async () => {
      if (!appId) return [];
      return await base44.entities.CustomScript.filter({ app_id: appId });
    },
    enabled: !!appId,
  });

  const { data: recentExecutions = [] } = useQuery({
    queryKey: ['script-executions', appId],
    queryFn: async () => {
      if (!appId) return [];
      const executions = await base44.entities.ScriptExecution.filter({ app_id: appId });
      return executions.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 10);
    },
    enabled: !!appId,
  });

  const deleteScriptMutation = useMutation({
    mutationFn: async (scriptId) => {
      await base44.entities.CustomScript.delete(scriptId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-scripts', appId] });
      setDeleteDialogOpen(false);
      setSelectedScript(null);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }) => {
      await base44.entities.CustomScript.update(id, { is_active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-scripts', appId] });
    },
  });

  const handleEdit = (script) => {
    setSelectedScript(script);
    setEditDialogOpen(true);
  };

  const handleExecute = (script) => {
    setSelectedScript(script);
    setExecuteDialogOpen(true);
  };

  const handleViewLogs = (script) => {
    setSelectedScript(script);
    setLogsDialogOpen(true);
  };

  const handleDelete = (script) => {
    setSelectedScript(script);
    setDeleteDialogOpen(true);
  };

  const getScriptIcon = (type) => {
    const icons = {
      python: "🐍",
      powershell: "⚡",
      bash: "🔧",
      javascript: "📜"
    };
    return icons[type] || "📄";
  };

  const getScriptColor = (type) => {
    const colors = {
      python: "from-blue-500 to-cyan-500",
      powershell: "from-blue-600 to-indigo-600",
      bash: "from-green-500 to-emerald-500",
      javascript: "from-yellow-500 to-orange-500"
    };
    return colors[type] || "from-gray-500 to-gray-600";
  };

  const activeScripts = scripts.filter(s => s.is_active).length;
  const totalExecutions = scripts.reduce((sum, s) => sum + (s.execution_count || 0), 0);
  const successRate = recentExecutions.length > 0
    ? ((recentExecutions.filter(e => e.status === 'success').length / recentExecutions.length) * 100).toFixed(1)
    : 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="backdrop-blur-xl bg-gradient-to-br from-white/30 to-white/10 border border-white/40 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                <FileCode className="w-5 h-5 text-white" />
              </div>
              Custom Scripts
            </h1>
            <p className="text-gray-800 font-medium">Execute Python, PowerShell, and other scripts</p>
          </div>
          <Button 
            onClick={() => setCreateDialogOpen(true)}
            disabled={!appId}
            className="backdrop-blur-sm bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 shadow-xl"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Script
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      {scripts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="backdrop-blur-xl bg-gradient-to-br from-white/30 to-white/10 border border-white/40 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <FileCode className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{activeScripts}/{scripts.length}</div>
                <div className="text-sm text-gray-700">Active Scripts</div>
              </div>
            </div>
          </div>

          <div className="backdrop-blur-xl bg-gradient-to-br from-white/30 to-white/10 border border-white/40 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                <Play className="w-5 h-5 text-white" />
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

      {/* Scripts List */}
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
        ) : scripts.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
              <FileCode className="w-12 h-12 text-purple-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No Scripts Yet</h3>
            <p className="text-gray-700 mb-6 max-w-md mx-auto">
              Create custom scripts to extend your app with Python, PowerShell, or other languages
            </p>
            <Button 
              onClick={() => setCreateDialogOpen(true)}
              disabled={!appId}
              className="backdrop-blur-sm bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 shadow-xl"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create First Script
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {scripts.map((script) => (
              <div
                key={script.id}
                className="backdrop-blur-sm bg-white/20 border border-white/30 rounded-xl p-6 hover:bg-white/30 transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="text-4xl">{getScriptIcon(script.script_type)}</div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h3 className="text-xl font-bold text-gray-900">{script.name}</h3>
                      <Badge className={cn(
                        "backdrop-blur-sm border",
                        script.is_active
                          ? "bg-green-500/20 border-green-500/40 text-green-900"
                          : "bg-gray-500/20 border-gray-500/40 text-gray-900"
                      )}>
                        {script.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <Badge className="backdrop-blur-sm bg-white/30 border-white/40 text-gray-900 capitalize">
                        {script.script_type}
                      </Badge>
                    </div>
                    
                    {script.description && (
                      <p className="text-gray-700 mb-3">{script.description}</p>
                    )}
                    
                    <div className="flex items-center gap-6 text-sm text-gray-700">
                      <div className="flex items-center gap-2">
                        <Play className="w-4 h-4" />
                        <span>{script.execution_count || 0} executions</span>
                      </div>
                      {script.last_executed && (
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>Last: {new Date(script.last_executed).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleExecute(script)}
                      className="text-green-600 hover:text-green-700 hover:bg-green-500/10"
                      title="Execute Script"
                    >
                      <Play className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewLogs(script)}
                      className="text-gray-800 hover:text-gray-900"
                      title="View Logs"
                    >
                      <Code2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleActiveMutation.mutate({ 
                        id: script.id, 
                        is_active: !script.is_active 
                      })}
                      className={cn(
                        "text-gray-800 hover:text-gray-900",
                        script.is_active && "text-green-600 hover:text-green-700"
                      )}
                      title={script.is_active ? 'Deactivate' : 'Activate'}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(script)}
                      className="text-gray-800 hover:text-gray-900"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(script)}
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

      {/* Recent Executions */}
      {recentExecutions.length > 0 && (
        <div className="backdrop-blur-xl bg-gradient-to-br from-white/30 to-white/10 border border-white/40 rounded-2xl p-6 shadow-2xl">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Recent Executions
          </h2>
          <div className="space-y-2">
            {recentExecutions.slice(0, 5).map((execution) => (
              <div
                key={execution.id}
                className="backdrop-blur-sm bg-white/10 border border-white/20 rounded-lg p-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  {execution.status === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : execution.status === 'failed' ? (
                    <AlertCircle className="w-4 h-4 text-red-600" />
                  ) : (
                    <Clock className="w-4 h-4 text-yellow-600" />
                  )}
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {execution.script_name}
                    </div>
                    <div className="text-xs text-gray-700">
                      {execution.execution_time_ms}ms • {execution.triggered_by || 'Manual'}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-600">
                  {new Date(execution.created_date).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <CreateScriptDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        appId={appId}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['custom-scripts', appId] });
        }}
      />

      <EditScriptDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        script={selectedScript}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['custom-scripts', appId] });
          setSelectedScript(null);
        }}
      />

      <ExecuteScriptDialog
        open={executeDialogOpen}
        onOpenChange={setExecuteDialogOpen}
        script={selectedScript}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['script-executions', appId] });
          queryClient.invalidateQueries({ queryKey: ['custom-scripts', appId] });
        }}
      />

      <ScriptLogsDialog
        open={logsDialogOpen}
        onOpenChange={setLogsDialogOpen}
        script={selectedScript}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="backdrop-blur-xl bg-white/95 border-white/30">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Script</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedScript?.name}"? This action cannot be undone.
              All execution logs will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteScriptMutation.mutate(selectedScript?.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Script
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}