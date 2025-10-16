import React, { useState } from "react";
import { BarChart3, TrendingUp, Eye, Clock, Users, Activity, Calendar, Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { backend } from "@/api/backendClient";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

const COLORS = ['#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

export default function AnalyticsSection({ appId }) {
  const [timeRange, setTimeRange] = useState("7d");
  const [metricType, setMetricType] = useState("all");

  const { data: metrics = [], isLoading, refetch } = useQuery({
    queryKey: ['app-metrics', appId, timeRange],
    queryFn: async () => {
      if (!appId) return [];
      
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 1;
      const startDate = startOfDay(subDays(new Date(), days));
      
      const allMetrics = await backend.entities.AppMetric.filter({ app_id: appId });
      return allMetrics.filter(m => new Date(m.created_date) >= startDate);
    },
    enabled: !!appId,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      return await backend.entities.User.list();
    },
    initialData: [],
  });

  // Calculate summary stats
  const pageViews = metrics.filter(m => m.metric_type === 'page_view').length;
  const apiCalls = metrics.filter(m => m.metric_type === 'api_call').length;
  const userLogins = metrics.filter(m => m.metric_type === 'user_login').length;
  const errors = metrics.filter(m => m.metric_type === 'error').length;
  
  const avgSessionDuration = metrics
    .filter(m => m.metric_type === 'session_duration')
    .reduce((acc, m) => acc + m.metric_value, 0) / 
    (metrics.filter(m => m.metric_type === 'session_duration').length || 1);

  // Prepare chart data - group by day
  const chartData = React.useMemo(() => {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 1;
    const data = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = startOfDay(subDays(new Date(), i));
      const dayMetrics = metrics.filter(m => {
        const metricDate = startOfDay(new Date(m.created_date));
        return metricDate.getTime() === date.getTime();
      });
      
      data.push({
        date: format(date, 'MMM dd'),
        pageViews: dayMetrics.filter(m => m.metric_type === 'page_view').length,
        apiCalls: dayMetrics.filter(m => m.metric_type === 'api_call').length,
        users: new Set(dayMetrics.map(m => m.user_email).filter(Boolean)).size,
        errors: dayMetrics.filter(m => m.metric_type === 'error').length,
      });
    }
    
    return data;
  }, [metrics, timeRange]);

  // Top pages data
  const topPages = React.useMemo(() => {
    const pageCount = {};
    metrics
      .filter(m => m.metric_type === 'page_view' && m.page_path)
      .forEach(m => {
        pageCount[m.page_path] = (pageCount[m.page_path] || 0) + 1;
      });
    
    return Object.entries(pageCount)
      .map(([path, count]) => ({ name: path, value: count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [metrics]);

  // Metric type distribution
  const metricDistribution = React.useMemo(() => {
    const distribution = {};
    metrics.forEach(m => {
      distribution[m.metric_type] = (distribution[m.metric_type] || 0) + 1;
    });
    
    return Object.entries(distribution).map(([type, count]) => ({
      name: type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      value: count
    }));
  }, [metrics]);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const exportData = () => {
    const csv = [
      ['Date', 'Metric Type', 'Value', 'User', 'Page'].join(','),
      ...metrics.map(m => [
        m.created_date,
        m.metric_type,
        m.metric_value,
        m.user_email || 'N/A',
        m.page_path || 'N/A'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="backdrop-blur-xl bg-gradient-to-br from-white/30 to-white/10 border border-white/40 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              Analytics
            </h1>
            <p className="text-gray-800 font-medium">Track your app's performance metrics</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[140px] backdrop-blur-sm bg-white/50 border-white/40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1d">Last 24 Hours</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
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
              onClick={exportData}
              disabled={metrics.length === 0}
              className="backdrop-blur-sm bg-white/50 border-white/40"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { 
            label: "Page Views", 
            value: pageViews.toLocaleString(), 
            icon: Eye, 
            color: "from-purple-500 to-pink-500",
            change: "+12.5%",
            changePositive: true
          },
          { 
            label: "API Calls", 
            value: apiCalls.toLocaleString(), 
            icon: Activity, 
            color: "from-cyan-500 to-blue-500",
            change: "+8.3%",
            changePositive: true
          },
          { 
            label: "Avg. Session", 
            value: formatDuration(avgSessionDuration), 
            icon: Clock, 
            color: "from-green-500 to-emerald-500",
            change: "+2:15",
            changePositive: true
          },
          { 
            label: "Active Users", 
            value: users.length.toString(), 
            icon: Users, 
            color: "from-orange-500 to-red-500",
            change: "+15.2%",
            changePositive: true
          },
        ].map((stat, i) => (
          <div key={i} className="backdrop-blur-xl bg-gradient-to-br from-white/30 to-white/10 border border-white/40 rounded-2xl p-6 shadow-2xl hover:shadow-purple-500/30 transition-all duration-300 group hover:scale-105">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-4 border border-white/20 shadow-lg group-hover:shadow-xl transition-all`}>
              <stat.icon className="w-6 h-6 text-white" />
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
            <div className="flex items-center justify-between">
              <div className="text-gray-800 text-sm">{stat.label}</div>
              <Badge className={cn(
                "backdrop-blur-sm border text-xs",
                stat.changePositive 
                  ? "bg-green-500/20 border-green-500/40 text-green-900"
                  : "bg-red-500/20 border-red-500/40 text-red-900"
              )}>
                {stat.change}
              </Badge>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Over Time */}
        <div className="backdrop-blur-xl bg-gradient-to-br from-white/30 to-white/10 border border-white/40 rounded-2xl p-6 shadow-2xl">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Activity Over Time
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff40" />
              <XAxis dataKey="date" stroke="#1f2937" style={{ fontSize: '12px' }} />
              <YAxis stroke="#1f2937" style={{ fontSize: '12px' }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '12px',
                  backdropFilter: 'blur(10px)'
                }} 
              />
              <Legend />
              <Line type="monotone" dataKey="pageViews" stroke="#8b5cf6" strokeWidth={2} name="Page Views" />
              <Line type="monotone" dataKey="apiCalls" stroke="#06b6d4" strokeWidth={2} name="API Calls" />
              <Line type="monotone" dataKey="users" stroke="#10b981" strokeWidth={2} name="Active Users" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Daily Metrics */}
        <div className="backdrop-blur-xl bg-gradient-to-br from-white/30 to-white/10 border border-white/40 rounded-2xl p-6 shadow-2xl">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Daily Metrics
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff40" />
              <XAxis dataKey="date" stroke="#1f2937" style={{ fontSize: '12px' }} />
              <YAxis stroke="#1f2937" style={{ fontSize: '12px' }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '12px',
                  backdropFilter: 'blur(10px)'
                }} 
              />
              <Legend />
              <Bar dataKey="pageViews" fill="#8b5cf6" name="Page Views" />
              <Bar dataKey="apiCalls" fill="#ec4899" name="API Calls" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Metric Distribution */}
        <div className="backdrop-blur-xl bg-gradient-to-br from-white/30 to-white/10 border border-white/40 rounded-2xl p-6 shadow-2xl">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Metric Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={metricDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {metricDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '12px',
                  backdropFilter: 'blur(10px)'
                }} 
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top Pages */}
        <div className="backdrop-blur-xl bg-gradient-to-br from-white/30 to-white/10 border border-white/40 rounded-2xl p-6 shadow-2xl">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Top Pages
          </h3>
          {topPages.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-gray-600">
              <div className="text-center">
                <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No page view data yet</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {topPages.map((page, i) => {
                const maxValue = topPages[0].value;
                const percentage = (page.value / maxValue) * 100;
                
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900 truncate">{page.name}</span>
                      <Badge className="backdrop-blur-sm bg-white/30 border-white/40 text-gray-900">
                        {page.value}
                      </Badge>
                    </div>
                    <div className="h-2 backdrop-blur-sm bg-white/20 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Error Rate Alert */}
      {errors > 0 && (
        <div className="backdrop-blur-xl bg-red-500/10 border border-red-500/30 rounded-2xl p-6 shadow-2xl">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
              <Activity className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-red-900 mb-1">Error Rate Alert</h3>
              <p className="text-red-800 text-sm">
                {errors} error{errors !== 1 ? 's' : ''} detected in the selected time period. 
                Check the Logs section for details.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}