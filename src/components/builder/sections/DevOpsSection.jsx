
import React, { useState } from "react";
import { 
  Rocket, 
  GitBranch, 
  Package, 
  Server, 
  Clock, 
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCcw,
  History,
  Settings,
  Plus, // Added for create workflow button
  Loader2 // Added for loading states
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import CreateWorkflowDialog from "../devops/CreateWorkflowDialog"; // New Component
import WorkflowExecutionDialog from "../devops/WorkflowExecutionDialog"; // New Component
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"; // React Query Hooks
import { backend } from "@/api/backendClient"; // API Client

export default function DevOpsSection({ appId }) {
  const [selectedEnvironment, setSelectedEnvironment] = useState("production"); // Keep existing state

  // New states for workflow management
  const [createWorkflowOpen, setCreateWorkflowOpen] = useState(false);
  const [executionDialogOpen, setExecutionDialogOpen] = useState(false);
  const [selectedExecution, setSelectedExecution] = useState(null);
  const [runningWorkflows, setRunningWorkflows] = useState(new Set()); // To track currently running workflows for UI loading states
  const queryClient = useQueryClient();

  // Mock data for environment status - still needed
  const deploymentStatus = {
    production: { status: "deployed", version: "v1.2.3", lastDeployed: "2 hours ago", deployedBy: "john@example.com" },
    staging: { status: "deployed", version: "v1.3.0-beta", lastDeployed: "30 minutes ago", deployedBy: "jane@example.com" },
    development: { status: "deploying", version: "v1.3.1-dev", lastDeployed: "5 minutes ago", deployedBy: "dev@example.com" }
  };

  // Fetch workflows using React Query
  const { data: workflows = [] } = useQuery({
    queryKey: ['workflows', appId],
    queryFn: async () => {
      if (!appId) return [];
      return await backend.entities.Workflow.filter({ app_id: appId });
    },
    enabled: !!appId, // Only run query if appId is available
  });

  // Fetch recent deployments using React Query (replaces mock deploymentHistory)
  const { data: deployments = [] } = useQuery({
    queryKey: ['deployments', appId],
    queryFn: async () => {
      if (!appId) return [];
      const allDeployments = await backend.entities.Deployment.filter({ app_id: appId });
      // Sort by creation date and take the latest 10
      return allDeployments.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 10);
    },
    enabled: !!appId,
  });

  // Mutation for running a workflow
  const runWorkflowMutation = useMutation({
    mutationFn: async (workflowId) => {
      // Invoke the 'runWorkflow' function via backend client
      const result = await backend.functions.invoke('runWorkflow', {
        workflowId,
        appId
      });
      return result.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workflows', appId] }); // Refresh workflows list
      setSelectedExecution(data.execution_id); // Set the execution ID to display
      setExecutionDialogOpen(true); // Open the workflow execution dialog
    },
    onError: (error) => {
      console.error('Failed to run workflow:', error);
      alert('Failed to run workflow: ' + (error.message || 'Unknown error'));
    }
  });

  // Handler for running a workflow from the UI
  const handleRunWorkflow = async (workflow) => {
    setRunningWorkflows(prev => new Set(prev).add(workflow.id)); // Add workflow ID to running set
    
    try {
      await runWorkflowMutation.mutateAsync(workflow.id);
    } catch (error) {
      // Error handled by onError in useMutation, but cleanup still needed
    } finally {
      setRunningWorkflows(prev => {
        const next = new Set(prev);
        next.delete(workflow.id);
        return next;
      });
    }
  };

  // Helper to get status color (expanded to include 'pending')
  const getStatusColor = (status) => {
    const colors = {
      deployed: "bg-green-500/20 border-green-500/40 text-green-900",
      deploying: "bg-blue-500/20 border-blue-500/40 text-blue-900",
      pending: "bg-blue-500/20 border-blue-500/40 text-blue-900", // Added pending status
      failed: "bg-red-500/20 border-red-500/40 text-red-900",
      success: "bg-green-500/20 border-green-500/40 text-green-900"
    };
    return colors[status] || "bg-gray-500/20 border-gray-500/40 text-gray-900";
  };

  // Helper to get status icon (expanded to include 'pending')
  const getStatusIcon = (status) => {
    switch (status) {
      case 'deployed':
      case 'success':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'deploying':
      case 'pending': // Added pending status
        return <Clock className="w-4 h-4 animate-spin" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4" />;
      default: // For 'Not run' or unknown statuses
        return <Server className="w-4 h-4" />;
    }
  };

  // Helper to format duration in seconds to "Xm Ys"
  const formatDuration = (seconds) => {
    if (typeof seconds !== 'number' || isNaN(seconds)) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="backdrop-blur-xl bg-gradient-to-br from-white/30 to-white/10 border border-white/40 rounded-2xl p-6 shadow-2xl">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
            <Rocket className="w-5 h-5 text-white" />
          </div>
          DevOps
        </h1>
        <p className="text-gray-800 font-medium">Manage deployments, releases, and infrastructure</p>
      </div>

      {/* Environment Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Object.entries(deploymentStatus).map(([env, data]) => (
          <div 
            key={env}
            className="backdrop-blur-xl bg-gradient-to-br from-white/30 to-white/10 border border-white/40 rounded-2xl p-6 shadow-2xl hover:shadow-purple-500/30 transition-all duration-300 group hover:scale-105"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 capitalize">{env}</h3>
              <Badge className={cn("backdrop-blur-sm border", getStatusColor(data.status))}>
                {getStatusIcon(data.status)}
                <span className="ml-1">{data.status}</span>
              </Badge>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Version:</span>
                <Badge className="backdrop-blur-sm bg-white/30 border-white/40 text-gray-900">{data.version}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Deployed:</span>
                <span className="text-gray-900 font-medium">{data.lastDeployed}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700">By:</span>
                <span className="text-gray-900 font-medium">{data.deployedBy}</span>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button 
                size="sm" 
                variant="outline"
                className="flex-1 backdrop-blur-sm bg-white/30 border-white/40 hover:bg-white/50"
              >
                <Play className="w-3 h-3 mr-1" />
                Deploy
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                className="backdrop-blur-sm bg-white/30 border-white/40 hover:bg-white/50"
                disabled={data.status === 'deploying'}
              >
                <RotateCcw className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Tabs (Updated) */}
      <Tabs defaultValue="workflows" className="space-y-6"> {/* Default changed to workflows */}
        <TabsList className="backdrop-blur-xl bg-white/20 border border-white/30 p-1">
          {/* New Workflows Tab */}
          <TabsTrigger value="workflows" className="data-[state=active]:bg-white/40">
            <GitBranch className="w-4 h-4 mr-2" />
            Workflows
          </TabsTrigger>
          {/* Deployments Tab (Updated text) */}
          <TabsTrigger value="deployments" className="data-[state=active]:bg-white/40">
            <History className="w-4 h-4 mr-2" />
            Deployments
          </TabsTrigger>
          <TabsTrigger value="releases" className="data-[state=active]:bg-white/40">
            <Package className="w-4 h-4 mr-2" />
            Releases
          </TabsTrigger>
          <TabsTrigger value="environments" className="data-[state=active]:bg-white/40">
            <Server className="w-4 h-4 mr-2" />
            Environments
          </TabsTrigger>
          {/* Removed old CI/CD Pipelines tab */}
        </TabsList>

        {/* Workflows Tab Content (New) */}
        <TabsContent value="workflows">
          <div className="backdrop-blur-xl bg-gradient-to-br from-white/30 to-white/10 border border-white/40 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <GitBranch className="w-5 h-5" />
                CI/CD Workflows
              </h2>
              <Button 
                onClick={() => setCreateWorkflowOpen(true)}
                disabled={!appId}
                className="backdrop-blur-sm bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 shadow-xl"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Workflow
              </Button>
            </div>

            {workflows.length === 0 ? (
              <div className="text-center py-16">
                <GitBranch className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Workflows Yet</h3>
                <p className="text-gray-600 mb-6">Create your first CI/CD workflow to automate deployments</p>
                <Button 
                  onClick={() => setCreateWorkflowOpen(true)}
                  disabled={!appId}
                  className="backdrop-blur-sm bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Workflow
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {workflows.map((workflow) => (
                  <div 
                    key={workflow.id}
                    className="backdrop-blur-sm bg-white/20 border border-white/30 rounded-xl p-4 hover:bg-white/30 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900">{workflow.name}</h3>
                          <Badge className={cn("backdrop-blur-sm border text-xs capitalize", getStatusColor(workflow.last_status || 'not_run'))}>
                            {workflow.last_status ? workflow.last_status.replace(/_/g, ' ') : 'Not run'}
                          </Badge>
                          <Badge className="backdrop-blur-sm bg-purple-500/20 border-purple-500/40 text-purple-900 text-xs capitalize">
                            {workflow.workflow_type?.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        {workflow.description && (
                          <p className="text-sm text-gray-700 mb-2">{workflow.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-gray-600">
                          <span>🎯 {workflow.trigger_type?.replace(/_/g, ' ')}</span>
                          <span>🌍 {workflow.environment}</span>
                          <span>▶️ {workflow.total_runs || 0} runs</span>
                          {workflow.success_rate !== undefined && (
                            <span>✓ {workflow.success_rate.toFixed(0)}% success</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleRunWorkflow(workflow)}
                          disabled={runningWorkflows.has(workflow.id) || !appId || runWorkflowMutation.isPending}
                          className="backdrop-blur-sm bg-white/30 border-white/40 hover:bg-white/50"
                        >
                          {runningWorkflows.has(workflow.id) || runWorkflowMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Deployments Tab Content (Updated to use fetched data) */}
        <TabsContent value="deployments">
          <div className="backdrop-blur-xl bg-gradient-to-br from-white/30 to-white/10 border border-white/40 rounded-2xl p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <History className="w-5 h-5" />
              Recent Deployments
            </h2>
            <div className="space-y-3">
              {deployments.length === 0 ? (
                <div className="text-center py-16 text-gray-600">No recent deployments found.</div>
              ) : (
                deployments.map((deployment) => (
                  <div 
                    key={deployment.id}
                    className="backdrop-blur-sm bg-white/20 border border-white/30 rounded-xl p-4 hover:bg-white/30 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge className="backdrop-blur-sm bg-white/30 border-white/40 text-gray-900 font-mono">
                            {deployment.version}
                          </Badge>
                          <Badge className={cn("backdrop-blur-sm border", getStatusColor(deployment.status))}>
                            {getStatusIcon(deployment.status)}
                            <span className="ml-1 capitalize">{deployment.status}</span>
                          </Badge>
                          <Badge className="backdrop-blur-sm bg-purple-500/20 border-purple-500/40 text-purple-900 capitalize">
                            {deployment.environment}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-700">
                          <span>🕐 {new Date(deployment.created_date).toLocaleString()}</span>
                          <span>👤 {deployment.deployed_by_email || 'Unknown'}</span>
                          <span>⚡ {formatDuration(deployment.duration_seconds)}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="ghost"
                          className="text-gray-700 hover:text-gray-900"
                          title="View Logs"
                        >
                          <History className="w-4 h-4" />
                        </Button>
                        {deployment.status === 'success' && (
                          <Button 
                            size="sm" 
                            variant="ghost"
                            className="text-gray-700 hover:text-gray-900"
                            title="Rollback to this version"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="releases">
          <div className="backdrop-blur-xl bg-gradient-to-br from-white/30 to-white/10 border border-white/40 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Package className="w-5 h-5" />
                Release Management
              </h2>
              <Button className="backdrop-blur-sm bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 shadow-xl">
                <Package className="w-4 h-4 mr-2" />
                Create Release
              </Button>
            </div>
            <div className="text-center py-16">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Release management coming soon</p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="environments">
          <div className="backdrop-blur-xl bg-gradient-to-br from-white/30 to-white/10 border border-white/40 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Server className="w-5 h-5" />
                Environment Configuration
              </h2>
              <Button className="backdrop-blur-sm bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 shadow-xl">
                <Settings className="w-4 h-4 mr-2" />
                Configure
              </Button>
            </div>
            <div className="text-center py-16">
              <Server className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Environment configuration coming soon</p>
            </div>
          </div>
        </TabsContent>

        {/* Removed the old CI/CD Pipelines tab as it's replaced by 'Workflows' */}
      </Tabs>

      {/* New Dialogs for Workflow Management */}
      <CreateWorkflowDialog
        open={createWorkflowOpen}
        onOpenChange={setCreateWorkflowOpen}
        appId={appId}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['workflows', appId] }); // Invalidate query to refresh workflow list
        }}
      />

      <WorkflowExecutionDialog
        open={executionDialogOpen}
        onOpenChange={setExecutionDialogOpen}
        executionId={selectedExecution}
        appId={appId}
      />
    </div>
  );
}
