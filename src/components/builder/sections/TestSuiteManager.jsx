import React, { useState } from "react";
import { Package, Plus, Play, Edit, Trash2, TrendingUp, CheckCircle2, XCircle, AlertCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { backend } from "@/api/backendClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import CreateTestSuiteDialog from "../testing/CreateTestSuiteDialog";
import EditTestSuiteDialog from "../testing/EditTestSuiteDialog";
import TestSuiteResultsDialog from "../testing/TestSuiteResultsDialog";
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

const TEST_LEVEL_INFO = {
  unit: { icon: "🔬", label: "Unit Tests", color: "bg-blue-500/20 border-blue-500/40 text-blue-900" },
  integration: { icon: "🔗", label: "Integration", color: "bg-purple-500/20 border-purple-500/40 text-purple-900" },
  fat: { icon: "🏭", label: "FAT", color: "bg-orange-500/20 border-orange-500/40 text-orange-900" },
  uat: { icon: "👥", label: "UAT", color: "bg-green-500/20 border-green-500/40 text-green-900" },
  production: { icon: "🚀", label: "Production", color: "bg-red-500/20 border-red-500/40 text-red-900" }
};

export default function TestSuiteManager({ appId }) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [resultsDialogOpen, setResultsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSuite, setSelectedSuite] = useState(null);
  const [runningSuites, setRunningSuites] = useState(new Set());
  const queryClient = useQueryClient();

  const { data: testSuites = [], isLoading } = useQuery({
    queryKey: ['test-suites', appId],
    queryFn: async () => {
      if (!appId) return [];
      return await backend.entities.TestSuite.filter({ app_id: appId });
    },
    enabled: !!appId,
  });

  const runSuiteMutation = useMutation({
    mutationFn: async (suiteId) => {
      const result = await backend.functions.invoke('runTestSuite', {
        suiteId: suiteId,
        appId: appId
      });
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-suites', appId] });
    },
  });

  const deleteSuiteMutation = useMutation({
    mutationFn: async (suiteId) => {
      await backend.entities.TestSuite.delete(suiteId);
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

  const getStatusIcon = (status) => {
    switch (status) {
      case 'passed':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'partial':
        return <AlertCircle className="w-5 h-5 text-orange-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      passed: "bg-green-500/20 border-green-500/40 text-green-900",
      failed: "bg-red-500/20 border-red-500/40 text-red-900",
      partial: "bg-orange-500/20 border-orange-500/40 text-orange-900",
      pending: "bg-gray-500/20 border-gray-500/40 text-gray-900"
    };
    return colors[status] || colors.pending;
  };

  // Calculate stats
  const totalSuites = testSuites.length;
  const activeSuites = testSuites.filter(s => s.is_active).length;
  const averagePassRate = testSuites.length > 0
    ? (testSuites.reduce((sum, s) => sum + (s.pass_rate || 0), 0) / testSuites.length).toFixed(1)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="backdrop-blur-xl bg-gradient-to-br from-white/30 to-white/10 border border-white/40 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3 mb-2">
              <Package className="w-6 h-6" />
              Test Suites
            </h2>
            <p className="text-gray-800">Organize tests by level: Unit, Integration, FAT, UAT, Production</p>
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
      </div>

      {/* Stats Overview */}
      {testSuites.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="backdrop-blur-xl bg-gradient-to-br from-white/30 to-white/10 border border-white/40 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{totalSuites}</div>
                <div className="text-sm text-gray-700">Total Suites</div>
              </div>
            </div>
          </div>

          <div className="backdrop-blur-xl bg-gradient-to-br from-white/30 to-white/10 border border-white/40 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{activeSuites}</div>
                <div className="text-sm text-gray-700">Active Suites</div>
              </div>
            </div>
          </div>

          <div className="backdrop-blur-xl bg-gradient-to-br from-white/30 to-white/10 border border-white/40 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{averagePassRate}%</div>
                <div className="text-sm text-gray-700">Avg. Pass Rate</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Test Suites List */}
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
        ) : testSuites.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
              <Package className="w-12 h-12 text-purple-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No Test Suites Yet</h3>
            <p className="text-gray-700 mb-6 max-w-md mx-auto">
              Create test suites to organize your tests by level (Unit, Integration, FAT, UAT, Production)
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
          <div className="space-y-4">
            {testSuites.map((suite) => {
              const isRunning = runningSuites.has(suite.id);
              const levelInfo = TEST_LEVEL_INFO[suite.test_level] || TEST_LEVEL_INFO.unit;
              
              return (
                <div
                  key={suite.id}
                  className="backdrop-blur-sm bg-white/20 border border-white/30 rounded-xl p-6 hover:bg-white/30 transition-all group"
                >
                  <div className="flex items-start gap-4">
                    <div className="text-5xl">{levelInfo.icon}</div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="text-xl font-bold text-gray-900">{suite.name}</h3>
                        <Badge className={cn("backdrop-blur-sm border", levelInfo.color)}>
                          {levelInfo.label}
                        </Badge>
                        {suite.last_status && (
                          <Badge className={cn("backdrop-blur-sm border", getStatusBadgeColor(suite.last_status))}>
                            {suite.last_status}
                          </Badge>
                        )}
                        {suite.environment && (
                          <Badge className="backdrop-blur-sm bg-white/30 border-white/40 text-gray-900 capitalize">
                            {suite.environment}
                          </Badge>
                        )}
                      </div>
                      
                      {suite.description && (
                        <p className="text-gray-700 mb-3">{suite.description}</p>
                      )}
                      
                      <div className="flex items-center gap-6 text-sm text-gray-700">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4" />
                          <span>{suite.test_case_ids?.length || 0} tests</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4" />
                          <span>{suite.pass_rate || 0}% pass rate</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Play className="w-4 h-4" />
                          <span>{suite.total_runs || 0} runs</span>
                        </div>
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
                        <TrendingUp className="w-4 h-4" />
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
              All execution history will be preserved.
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