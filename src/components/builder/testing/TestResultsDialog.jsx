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
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Clock,
  Calendar,
  User,
  Zap
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function TestResultsDialog({ open, onOpenChange, test, appId }) {
  // Fetch test executions
  const { data: executions = [], isLoading } = useQuery({
    queryKey: ['test-executions', test?.id],
    queryFn: async () => {
      if (!test?.id) return [];
      const allExecutions = await base44.entities.TestExecution.filter({ 
        test_case_id: test.id 
      });
      return allExecutions.sort((a, b) => 
        new Date(b.created_date) - new Date(a.created_date)
      );
    },
    enabled: !!test?.id && open,
  });

  if (!test) return null;

  const getStatusIcon = (status) => {
    switch (status) {
      case 'passed':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'running':
        return <Clock className="w-5 h-5 text-blue-600 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      passed: "bg-green-500/20 border-green-500/40 text-green-900",
      failed: "bg-red-500/20 border-red-500/40 text-red-900",
      error: "bg-red-500/20 border-red-500/40 text-red-900",
      running: "bg-blue-500/20 border-blue-500/40 text-blue-900"
    };
    return colors[status] || "bg-gray-500/20 border-gray-500/40 text-gray-900";
  };

  const latestExecution = executions[0];
  const passedCount = executions.filter(e => e.status === 'passed').length;
  const failedCount = executions.filter(e => e.status === 'failed' || e.status === 'error').length;
  const passRate = executions.length > 0 
    ? ((passedCount / executions.length) * 100).toFixed(1)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="backdrop-blur-xl bg-white/95 border-white/30 max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Test Results: {test.name}</DialogTitle>
          <DialogDescription>
            Execution history and detailed results
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : executions.length === 0 ? (
          <div className="text-center py-16">
            <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Executions Yet</h3>
            <p className="text-gray-600">Run this test to see results here</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-4">
                <div className="text-2xl font-bold text-purple-900">{executions.length}</div>
                <div className="text-sm text-purple-700">Total Runs</div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
                <div className="text-2xl font-bold text-green-900">{passedCount}</div>
                <div className="text-sm text-green-700">Passed</div>
              </div>
              <div className="bg-gradient-to-br from-red-50 to-pink-50 border border-red-200 rounded-xl p-4">
                <div className="text-2xl font-bold text-red-900">{failedCount}</div>
                <div className="text-sm text-red-700">Failed</div>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-4">
                <div className="text-2xl font-bold text-blue-900">{passRate}%</div>
                <div className="text-sm text-blue-700">Pass Rate</div>
              </div>
            </div>

            {/* Latest Execution Details */}
            {latestExecution && (
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Latest Execution</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Status:</span>
                    <Badge className={cn("backdrop-blur-sm border", getStatusBadgeColor(latestExecution.status))}>
                      {latestExecution.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Execution Time:</span>
                    <span className="font-medium text-gray-900">{latestExecution.execution_time_ms}ms</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Triggered By:</span>
                    <span className="font-medium text-gray-900">{latestExecution.triggered_by}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Date:</span>
                    <span className="font-medium text-gray-900">
                      {format(new Date(latestExecution.created_date), 'PPpp')}
                    </span>
                  </div>

                  {latestExecution.error_message && (
                    <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                      <h4 className="font-semibold text-red-900 mb-2">Error:</h4>
                      <pre className="text-xs text-red-800 whitespace-pre-wrap font-mono">
                        {latestExecution.error_message}
                      </pre>
                    </div>
                  )}

                  {latestExecution.assertions_results && latestExecution.assertions_results.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-semibold text-gray-900 mb-2">Assertions:</h4>
                      <div className="space-y-2">
                        {latestExecution.assertions_results.map((assertion, i) => (
                          <div key={i} className="flex items-start gap-2">
                            {assertion.passed ? (
                              <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-600 mt-0.5" />
                            )}
                            <span className="text-sm text-gray-700">{assertion.message}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {latestExecution.logs && latestExecution.logs.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-semibold text-gray-900 mb-2">Logs:</h4>
                      <div className="bg-gray-900 rounded-lg p-4 max-h-64 overflow-y-auto">
                        {latestExecution.logs.map((log, i) => (
                          <div key={i} className="text-xs text-gray-300 font-mono">
                            {log}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Execution History */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Execution History</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {executions.map(execution => (
                  <div
                    key={execution.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(execution.status)}
                      <div>
                        <Badge className={cn("backdrop-blur-sm border text-xs", getStatusBadgeColor(execution.status))}>
                          {execution.status}
                        </Badge>
                        <div className="text-xs text-gray-600 mt-1">
                          {format(new Date(execution.created_date), 'PPp')}
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="flex items-center gap-1 text-gray-600">
                        <Zap className="w-3 h-3" />
                        {execution.execution_time_ms}ms
                      </div>
                      <div className="text-xs text-gray-500">
                        {execution.triggered_by}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}