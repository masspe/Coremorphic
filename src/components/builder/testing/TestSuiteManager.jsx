import React, { useState } from "react";
import { Package, Plus, Play, Edit, Trash2, CheckCircle2, XCircle, Clock, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import CreateTestSuiteDialog from "./CreateTestSuiteDialog";
import EditTestSuiteDialog from "./EditTestSuiteDialog";
import TestSuiteResultsDialog from "./TestSuiteResultsDialog";
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

const TEST_LEVELS = [
  { 
    value: "unit", 
    label: "Unit Tests", 
    icon: "🔬", 
    color: "from-blue-500 to-cyan-500",
    description: "Test individual components in isolation"
  },
  { 
    value: "integration", 
    label: "Integration Tests", 
    icon: "🔗", 
    color: "from-purple-500 to-pink-500",
    description: "Test interactions between components"
  },
  { 
    value: "fat", 
    label: "FAT (Factory Acceptance)", 
    icon: "🏭", 
    color: "from-orange-500 to-red-500",
    description: "Validate complete system functionality"
  },
  { 
    value: "uat", 
    label: "UAT (User Acceptance)", 
    icon: "👥", 
    color: "from-green-500 to-emerald-500",
    description: "End-user validation testing"
  },
  { 
    value: "production", 
    label: "Production Tests", 
    icon: "🚀", 
    color: "from-indigo-500 to-purple-500",
    description: "Monitor production environment"
  }
];

export default function TestSuiteManager({ appId }) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [resultsDialogOpen, setResultsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSuite, setSelectedSuite] = useState(null);
  const [runningSuites, setRunningSuites] = useState(new Set());
  const [selectedLevel, setSelectedLevel] = useState("all");
  const queryClient = useQueryClient();

  const { data: testSuites = [], isLoading } = useQuery({
    queryKey: ['test-suites', appId],
    queryFn: async () => {
      if (!appId) return [];
      return await base44.entities.TestSuite.filter({ app_id: appId });
    },
    enabled: !!appId,
  });

  const { data: recentExecutions = [] } = useQuery({
    queryKey: ['suite-executions', appId],
    queryFn: async () => {
      if (!appId) return [];
      const executions = await base44.entities.TestSuiteExecution.filter({ app_id: appId });
      return executions.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 10);
    },
    enabled: !!appId,
  });

  const runSuiteMutation = useMutation({
    mutationFn: async (suiteId) => {
      const result = await base44.functions.invoke('runTestSuite', {
        suiteId: suiteId,
        appId: appId
      });
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-suites', appId] });
      queryClient.invalidateQueries({ queryKey: ['suite-executions', appId] });
    },
  });

  const deleteSuiteMutation = useMutation({
    mutationFn: async (suiteId) => {
      await base44.entities.TestSuite.delete(suiteId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-suites', appId] });
      setDeleteDialogOpen(false);
      setSelectedSuite(null);
    },
  });

  const handleRunSuite = async (suite) => {
    setRunningSuites(prev => new Set(prev).add(suite.id));
    
    try {
      await runSuiteMutation.mutateAsync(suite.id);
    } catch (error) {
      console.error('Error running test suite:', error);
      alert('Failed to run test suite: ' + error.message);
    } finally {
      setRunningSuites(prev => {
        const next = new Set(prev);
        next.delete(suite.id);
        return next;
      });
    }
  };

  const handleEdit = (suite) => {
    setSelectedSuite(suite);
    setEditDialogOpen(true);
  };

  const handleViewResults = (suite) => {
    setSelectedSuite(suite);
    setResultsDialogOpen(true);
  };

  const handleDelete = (suite) => {
    setSelectedSuite(suite);
    setDeleteDialogOpen(true);
  };

  const filteredSuites = selectedLevel === "all" 
    ? testSuites 
    : testSuites.filter(s => s.test_level === selectedLevel);

  const getStatusColor = (status) => {
    const colors = {
      passed: "bg-green-500/20 border-green-500/40 text-green-900",
      failed: "bg-red-500/20 border-red-500/40 text-red-900",
      partial: "bg-orange-500/20 border-orange-500/40 text-orange-900",
      pending: "bg-gray-500/20 border-gray-500/40 text-gray-900"
    };
    return colors[status] || colors.pending;
  };

  const getLevelConfig = (level) => {
    return TEST_LEVELS.find(l => l.value === level) || TEST_LEVELS[0];
  };

  // Calculate stats by level
  const statsByLevel = TEST_LEVELS.map(level => {
    const suitesOfLevel = testSuites.filter(s => s.test_level === level.value);
    const passed = suitesOfLevel.filter(s => s.last_status === 'passed').length;
    return {
      ...level,
      total: suitesOfLevel.length,
      passed,
      passRate: suitesOfLevel.length > 0 ? ((passed / suitesOfLevel.length) * 100).toFixed(0) : 0
    };
  });

  return (
    <div className="space-y-6">
      {/* Test Level Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {statsByLevel.map((stat, i) => (
          <button
            key={stat.value}
            onClick={() => setSelectedLevel(selectedLevel === stat.value ? "all" : stat.value)}
            className={cn(
              "backdrop-blur-xl border rounded-2xl p-4 shadow-2xl transition-all text-left",
              selectedLevel === stat.value
                ? "bg-gradient-to-br from-white/50 to-white/30 border-white/60 scale-105"
                : "bg-gradient-to-br from-white/30 to-white/10 border-white/40 hover:scale-105"
            )}
          >
            <div className="text-3xl mb-2">{stat.icon}</div>
            <div className="text-sm font-semibold text-gray-900 mb-1">{stat.label}</div>
            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-bold text-gray-900">{stat.total}</div>
              {stat.total > 0 && (
                <Badge className={cn(
                  "backdrop-blur-sm border",
                  stat.passRate >= 80 
                    ? "bg-green-500/20 border-green-500/40 text-green-900"
                    : stat.passRate >= 50
                    ? "bg-orange-500/20 border-orange-500/40 text-orange-900"
                    : "bg-red-500/20 border-red-500/40 text-red-900"
                )}>
                  {stat.passRate}%
                </Badge>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Test Suites List */}
      <div className="backdrop-blur-xl bg-gradient-to-br from-white/30 to-white/10 border border-white/40 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Package className="w-6 h-6" />
              Test Suites
              {selectedLevel !== "all" && (
                <Badge className="backdrop-blur-sm bg-white/40 border-white/50 text-gray-900">
                  {getLevelConfig(selectedLevel).label}
                </Badge>
              )}
            </h2>
            <p className="text-gray-700 text-sm mt-1">
              Organize and run groups of tests
            </p>
          </div>
          <Button 
            onClick={() => setCreateDialogOpen(true)}
            disabled={!appId}
            className="backdrop-blur-sm bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 shadow-xl"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Suite
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="backdrop-blur-sm bg-white/20 border border-white/30 rounded-xl p-4 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 bg-white/20 rounded w-1/3" />
                    <div className="h-4 bg-white/20 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredSuites.length === 0 ? (
          <div className="text-center py-12 backdrop-blur-sm bg-white/10 border border-white/20 rounded-xl">
            <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {selectedLevel === "all" ? "No Test Suites Yet" : `No ${getLevelConfig(selectedLevel).label}`}
            </h3>
            <p className="text-gray-700 mb-4">
              Create test suites to organize your tests by level and purpose
            </p>
            <Button 
              onClick={() => setCreateDialogOpen(true)}
              disabled={!appId}
              className="backdrop-blur-sm bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 shadow-xl"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create First Suite
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSuites.map((suite) => {
              const isRunning = runningSuites.has(suite.id);
              const levelConfig = getLevelConfig(suite.test_level);
              
              return (
                <div
                  key={suite.id}
                  className="backdrop-blur-sm bg-white/20 border border-white/30 rounded-xl p-4 hover:bg-white/30 transition-all group"
                >
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-lg bg-gradient-to-br",
                      levelConfig.color
                    )}>
                      {levelConfig.icon}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="text-lg font-bold text-gray-900">{suite.name}</h3>
                        {suite.last_status && (
                          <Badge className={cn("backdrop-blur-sm border", getStatusColor(suite.last_status))}>
                            {suite.last_status}
                          </Badge>
                        )}
                        <Badge className="backdrop-blur-sm bg-white/30 border-white/40 text-gray-900">
                          {suite.test_case_ids?.length || 0} tests
                        </Badge>
                        {suite.pass_rate > 0 && (
                          <Badge className={cn(
                            "backdrop-blur-sm border",
                            suite.pass_rate >= 80 
                              ? "bg-green-500/20 border-green-500/40 text-green-900"
                              : "bg-orange-500/20 border-orange-500/40 text-orange-900"
                          )}>
                            {suite.pass_rate}% pass rate
                          </Badge>
                        )}
                      </div>
                      
                      {suite.description && (
                        <p className="text-gray-700 text-sm mb-2">{suite.description}</p>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-gray-600">
                        <span className="flex items-center gap-1">
                          <Layers className="w-3 h-3" />
                          {levelConfig.label}
                        </span>
                        {suite.environment && (
                          <span className="capitalize">{suite.environment}</span>
                        )}
                        {suite.last_run && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Last run: {new Date(suite.last_run).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRunSuite(suite)}
                        disabled={isRunning || !suite.test_case_ids || suite.test_case_ids.length === 0}
                        className="text-green-600 hover:text-green-700 hover:bg-green-500/10"
                        title="Run Suite"
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
                        onClick={() => handleViewResults(suite)}
                        className="text-gray-800 hover:text-gray-900"
                        title="View Results"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(suite)}
                        className="text-gray-800 hover:text-gray-900"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(suite)}
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

      {/* Recent Suite Executions */}
      {recentExecutions.length > 0 && (
        <div className="backdrop-blur-xl bg-gradient-to-br from-white/30 to-white/10 border border-white/40 rounded-2xl p-6 shadow-2xl">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Recent Suite Runs
          </h3>
          <div className="space-y-2">
            {recentExecutions.slice(0, 5).map((execution) => {
              const levelConfig = getLevelConfig(execution.test_level);
              return (
                <div
                  key={execution.id}
                  className="backdrop-blur-sm bg-white/10 border border-white/20 rounded-lg p-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{levelConfig.icon}</div>
                    <div>
                      <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                        {execution.suite_name}
                        <Badge className={cn("backdrop-blur-sm border text-xs", getStatusColor(execution.status))}>
                          {execution.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-700">
                        {execution.passed_tests}/{execution.total_tests} passed • 
                        {execution.execution_time_ms}ms • 
                        {execution.environment}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-600">
                    {new Date(execution.created_date).toLocaleTimeString()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <CreateTestSuiteDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        appId={appId}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['test-suites', appId] });
        }}
      />

      <EditTestSuiteDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        suite={selectedSuite}
        appId={appId}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['test-suites', appId] });
          setSelectedSuite(null);
        }}
      />

      <TestSuiteResultsDialog
        open={resultsDialogOpen}
        onOpenChange={setResultsDialogOpen}
        suite={selectedSuite}
        appId={appId}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="backdrop-blur-xl bg-white/95 border-white/30">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Test Suite</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedSuite?.name}"? This action cannot be undone.
              Individual test cases will not be deleted, only the suite grouping.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteSuiteMutation.mutate(selectedSuite?.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Suite
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}