import React, { useState } from "react";
import { ScrollText, Search, Filter, Download, RefreshCw, Calendar, User, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { backend } from "@/api/backendClient";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AuditLogsViewer({ appId }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ['audit-logs', appId],
    queryFn: async () => {
      if (!appId) return [];
      const allLogs = await backend.entities.AuditLog.filter({ app_id: appId }, '-created_date', 100);
      return allLogs;
    },
    enabled: !!appId,
  });

  const filteredLogs = logs.filter(log => {
    const matchesSearch = searchQuery === "" || 
      log.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.resource_type?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesAction = actionFilter === "all" || log.action === actionFilter;
    const matchesStatus = statusFilter === "all" || log.status === statusFilter;
    
    return matchesSearch && matchesAction && matchesStatus;
  });

  const exportLogs = () => {
    const csv = [
      ['Date', 'User', 'Action', 'Resource', 'Status', 'IP Address'].join(','),
      ...filteredLogs.map(log => [
        format(new Date(log.created_date), 'yyyy-MM-dd HH:mm:ss'),
        log.user_email || 'N/A',
        log.action,
        log.resource_type || 'N/A',
        log.status,
        log.ip_address || 'N/A'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="backdrop-blur-sm bg-white/20 border border-white/30 rounded-xl p-4 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-white/20 rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-white/20 rounded w-1/3" />
                <div className="h-3 bg-white/20 rounded w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
            <Input
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 backdrop-blur-sm bg-white/50 border-white/40 text-gray-900"
            />
          </div>
        </div>
        
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[150px] backdrop-blur-sm bg-white/50 border-white/40">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="login">Login</SelectItem>
            <SelectItem value="create">Create</SelectItem>
            <SelectItem value="update">Update</SelectItem>
            <SelectItem value="delete">Delete</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px] backdrop-blur-sm bg-white/50 border-white/40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="failure">Failure</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading}
          className="backdrop-blur-sm bg-white/50 border-white/40"
        >
          <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
          Refresh
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={exportLogs}
          disabled={filteredLogs.length === 0}
          className="backdrop-blur-sm bg-white/50 border-white/40"
        >
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Logs List */}
      {filteredLogs.length === 0 ? (
        <div className="backdrop-blur-sm bg-white/20 border border-white/30 rounded-xl p-12 text-center">
          <ScrollText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Logs Found</h3>
          <p className="text-gray-700">
            {searchQuery || actionFilter !== "all" || statusFilter !== "all"
              ? "Try adjusting your filters"
              : "Audit logs will appear here as users interact with your app"}
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {filteredLogs.map((log) => (
            <div
              key={log.id}
              className="backdrop-blur-sm bg-white/20 border border-white/30 rounded-xl p-4 hover:bg-white/30 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={cn(
                      "backdrop-blur-sm border text-xs uppercase",
                      log.status === 'success'
                        ? "bg-green-500/20 border-green-500/40 text-green-900"
                        : "bg-red-500/20 border-red-500/40 text-red-900"
                    )}>
                      {log.action}
                    </Badge>
                    {log.resource_type && (
                      <span className="text-gray-700 text-sm">
                        on <span className="font-medium">{log.resource_type}</span>
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-1 text-sm text-gray-700">
                    {log.user_email && (
                      <div className="flex items-center gap-2">
                        <User className="w-3 h-3" />
                        <span>{log.user_email}</span>
                      </div>
                    )}
                    
                    {log.ip_address && (
                      <div className="flex items-center gap-2">
                        <Activity className="w-3 h-3" />
                        <span>IP: {log.ip_address}</span>
                      </div>
                    )}
                    
                    {log.details && (
                      <div className="text-gray-600 text-xs mt-1">
                        {log.details}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    <Calendar className="w-3 h-3" />
                    <span>{format(new Date(log.created_date), 'MMM dd, HH:mm')}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}