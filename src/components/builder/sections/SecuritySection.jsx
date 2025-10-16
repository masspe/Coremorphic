import React, { useState } from "react";
import { Shield, Lock, Key, AlertTriangle, Plus, CheckCircle2, ScrollText, Monitor, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import CreateAPIKeyDialog from "../security/CreateAPIKeyDialog";
import APIKeyManagement from "../security/APIKeyManagement";
import AuditLogsViewer from "../security/AuditLogsViewer";
import SessionManagement from "../security/SessionManagement";
import RateLimitingConfig from "../security/RateLimitingConfig";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SecuritySection({ appId }) {
  const [createKeyDialogOpen, setCreateKeyDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch app settings to get 2FA requirement
  const { data: app } = useQuery({
    queryKey: ['app', appId],
    queryFn: async () => {
      if (!appId) return null;
      return await base44.entities.App.get(appId);
    },
    enabled: !!appId,
  });

  const { data: apiKeys = [] } = useQuery({
    queryKey: ['api-keys', appId],
    queryFn: async () => {
      if (!appId) return [];
      return await base44.entities.APIKey.filter({ app_id: appId });
    },
    enabled: !!appId,
  });

  const { data: securityAlerts = [] } = useQuery({
    queryKey: ['security-alerts', appId],
    queryFn: async () => {
      if (!appId) return [];
      return await base44.entities.SecurityAlert.filter({ app_id: appId, is_resolved: false });
    },
    enabled: !!appId,
  });

  // Mutation to update app 2FA setting
  const update2FAMutation = useMutation({
    mutationFn: async (require2FA) => {
      await base44.entities.App.update(appId, { 
        require_2fa: require2FA 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app', appId] });
    },
  });

  // Mutation to resolve security alert
  const resolveAlertMutation = useMutation({
    mutationFn: async (alertId) => {
      await base44.entities.SecurityAlert.update(alertId, {
        is_resolved: true,
        resolved_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-alerts', appId] });
    },
  });

  const activeKeys = apiKeys.filter(k => k.is_active).length;
  const unresolvedAlerts = securityAlerts.length;
  const require2FA = app?.require_2fa || false;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="backdrop-blur-xl bg-gradient-to-br from-white/30 to-white/10 border border-white/40 rounded-2xl p-6 shadow-2xl">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
            <Shield className="w-5 h-5 text-white" />
          </div>
          Security
        </h1>
        <p className="text-gray-800 font-medium">Protect your app with security features</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { 
            title: "SSL Certificate", 
            status: "Active", 
            icon: Lock, 
            color: "from-green-500 to-emerald-500",
            statusColor: "bg-green-500/20 border-green-500/40 text-green-900",
            description: "Encrypted connections"
          },
          { 
            title: "API Keys", 
            status: `${activeKeys} Active`, 
            icon: Key, 
            color: "from-purple-500 to-pink-500",
            statusColor: "bg-purple-500/20 border-purple-500/40 text-purple-900",
            description: "Manage access tokens"
          },
          { 
            title: "2FA Status", 
            status: require2FA ? "Required" : "Optional", 
            icon: Shield, 
            color: "from-cyan-500 to-blue-500",
            statusColor: require2FA 
              ? "bg-blue-500/20 border-blue-500/40 text-blue-900"
              : "bg-gray-500/20 border-gray-500/40 text-gray-900",
            description: "Two-factor authentication"
          },
          { 
            title: "Security Alerts", 
            status: unresolvedAlerts === 0 ? "No Issues" : `${unresolvedAlerts} Alert${unresolvedAlerts > 1 ? 's' : ''}`, 
            icon: AlertTriangle, 
            color: "from-orange-500 to-red-500",
            statusColor: unresolvedAlerts === 0
              ? "bg-green-500/20 border-green-500/40 text-green-900"
              : "bg-red-500/20 border-red-500/40 text-red-900",
            description: "Monitor threats"
          },
        ].map((item, i) => (
          <div key={i} className="backdrop-blur-xl bg-gradient-to-br from-white/30 to-white/10 border border-white/40 rounded-2xl p-6 shadow-2xl hover:shadow-purple-500/30 transition-all group hover:scale-105">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-4 border border-white/20 shadow-lg group-hover:shadow-xl transition-all`}>
              <item.icon className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
            <Badge className={cn("backdrop-blur-sm border mb-2", item.statusColor)}>
              {item.status}
            </Badge>
            <p className="text-sm text-gray-700">{item.description}</p>
          </div>
        ))}
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="backdrop-blur-xl bg-white/20 border border-white/30 p-1">
          <TabsTrigger value="overview" className="data-[state=active]:bg-white/40">Overview</TabsTrigger>
          <TabsTrigger value="audit-logs" className="data-[state=active]:bg-white/40">Audit Logs</TabsTrigger>
          <TabsTrigger value="sessions" className="data-[state=active]:bg-white/40">Sessions</TabsTrigger>
          <TabsTrigger value="rate-limiting" className="data-[state=active]:bg-white/40">Rate Limiting</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* 2FA Settings */}
          <div className="backdrop-blur-xl bg-gradient-to-br from-white/30 to-white/10 border border-white/40 rounded-2xl p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Two-Factor Authentication
            </h2>
            <div className="flex items-center justify-between p-4 backdrop-blur-sm bg-white/20 border border-white/30 rounded-xl">
              <div>
                <Label className="text-gray-900 font-medium">Require 2FA for all users</Label>
                <p className="text-gray-700 text-sm mt-1">Force all users to enable two-factor authentication</p>
              </div>
              <Switch
                checked={require2FA}
                onCheckedChange={(checked) => update2FAMutation.mutate(checked)}
                disabled={!appId || update2FAMutation.isPending}
              />
            </div>
          </div>

          {/* API Key Management */}
          <div className="backdrop-blur-xl bg-gradient-to-br from-white/30 to-white/10 border border-white/40 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  API Keys
                </h2>
                <p className="text-gray-700 text-sm mt-1">Manage API keys for external integrations</p>
              </div>
              <Button
                onClick={() => setCreateKeyDialogOpen(true)}
                disabled={!appId}
                className="backdrop-blur-sm bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 shadow-xl"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Key
              </Button>
            </div>

            <APIKeyManagement appId={appId} />
          </div>

          {/* Security Alerts */}
          <div className="backdrop-blur-xl bg-gradient-to-br from-white/30 to-white/10 border border-white/40 rounded-2xl p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Security Alerts
            </h2>
            {securityAlerts.length === 0 ? (
              <div className="backdrop-blur-sm bg-green-500/10 border border-green-500/30 rounded-xl p-8 text-center">
                <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
                <p className="text-green-900 font-medium text-lg">No security issues detected</p>
                <p className="text-green-800 text-sm mt-1">Your app is secure and running smoothly</p>
              </div>
            ) : (
              <div className="space-y-3">
                {securityAlerts.map((alert) => (
                  <div key={alert.id} className={cn(
                    "backdrop-blur-sm border rounded-xl p-4 transition-all",
                    alert.severity === 'critical' && "bg-red-500/10 border-red-500/30",
                    alert.severity === 'high' && "bg-orange-500/10 border-orange-500/30",
                    alert.severity === 'medium' && "bg-yellow-500/10 border-yellow-500/30",
                    alert.severity === 'low' && "bg-blue-500/10 border-blue-500/30"
                  )}>
                    <div className="flex items-start gap-3">
                      <AlertTriangle className={cn(
                        "w-5 h-5 flex-shrink-0 mt-0.5",
                        alert.severity === 'critical' && "text-red-600",
                        alert.severity === 'high' && "text-orange-600",
                        alert.severity === 'medium' && "text-yellow-600",
                        alert.severity === 'low' && "text-blue-600"
                      )} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900">{alert.title}</h4>
                          <Badge className={cn(
                            "backdrop-blur-sm border text-xs uppercase",
                            alert.severity === 'critical' && "bg-red-500/20 border-red-500/40 text-red-900",
                            alert.severity === 'high' && "bg-orange-500/20 border-orange-500/40 text-orange-900",
                            alert.severity === 'medium' && "bg-yellow-500/20 border-yellow-500/40 text-yellow-900",
                            alert.severity === 'low' && "bg-blue-500/20 border-blue-500/40 text-blue-900"
                          )}>
                            {alert.severity}
                          </Badge>
                        </div>
                        <p className="text-gray-800 text-sm mb-3">{alert.description}</p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => resolveAlertMutation.mutate(alert.id)}
                          disabled={resolveAlertMutation.isPending}
                          className="backdrop-blur-sm bg-white/30 border-white/40 hover:bg-white/50"
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Mark as Resolved
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="audit-logs">
          <div className="backdrop-blur-xl bg-gradient-to-br from-white/30 to-white/10 border border-white/40 rounded-2xl p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <ScrollText className="w-5 h-5" />
              Audit Logs
            </h2>
            <AuditLogsViewer appId={appId} />
          </div>
        </TabsContent>

        <TabsContent value="sessions">
          <div className="backdrop-blur-xl bg-gradient-to-br from-white/30 to-white/10 border border-white/40 rounded-2xl p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Monitor className="w-5 h-5" />
              Active Sessions
            </h2>
            <SessionManagement appId={appId} />
          </div>
        </TabsContent>

        <TabsContent value="rate-limiting">
          <div className="backdrop-blur-xl bg-gradient-to-br from-white/30 to-white/10 border border-white/40 rounded-2xl p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Rate Limiting Rules
            </h2>
            <RateLimitingConfig appId={appId} />
          </div>
        </TabsContent>
      </Tabs>

      <CreateAPIKeyDialog
        open={createKeyDialogOpen}
        onOpenChange={setCreateKeyDialogOpen}
        appId={appId}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['api-keys', appId] });
        }}
      />
    </div>
  );
}