import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function TriggerLogsDialog({ open, onOpenChange, trigger }) {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['trigger-logs-detail', trigger?.id],
    queryFn: async () => {
      if (!trigger?.id) return [];
      const allLogs = await base44.entities.TriggerLog.filter({ trigger_id: trigger.id });
      return allLogs.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    enabled: !!trigger?.id && open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="backdrop-blur-xl bg-white/95 border-white/30 max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Trigger Execution Logs</DialogTitle>
          <DialogDescription>
            {trigger?.name} - View execution history and debug information
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-600">No execution logs yet</p>
              <p className="text-sm text-gray-500 mt-1">
                Logs will appear here when the trigger executes
              </p>
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className={cn(
                  "backdrop-blur-sm border rounded-xl p-4",
                  log.status === 'success'
                    ? "bg-green-50/50 border-green-200"
                    : "bg-red-50/50 border-red-200"
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {log.status === 'success' ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    )}
                    <Badge className={cn(
                      "backdrop-blur-sm border",
                      log.status === 'success'
                        ? "bg-green-500/20 border-green-500/40 text-green-900"
                        : "bg-red-500/20 border-red-500/40 text-red-900"
                    )}>
                      {log.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-600">
                    {format(new Date(log.created_date), 'PPp')}
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-gray-600">Source:</span>{' '}
                      <span className="font-medium text-gray-900">{log.source_entity}</span>
                      {log.source_record_id && (
                        <span className="text-gray-500 ml-1">({log.source_record_id.substring(0, 8)}...)</span>
                      )}
                    </div>
                    <div>
                      <span className="text-gray-600">Target:</span>{' '}
                      <span className="font-medium text-gray-900">{log.target_entity}</span>
                      {log.target_record_id && (
                        <span className="text-gray-500 ml-1">({log.target_record_id.substring(0, 8)}...)</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-gray-600">Action:</span>{' '}
                    <span className="font-medium text-gray-900">{log.action}</span>
                  </div>

                  <div>
                    <span className="text-gray-600">Execution Time:</span>{' '}
                    <span className="font-medium text-gray-900">{log.execution_time_ms}ms</span>
                  </div>

                  {log.error_message && (
                    <div className="mt-2 p-2 bg-red-100 border border-red-200 rounded text-red-800 text-xs">
                      <strong>Error:</strong> {log.error_message}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}