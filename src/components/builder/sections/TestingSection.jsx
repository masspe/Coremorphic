
import React, { useState } from "react";
import { TestTube, Plus, Play, Edit, Trash2, CheckCircle2, XCircle, AlertCircle, Clock, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import CreateTestDialog from "../testing/CreateTestDialog";
import EditTestDialog from "../testing/EditTestDialog";
import TestResultsDialog from "../testing/TestResultsDialog";
import TestSuiteManager from "./TestSuiteManager"; // Added import for TestSuiteManager
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

export default function TestingSection({ appId }) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [resultsDialogOpen, setResultsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);
  const [runningTests, setRunningTests] = useState(new Set());
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("cases"); // New state for active tab

  const { data: testCases = [], isLoading } = useQuery({
    queryKey: ['test-cases', appId],
    queryFn: async () => {
      if (!appId) return [];
      return await base44.entities.TestCase.filter({ app_id: appId });
    },
    enabled: !!appId,
  });

  const { data: recentExecutions = [] } = useQuery({
    queryKey: ['test-executions', appId],
    queryFn: async () => {
      if (!appId) return [];
      const executions = await base44.entities.TestExecution.filter({ app_id: appId });
      return executions.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 10);
    },
    enabled: !!appId,
  });

  const runTestMutation = useMutation({
    mutationFn: async (testId) => {
      const result = await base44.functions.invoke('runTestCase', {
        testCaseId: testId,
        appId: appId
      });
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-cases', appId] });
      queryClient.invalidateQueries({ queryKey: ['test-executions', appId] });
    },
  });

  const deleteTestMutation = useMutation({
    mutationFn: async (testId) => {
      await base44.entities.TestCase.delete(testId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-cases', appId] });
      setDeleteDialogOpen(false);
      setSelectedTest(null);
    },
  });

  const handleRunTest = async (test) => {
    setRunningTests(prev => new Set(prev).add(test.id));
    
    try {
      await runTestMutation.mutateAsync(test.id);
    } catch (error) {
      console.error('Error running test:', error);
      alert('Failed to run test: ' + error.message);
    } finally {
      setRunningTests(prev => {
        const next = new Set(prev);
        next.delete(test.id);
        return next;
      });
    }
  };

  const handleRunAllTests = async () => {
    for (const test of testCases.filter(t => t.is_active)) {
      await handleRunTest(test);
    }
  };

  const handleEdit = (test) => {
    setSelectedTest(test);
    setEditDialogOpen(true);
  };

  const handleViewResults = (test) => {
    setSelectedTest(test);
    setResultsDialogOpen(true);
  };

  const handleDelete = (test) => {
    setSelectedTest(test);
    setDeleteDialogOpen(true);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'passed':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-orange-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      passed: "bg-green-500/20 border-green-500/40 text-green-900",
      failed: "bg-red-500/20 border-red-500/40 text-red-900",
      error: "bg-orange-500/20 border-orange-500/40 text-orange-900",
      pending: "bg-gray-500/20 border-gray-500/40 text-gray-900"
    };
    return colors[status] || colors.pending;
  };

  const getTestTypeIcon = (type) => {
    const icons = {
      trigger: "⚡",
      script: "📜",
      scheduled_task: "🕐",
      function: "🔧",
      integration: "🔌"
    };
    return icons[type] || "🧪";
  };

  const passedTests = testCases.filter(t => t.last_status === 'passed').length;
  const failedTests = testCases.filter(t => t.last_status === 'failed').length;
  const totalRuns = testCases.reduce((sum, t) => sum + (t.run_count || 0), 0);
  const successRate = testCases.length > 0
    ? ((passedTests / testCases.length) * 100).toFixed(1)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="backdrop-blur-xl bg-gradient-to-br from-white/30 to-white/10 border border-white/40 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                <TestTube className="w-5 h-5 text-white" />
              </div>
              Testing & Debugging
            </h1>
            <p className="text-gray-800 font-medium">Comprehensive testing framework with multi-level test suites</p>
          </div>
          {activeTab === "cases" && (
            <div className="flex gap-2">
              <Button 
                onClick={handleRunAllTests}
                disabled={!appId || testCases.length === 0}
                variant="outline"
                className="backdrop-blur-sm bg-white/30 border-white/40 text-gray-900"
              >
                <Play className="w-4 h-4 mr-2" />
                Run All Tests
              </Button>
              <Button 
                onClick={() => setCreateDialogOpen(true)}
                disabled={!appId}
                className="backdrop-blur-sm bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 shadow-xl"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Test
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="backdrop-blur-xl bg-gradient-to-br from-white/30 to-white/10 border border-white/40 rounded-2xl p-2 shadow-2xl inline-flex gap-2">
        <button
          onClick={() => setActiveTab("cases")}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            activeTab === "cases"
              ? "bg-white/50 text-gray-900 shadow-md"
              : "text-gray-700 hover:bg-white/20"
          }`}
        >
          Test Cases
        </button>
        <button
          onClick={() => setActiveTab("suites")}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            activeTab === "suites"
              ? "bg-white/50 text-gray-900 shadow-md"
              : "text-gray-700 hover:bg-white/20"
          }`}
        >
          Test Suites
        </button>
      </div>

      {/* Content based on active tab */}
      {activeTab === "cases" ? (
        <>
          {/* Stats Overview */}
          {testCases.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="backdrop-blur-xl bg-gradient-to-br from-white/30 to-white/10 border border-white/40 rounded-2xl p-6 shadow-2xl">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <TestTube className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{testCases.length}</div>
                    <div className="text-sm text-gray-700">Total Tests</div>
                  </div>
                </div>
              </div>

              <div className="backdrop-blur-xl bg-gradient-to-br from-white/30 to-white/10 border border-white/40 rounded-2xl p-6 shadow-2xl">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{passedTests}</div>
                    <div className="text-sm text-gray-700">Passed</div>
                  </div>
                </div>
              </div>

              <div className="backdrop-blur-xl bg-gradient-to-br from-white/30 to-white/10 border border-white/40 rounded-2xl p-6 shadow-2xl">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center">
                    <XCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{failedTests}</div>
                    <div className="text-sm text-gray-700">Failed</div>
                  </div>
                </div>
              </div>

              <div className="backdrop-blur-xl bg-gradient-to-br from-white/30 to-white/10 border border-white/40 rounded-2xl p-6 shadow-2xl">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{successRate}%</div>
                    <div className="text-sm text-gray-700">Success Rate</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Test Cases List */}
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
            ) : testCases.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                  <TestTube className="w-12 h-12 text-purple-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">No Tests Yet</h3>
                <p className="text-gray-700 mb-6 max-w-md mx-auto">
                  Create test cases to validate your triggers, scripts, and scheduled tasks
                </p>
                <Button 
                  onClick={() => setCreateDialogOpen(true)}
                  disabled={!appId}
                  className="backdrop-blur-sm bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 shadow-xl"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Test
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {testCases.map((test) => {
                  const isRunning = runningTests.has(test.id);
                  
                  return (
                    <div
                      key={test.id}
                      className="backdrop-blur-sm bg-white/20 border border-white/30 rounded-xl p-6 hover:bg-white/30 transition-all group"
                    >
                      <div className="flex items-start gap-4">
                        <div className="text-4xl">{getTestTypeIcon(test.test_type)}</div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <h3 className="text-xl font-bold text-gray-900">{test.name}</h3>
                            {test.last_status && (
                              <Badge className={cn("backdrop-blur-sm border", getStatusBadgeColor(test.last_status))}>
                                {test.last_status}
                              </Badge>
                            )}
                            <Badge className="backdrop-blur-sm bg-white/30 border-white/40 text-gray-900 capitalize">
                              {test.test_type}
                            </Badge>
                          </div>
                          
                          {test.description && (
                            <p className="text-gray-700 mb-3">{test.description}</p>
                          )}
                          
                          <div className="flex items-center gap-6 text-sm text-gray-700">
                            <div className="flex items-center gap-2">
                              <Play className="w-4 h-4" />
                              <span>{test.run_count || 0} runs</span>
                            </div>
                            {test.last_run && (
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                <span>Last: {new Date(test.last_run).toLocaleString()}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRunTest(test)}
                            disabled={isRunning}
                            className="text-green-600 hover:text-green-700 hover:bg-green-500/10"
                            title="Run Test"
                          >
                            {isRunning ? (
                              <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewResults(test)}
                            className="text-gray-800 hover:text-gray-900"
                            title="View Results"
                          >
                            <TrendingUp className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(test)}
                            className="text-gray-800 hover:text-gray-900"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(test)}
                            className="text-red-600 hover:text-red-700"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Test Executions */}
          {recentExecutions.length > 0 && (
            <div className="backdrop-blur-xl bg-gradient-to-br from-white/30 to-white/10 border border-white/40 rounded-2xl p-6 shadow-2xl">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Recent Test Runs
              </h2>
              <div className="space-y-2">
                {recentExecutions.slice(0, 5).map((execution) => (
                  <div
                    key={execution.id}
                    className="backdrop-blur-sm bg-white/10 border border-white/20 rounded-lg p-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(execution.status)}
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {execution.test_name}
                        </div>
                        <div className="text-xs text-gray-700">
                          {execution.execution_time_ms}ms • {execution.triggered_by}
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
        </>
      ) : (
        <TestSuiteManager appId={appId} />
      )}

      <CreateTestDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        appId={appId}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['test-cases', appId] });
        }}
      />

      <EditTestDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        test={selectedTest}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['test-cases', appId] });
          setSelectedTest(null);
        }}
      />

      <TestResultsDialog
        open={resultsDialogOpen}
        onOpenChange={setResultsDialogOpen}
        test={selectedTest}
        appId={appId}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="backdrop-blur-xl bg-white/95 border-white/30">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Test Case</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedTest?.name}"? This action cannot be undone.
              All execution history will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTestMutation.mutate(selectedTest?.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Test
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
