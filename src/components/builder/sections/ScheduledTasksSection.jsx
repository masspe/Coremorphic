import React, { useState } from "react";
import { Clock, Plus, Edit, Trash2, Play, Pause, CheckCircle2, AlertCircle, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { format, isPast, isFuture } from "date-fns";
import CreateTaskDialog from "../tasks/CreateTaskDialog";
import EditTaskDialog from "../tasks/EditTaskDialog";
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

export default function ScheduledTasksSection({ appId }) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['scheduled-tasks', appId],
    queryFn: async () => {
      if (!appId) return [];
      return await base44.entities.ScheduledTask.filter({ app_id: appId });
    },
    enabled: !!appId,
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['scheduled-task-logs', appId],
    queryFn: async () => {
      if (!appId) return [];
      const allLogs = await base44.entities.ScheduledTaskLog.filter({ app_id: appId });
      return allLogs.sort((a, b) => new Date(b.execution_time) - new Date(a.execution_time)).slice(0, 10);
    },
    enabled: !!appId,
  });

  const cancelTaskMutation = useMutation({
    mutationFn: async (taskId) => {
      await base44.entities.ScheduledTask.update(taskId, { 
        status: 'cancelled',
        updated_date: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-tasks', appId] });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId) => {
      await base44.entities.ScheduledTask.delete(taskId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-tasks', appId] });
      setDeleteDialogOpen(false);
      setSelectedTask(null);
    },
  });

  const handleEdit = (task) => {
    setSelectedTask(task);
    setEditDialogOpen(true);
  };

  const handleDelete = (task) => {
    setSelectedTask(task);
    setDeleteDialogOpen(true);
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      pending: "bg-yellow-500/20 border-yellow-500/40 text-yellow-900",
      active: "bg-green-500/20 border-green-500/40 text-green-900",
      completed: "bg-blue-500/20 border-blue-500/40 text-blue-900",
      failed: "bg-red-500/20 border-red-500/40 text-red-900",
      cancelled: "bg-gray-500/20 border-gray-500/40 text-gray-900"
    };
    return colors[status] || "bg-gray-500/20 border-gray-500/40 text-gray-900";
  };

  const getPriorityBadgeColor = (priority) => {
    const colors = {
      low: "bg-gray-500/20 border-gray-500/40 text-gray-900",
      medium: "bg-blue-500/20 border-blue-500/40 text-blue-900",
      high: "bg-orange-500/20 border-orange-500/40 text-orange-900",
      urgent: "bg-red-500/20 border-red-500/40 text-red-900"
    };
    return colors[priority] || "bg-gray-500/20 border-gray-500/40 text-gray-900";
  };

  const pendingTasks = tasks.filter(t => t.status === 'pending').length;
  const activeTasks = tasks.filter(t => t.status === 'active').length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const overdueTasks = tasks.filter(t => 
    t.status === 'pending' && isPast(new Date(t.scheduled_date))
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="backdrop-blur-xl bg-gradient-to-br from-white/30 to-white/10 border border-white/40 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                <Clock className="w-5 h-5 text-white" />
              </div>
              Scheduled Tasks
            </h1>
            <p className="text-gray-800 font-medium">Automate tasks based on date and time</p>
          </div>
          <Button 
            onClick={() => setCreateDialogOpen(true)}
            disabled={!appId}
            className="backdrop-blur-sm bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 shadow-xl"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Task
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      {tasks.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="backdrop-blur-xl bg-gradient-to-br from-white/30 to-white/10 border border-white/40 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{pendingTasks}</div>
                <div className="text-sm text-gray-700">Pending</div>
              </div>
            </div>
          </div>

          <div className="backdrop-blur-xl bg-gradient-to-br from-white/30 to-white/10 border border-white/40 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                <Play className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{activeTasks}</div>
                <div className="text-sm text-gray-700">Active</div>
              </div>
            </div>
          </div>

          <div className="backdrop-blur-xl bg-gradient-to-br from-white/30 to-white/10 border border-white/40 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{completedTasks}</div>
                <div className="text-sm text-gray-700">Completed</div>
              </div>
            </div>
          </div>

          <div className="backdrop-blur-xl bg-gradient-to-br from-white/30 to-white/10 border border-white/40 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{overdueTasks}</div>
                <div className="text-sm text-gray-700">Overdue</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tasks List */}
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
        ) : tasks.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
              <Clock className="w-12 h-12 text-purple-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No Scheduled Tasks</h3>
            <p className="text-gray-700 mb-6 max-w-md mx-auto">
              Create scheduled tasks to automate actions at specific times
            </p>
            <Button 
              onClick={() => setCreateDialogOpen(true)}
              disabled={!appId}
              className="backdrop-blur-sm bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 shadow-xl"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create First Task
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.map((task) => {
              const scheduledDate = new Date(task.scheduled_date);
              const isOverdue = task.status === 'pending' && isPast(scheduledDate);

              return (
                <div
                  key={task.id}
                  className={cn(
                    "backdrop-blur-sm border rounded-xl p-6 hover:bg-white/30 transition-all group",
                    isOverdue 
                      ? "bg-red-500/10 border-red-500/30"
                      : "bg-white/20 border-white/30"
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className="text-4xl">
                      {task.status === 'completed' ? '✅' : 
                       task.status === 'failed' ? '❌' :
                       task.status === 'cancelled' ? '🚫' :
                       isOverdue ? '⏰' : '📅'}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="text-xl font-bold text-gray-900">{task.name}</h3>
                        <Badge className={cn("backdrop-blur-sm border", getStatusBadgeColor(task.status))}>
                          {task.status}
                        </Badge>
                        <Badge className={cn("backdrop-blur-sm border", getPriorityBadgeColor(task.priority))}>
                          {task.priority}
                        </Badge>
                        {isOverdue && (
                          <Badge className="backdrop-blur-sm bg-red-500/20 border-red-500/40 text-red-900">
                            Overdue
                          </Badge>
                        )}
                      </div>
                      
                      {task.description && (
                        <p className="text-gray-700 mb-3">{task.description}</p>
                      )}
                      
                      <div className="flex items-center gap-6 text-sm text-gray-700 flex-wrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {format(scheduledDate, 'PPp')}
                            {isFuture(scheduledDate) && (
                              <span className="text-gray-600 ml-1">
                                ({format(scheduledDate, 'iii')})
                              </span>
                            )}
                          </span>
                        </div>
                        {task.activated_at && (
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Activated: {format(new Date(task.activated_at), 'PPp')}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {task.status === 'pending' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => cancelTaskMutation.mutate(task.id)}
                          className="text-orange-600 hover:text-orange-700"
                          title="Cancel Task"
                        >
                          <Pause className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(task)}
                        className="text-gray-800 hover:text-gray-900"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(task)}
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

      {/* Recent Scheduler Runs */}
      {logs.length > 0 && (
        <div className="backdrop-blur-xl bg-gradient-to-br from-white/30 to-white/10 border border-white/40 rounded-2xl p-6 shadow-2xl">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Recent Scheduler Runs
          </h2>
          <div className="space-y-2">
            {logs.slice(0, 5).map((log) => (
              <div
                key={log.id}
                className="backdrop-blur-sm bg-white/10 border border-white/20 rounded-lg p-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <div className="text-sm font-medium text-gray-900">
                      {format(new Date(log.execution_time), 'PPp')}
                    </div>
                  </div>
                  <div className="text-xs text-gray-600">
                    {log.execution_duration_ms}ms
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-700">
                  <span>Checked: {log.tasks_checked}</span>
                  <span>Activated: {log.tasks_activated}</span>
                  <span className="text-green-700">Success: {log.success_count}</span>
                  {log.failure_count > 0 && (
                    <span className="text-red-700">Failed: {log.failure_count}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <CreateTaskDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        appId={appId}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['scheduled-tasks', appId] });
        }}
      />

      <EditTaskDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        task={selectedTask}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['scheduled-tasks', appId] });
          setSelectedTask(null);
        }}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="backdrop-blur-xl bg-white/95 border-white/30">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Scheduled Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedTask?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTaskMutation.mutate(selectedTask?.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Task
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}