import React, { useState } from "react";
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
  AlertCircle, 
  Clock, 
  TrendingUp,
  Calendar,
  User,
  Zap,
  BarChart3
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { format } from "date-fns";

const COLORS = {
  passed: '#10b981',
  failed: '#ef4444',
  partial: '#f59e0b',
  skipped: '#6b7280'
};

export default function TestSuiteResultsDialog({ open, onOpenChange, suite, appId }) {
  const [selectedExecution, setSelectedExecution] = useState(null);

  // Fetch suite executions
  const { data: executions = [], isLoading } = useQuery({
    queryKey: ['test-suite-executions', suite?.id],
    queryFn: async () => {
      if (!suite?.id) return [];
      const allExecutions = await backend.entities.TestSuiteExecution.filter({ 
        suite_id: suite.id 
      });
      return allExecutions.sort((a, b) => 
        new Date(b.created_date) - new Date(a.created_date)
      );
    },
    enabled: !!suite?.id && open,
  });

  // Fetch test executions for selected suite execution
  const { data: testExecutions = [] } = useQuery({
    queryKey: ['test-executions', selectedExecution?.id],
    queryFn: async () => {
      if (!selectedExecution?.test_execution_ids) return [];
      
      const executions = await Promise.all(
        selectedExecution.test_execution_ids.map(id =>
          backend.entities.TestExecution.get(id).catch(() => null)
        )
      );
      
      return executions.filter(Boolean);
    },
    enabled: !!selectedExecution?.test_execution_ids,
  });

  if (!suite) return null;

  // Prepare trend data (last 10 runs)
  const trendData = executions.slice(0, 10).reverse().map(exec => ({
    date: format(new Date(exec.created_date), 'MMM dd HH:mm'),
    passed: exec.passed_tests || 0,
    failed: exec.failed_tests || 0,
    total: exec.total_tests || 0,
    passRate: exec.total_tests > 0 
      ? ((exec.passed_tests / exec.total_tests) * 100).toFixed(1)
      : 0
  }));

  // Prepare pie chart data
  const latestExecution = executions[0];
  const pieData = latestExecution ? [
    { name: 'Passed', value: latestExecution.passed_tests || 0, color: COLORS.passed },
    { name: 'Failed', value: latestExecution.failed_tests || 0, color: COLORS.failed },
    { name: 'Skipped', value: latestExecution.skipped_tests || 0, color: COLORS.skipped }
  ].filter(item => item.value > 0) : [];

  const getStatusIcon = (status) => {
    switch (status) {
      case 'passed':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'partial':
        return <AlertCircle className="w-5 h-5 text-orange-600" />;
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
      partial: "bg-orange-500/20 border-orange-500/40 text-orange-900",
      running: "bg-blue-500/20 border-blue-500/40 text-blue-900",
      error: "bg-red-500/20 border-red-500/40 text-red-900"
    };
    return colors[status] || "bg-gray-500/20 border-gray-500/40 text-gray-900";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="backdrop-blur-xl bg-white/95 border-white/30 max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Test Suite Results: {suite.name}</DialogTitle>
          <DialogDescription>
            Execution history and test results for this suite
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
            <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Executions Yet</h3>
            <p className="text-gray-600">Run this test suite to see results here</p>
          </div>
        ) : (
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="history">Execution History</TabsTrigger>
              <TabsTrigger value="trends">Trends</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Latest Execution Stats */}
              {latestExecution && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <CheckCircle2 className="w-6 h-6 text-green-600" />
                        <div>
                          <div className="text-2xl font-bold text-green-900">
                            {latestExecution.passed_tests}
                          </div>
                          <div className="text-sm text-green-700">Passed</div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-red-50 to-pink-50 border border-red-200 rounded-xl p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <XCircle className="w-6 h-6 text-red-600" />
                        <div>
                          <div className="text-2xl font-bold text-red-900">
                            {latestExecution.failed_tests}
                          </div>
                          <div className="text-sm text-red-700">Failed</div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <Zap className="w-6 h-6 text-blue-600" />
                        <div>
                          <div className="text-2xl font-bold text-blue-900">
                            {latestExecution.execution_time_ms}ms
                          </div>
                          <div className="text-sm text-blue-700">Duration</div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <TrendingUp className="w-6 h-6 text-purple-600" />
                        <div>
                          <div className="text-2xl font-bold text-purple-900">
                            {latestExecution.total_tests > 0 
                              ? ((latestExecution.passed_tests / latestExecution.total_tests) * 100).toFixed(1)
                              : 0}%
                          </div>
                          <div className="text-sm text-purple-700">Pass Rate</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pie Chart */}
                  {pieData.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Distribution</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Latest Execution Details */}
                  <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Latest Execution</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Status:</span>
                        <Badge className={cn("ml-2 backdrop-blur-sm border", getStatusBadgeColor(latestExecution.status))}>
                          {latestExecution.status}
                        </Badge>
                      </div>
                      <div>
                        <span className="text-gray-600">Environment:</span>
                        <span className="ml-2 font-medium text-gray-900 capitalize">
                          {latestExecution.environment}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Triggered By:</span>
                        <span className="ml-2 font-medium text-gray-900">
                          {latestExecution.triggered_by}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Date:</span>
                        <span className="ml-2 font-medium text-gray-900">
                          {format(new Date(latestExecution.created_date), 'PPpp')}
                        </span>
                      </div>
                    </div>

                    {latestExecution.error_summary && (
                      <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                        <h4 className="font-semibold text-red-900 mb-2">Errors:</h4>
                        <pre className="text-xs text-red-800 whitespace-pre-wrap font-mono">
                          {latestExecution.error_summary}
                        </pre>
                      </div>
                    )}
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              {executions.map(execution => (
                <div
                  key={execution.id}
                  className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedExecution(execution)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {getStatusIcon(execution.status)}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={cn("backdrop-blur-sm border", getStatusBadgeColor(execution.status))}>
                            {execution.status}
                          </Badge>
                          <span className="text-sm text-gray-600">
                            {format(new Date(execution.created_date), 'PPp')}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                            {execution.passed_tests} passed
                          </span>
                          <span className="flex items-center gap-1">
                            <XCircle className="w-4 h-4 text-red-600" />
                            {execution.failed_tests} failed
                          </span>
                          <span className="flex items-center gap-1">
                            <Zap className="w-4 h-4 text-blue-600" />
                            {execution.execution_time_ms}ms
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-600 flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {execution.triggered_by}
                      </div>
                      {execution.build_number && (
                        <div className="text-xs text-gray-600 mt-1">
                          Build: {execution.build_number}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="trends" className="space-y-6">
              {trendData.length > 0 && (
                <>
                  {/* Pass Rate Trend */}
                  <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Pass Rate Trend</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" style={{ fontSize: '12px' }} />
                        <YAxis style={{ fontSize: '12px' }} />
                        <Tooltip />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="passRate" 
                          stroke="#8b5cf6" 
                          strokeWidth={2}
                          name="Pass Rate (%)"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Test Results Over Time */}
                  <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Results Over Time</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" style={{ fontSize: '12px' }} />
                        <YAxis style={{ fontSize: '12px' }} />
                        <Tooltip />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="passed" 
                          stroke="#10b981" 
                          strokeWidth={2}
                          name="Passed"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="failed" 
                          stroke="#ef4444" 
                          strokeWidth={2}
                          name="Failed"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Statistics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                      <h4 className="text-sm font-semibold text-gray-600 mb-2">Average Pass Rate</h4>
                      <div className="text-3xl font-bold text-purple-600">
                        {(trendData.reduce((sum, d) => sum + parseFloat(d.passRate), 0) / trendData.length).toFixed(1)}%
                      </div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                      <h4 className="text-sm font-semibold text-gray-600 mb-2">Total Executions</h4>
                      <div className="text-3xl font-bold text-blue-600">
                        {executions.length}
                      </div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                      <h4 className="text-sm font-semibold text-gray-600 mb-2">Last Run</h4>
                      <div className="text-lg font-bold text-gray-900">
                        {executions.length > 0 
                          ? format(new Date(executions[0].created_date), 'PPp')
                          : 'Never'
                        }
                      </div>
                    </div>
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}