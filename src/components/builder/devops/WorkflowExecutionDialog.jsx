import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { backend } from "@/api/backendClient";
import { useQuery } from "@tanstack/react-query";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Loader2,
  ChevronRight,
  Download,
  Terminal
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export default function WorkflowExecutionDialog({ open, onOpenChange, executionId, appId }) {
  const { data: execution, isLoading } = useQuery({
    queryKey: ['workflow-execution', executionId],
    queryFn: async () => {
      if (!executionId) return null;
      return await backend.entities.WorkflowExecution.get(executionId);
    },
    enabled: !!executionId && open,
    refetchInterval: (data) => {
      // Refetch every 2 seconds if running
      return data?.status === 'running' || data?.status === 'queued' ? 2000 : false;
    }
  });

  if (!execution) return null;

  const getStepStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'failure':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'running':
        return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      queued: { color: "bg-gray-500/20 border-gray-500/40 text-gray-900", label: "Queued" },
      running: { color: "bg-blue-500/20 border-blue-500/40 text-blue-900", label: "Running" },
      success: { color: "bg-green-500/20 border-green-500/40 text-green-900", label: "Success" },
      failure: { color: "bg-red-500/20 border-red-500/40 text-red-900", label: "Failed" },
      cancelled: { color: "bg-orange-500/20 border-orange-500/40 text-orange-900", label: "Cancelled" }
    };
    const { color, label } = config[status] || config.queued;
    return <Badge className={cn("backdrop-blur-sm border", color)}>{label}</Badge>;
  };

  const formatDuration = (ms) => {
    if (!ms) return 'N/A';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="backdrop-blur-xl bg-white/95 border-white/30 max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Workflow Execution: {execution.workflow_name}</span>
            {getStatusBadge(execution.status)}
          </DialogTitle>
          <DialogDescription>
            Execution details and logs
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Execution Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="backdrop-blur-sm bg-white/50 border border-white/40 rounded-lg p-4">
                <div className="text-sm text-gray-700 mb-1">Status</div>
                <div className="font-semibold text-gray-900 capitalize">{execution.status}</div>
              </div>
              <div className="backdrop-blur-sm bg-white/50 border border-white/40 rounded-lg p-4">
                <div className="text-sm text-gray-700 mb-1">Duration</div>
                <div className="font-semibold text-gray-900">{formatDuration(execution.duration_ms)}</div>
              </div>
              <div className="backdrop-blur-sm bg-white/50 border border-white/40 rounded-lg p-4">
                <div className="text-sm text-gray-700 mb-1">Environment</div>
                <div className="font-semibold text-gray-900 capitalize">{execution.environment}</div>
              </div>
              <div className="backdrop-blur-sm bg-white/50 border border-white/40 rounded-lg p-4">
                <div className="text-sm text-gray-700 mb-1">Triggered By</div>
                <div className="font-semibold text-gray-900">{execution.triggered_by}</div>
              </div>
            </div>

            {/* Steps */}
            <div className="backdrop-blur-sm bg-white/50 border border-white/40 rounded-xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Terminal className="w-5 h-5" />
                Execution Steps
              </h3>
              <div className="space-y-3">
                {execution.steps && execution.steps.length > 0 ? (
                  execution.steps.map((step, index) => (
                    <div key={index} className="backdrop-blur-sm bg-white/30 border border-white/30 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          {getStepStatusIcon(step.status)}
                          <span className="font-semibold text-gray-900">{step.name}</span>
                        </div>
                        {step.duration_ms && (
                          <span className="text-sm text-gray-600">{formatDuration(step.duration_ms)}</span>
                        )}
                      </div>
                      {step.logs && step.logs.length > 0 && (
                        <div className="mt-3 backdrop-blur-sm bg-gray-900/90 border border-white/20 rounded-lg p-3 font-mono text-xs text-green-300 max-h-32 overflow-y-auto">
                          {step.logs.map((log, i) => (
                            <div key={i}>{log}</div>
                          ))}
                        </div>
                      )}
                      {step.error && (
                        <div className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">
                          {step.error}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-600">
                    No steps data available
                  </div>
                )}
              </div>
            </div>

            {/* Full Logs */}
            {execution.logs && execution.logs.length > 0 && (
              <div className="backdrop-blur-sm bg-white/50 border border-white/40 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Terminal className="w-5 h-5" />
                    Full Logs
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const logText = execution.logs.join('\n');
                      const blob = new Blob([logText], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `workflow-${execution.id}-logs.txt`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="backdrop-blur-sm bg-white/30 border-white/40"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
                <div className="backdrop-blur-sm bg-gray-900/90 border border-white/20 rounded-lg p-4 font-mono text-xs text-green-300 max-h-96 overflow-y-auto">
                  {execution.logs.map((log, i) => (
                    <div key={i} className="py-0.5">{log}</div>
                  ))}
                </div>
              </div>
            )}

            {/* Error Message */}
            {execution.error_message && (
              <div className="backdrop-blur-sm bg-red-50 border border-red-200 rounded-xl p-4">
                <h3 className="text-lg font-bold text-red-900 mb-2 flex items-center gap-2">
                  <XCircle className="w-5 h-5" />
                  Error
                </h3>
                <p className="text-red-700">{execution.error_message}</p>
              </div>
            )}

            {/* Artifacts */}
            {execution.artifacts && execution.artifacts.length > 0 && (
              <div className="backdrop-blur-sm bg-white/50 border border-white/40 rounded-xl p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Download className="w-5 h-5" />
                  Artifacts
                </h3>
                <div className="space-y-2">
                  {execution.artifacts.map((artifact, index) => (
                    <div key={index} className="flex items-center justify-between backdrop-blur-sm bg-white/30 border border-white/30 rounded-lg p-3">
                      <span className="font-medium text-gray-900">{artifact.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(artifact.url, '_blank')}
                        className="text-purple-600 hover:text-purple-700"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}