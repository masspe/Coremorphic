import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, AlertCircle, Clock, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function ScriptLogsDialog({ open, onOpenChange, script }) {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['script-logs', script?.id],
    queryFn: async () => {
      if (!script?.id) return [];
      const executions = await base44.entities.ScriptExecution.filter({ 
        script_id: script.id 
      });
      return executions.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    enabled: !!script?.id && open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="backdrop-blur-xl bg-white/95 border-white/30 max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Execution Logs: {script?.name}</DialogTitle>
          <DialogDescription>
            View execution history and outputs for this script
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No execution logs yet</p>
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className={cn(
                  "backdrop-blur-sm border rounded-xl p-4",
                  log.status === 'success' && "bg-green-500/10 border-green-500/30",
                  log.status === 'failed' && "bg-red-500/10 border-red-500/30",
                  log.status === 'running' && "bg-yellow-500/10 border-yellow-500/30"
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {log.status === 'success' && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                    {log.status === 'failed' && <AlertCircle className="w-5 h-5 text-red-600" />}
                    {log.status === 'running' && <Loader2 className="w-5 h-5 text-yellow-600 animate-spin" />}
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {new Date(log.created_date).toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-600">
                        {log.execution_time_ms}ms • Triggered by: {log.triggered_by || 'Manual'}
                      </div>
                    </div>
                  </div>
                  <Badge className={cn(
                    "backdrop-blur-sm border capitalize",
                    log.status === 'success' && "bg-green-500/20 border-green-500/40 text-green-900",
                    log.status === 'failed' && "bg-red-500/20 border-red-500/40 text-red-900",
                    log.status === 'running' && "bg-yellow-500/20 border-yellow-500/40 text-yellow-900"
                  )}>
                    {log.status}
                  </Badge>
                </div>

                {log.output_data && (
                  <div className="mb-2">
                    <div className="text-xs font-semibold text-gray-700 mb-1">Output:</div>
                    <pre className="text-xs bg-white/50 p-2 rounded overflow-auto max-h-32">
                      {typeof log.output_data === 'string' ? log.output_data : JSON.stringify(log.output_data, null, 2)}
                    </pre>
                  </div>
                )}

                {log.error_message && (
                  <div>
                    <div className="text-xs font-semibold text-red-700 mb-1">Error:</div>
                    <pre className="text-xs bg-red-500/10 p-2 rounded overflow-auto max-h-32 text-red-800">
                      {log.error_message}
                    </pre>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}