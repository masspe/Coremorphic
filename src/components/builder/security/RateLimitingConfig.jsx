import React, { useState } from "react";
import { Zap, Plus, Edit, Trash2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function RateLimitingConfig({ appId }) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [formData, setFormData] = useState({
    endpoint_pattern: '',
    requests_per_minute: 60,
    requests_per_hour: 1000,
    enabled: true,
    action_on_exceed: 'block'
  });
  const queryClient = useQueryClient();

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['rate-limit-configs', appId],
    queryFn: async () => {
      if (!appId) return [];
      return await base44.entities.RateLimitConfig.filter({ app_id: appId });
    },
    enabled: !!appId,
  });

  const createConfigMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.RateLimitConfig.create({
        app_id: appId,
        ...data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rate-limit-configs', appId] });
      resetForm();
      setEditDialogOpen(false);
    },
  });

  const updateConfigMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      await base44.entities.RateLimitConfig.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rate-limit-configs', appId] });
      resetForm();
      setEditDialogOpen(false);
    },
  });

  const deleteConfigMutation = useMutation({
    mutationFn: async (id) => {
      await base44.entities.RateLimitConfig.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rate-limit-configs', appId] });
    },
  });

  const toggleConfigMutation = useMutation({
    mutationFn: async ({ id, enabled }) => {
      await base44.entities.RateLimitConfig.update(id, { enabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rate-limit-configs', appId] });
    },
  });

  const resetForm = () => {
    setFormData({
      endpoint_pattern: '',
      requests_per_minute: 60,
      requests_per_hour: 1000,
      enabled: true,
      action_on_exceed: 'block'
    });
    setSelectedConfig(null);
  };

  const handleEdit = (config) => {
    setSelectedConfig(config);
    setFormData({
      endpoint_pattern: config.endpoint_pattern,
      requests_per_minute: config.requests_per_minute,
      requests_per_hour: config.requests_per_hour,
      enabled: config.enabled,
      action_on_exceed: config.action_on_exceed
    });
    setEditDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.endpoint_pattern.trim()) {
      alert('Please enter an endpoint pattern');
      return;
    }

    if (selectedConfig) {
      updateConfigMutation.mutate({ id: selectedConfig.id, data: formData });
    } else {
      createConfigMutation.mutate(formData);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="backdrop-blur-sm bg-white/20 border border-white/30 rounded-xl p-4 animate-pulse">
            <div className="h-20 bg-white/20 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button
            onClick={() => {
              resetForm();
              setEditDialogOpen(true);
            }}
            disabled={!appId}
            className="backdrop-blur-sm bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 shadow-xl"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Rate Limit
          </Button>
        </div>

        {configs.length === 0 ? (
          <div className="backdrop-blur-sm bg-white/20 border border-white/30 rounded-xl p-12 text-center">
            <Zap className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Rate Limits Configured</h3>
            <p className="text-gray-700 mb-6">Add rate limiting rules to protect your API endpoints</p>
            <Button
              onClick={() => {
                resetForm();
                setEditDialogOpen(true);
              }}
              disabled={!appId}
              className="backdrop-blur-sm bg-white/90 hover:bg-white text-purple-600 border border-white/50"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create First Rule
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {configs.map((config) => (
              <div
                key={config.id}
                className="backdrop-blur-sm bg-white/20 border border-white/30 rounded-xl p-4 hover:bg-white/30 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <code className="text-sm font-semibold text-gray-900 backdrop-blur-sm bg-white/30 px-2 py-1 rounded">
                        {config.endpoint_pattern}
                      </code>
                      <Badge className={cn(
                        "backdrop-blur-sm border",
                        config.enabled
                          ? "bg-green-500/20 border-green-500/40 text-green-900"
                          : "bg-gray-500/20 border-gray-500/40 text-gray-900"
                      )}>
                        {config.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-700">
                      <span>{config.requests_per_minute} req/min</span>
                      <span>•</span>
                      <span>{config.requests_per_hour} req/hour</span>
                      <span>•</span>
                      <Badge className="backdrop-blur-sm bg-white/30 border-white/40 text-gray-900 text-xs">
                        {config.action_on_exceed}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={config.enabled}
                      onCheckedChange={(enabled) => toggleConfigMutation.mutate({ id: config.id, enabled })}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(config)}
                      className="text-gray-800 hover:text-gray-900"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteConfigMutation.mutate(config.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="backdrop-blur-xl bg-white/95 border-white/30">
          <DialogHeader>
            <DialogTitle>
              {selectedConfig ? 'Edit Rate Limit Rule' : 'Create Rate Limit Rule'}
            </DialogTitle>
            <DialogDescription>
              Configure rate limiting for API endpoints to prevent abuse
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="endpoint">Endpoint Pattern</Label>
              <Input
                id="endpoint"
                placeholder="/api/users/*"
                value={formData.endpoint_pattern}
                onChange={(e) => setFormData({ ...formData, endpoint_pattern: e.target.value })}
                className="backdrop-blur-sm bg-white/50 border-white/40"
              />
              <p className="text-xs text-gray-600">Use * as wildcard (e.g., /api/*)</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="per-minute">Requests per Minute</Label>
                <Input
                  id="per-minute"
                  type="number"
                  min="1"
                  value={formData.requests_per_minute}
                  onChange={(e) => setFormData({ ...formData, requests_per_minute: parseInt(e.target.value) })}
                  className="backdrop-blur-sm bg-white/50 border-white/40"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="per-hour">Requests per Hour</Label>
                <Input
                  id="per-hour"
                  type="number"
                  min="1"
                  value={formData.requests_per_hour}
                  onChange={(e) => setFormData({ ...formData, requests_per_hour: parseInt(e.target.value) })}
                  className="backdrop-blur-sm bg-white/50 border-white/40"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="action">Action on Exceed</Label>
              <Select value={formData.action_on_exceed} onValueChange={(value) => setFormData({ ...formData, action_on_exceed: value })}>
                <SelectTrigger id="action" className="backdrop-blur-sm bg-white/50 border-white/40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="block">Block Request</SelectItem>
                  <SelectItem value="throttle">Throttle (Delay)</SelectItem>
                  <SelectItem value="log">Log Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="enabled"
                checked={formData.enabled}
                onCheckedChange={(enabled) => setFormData({ ...formData, enabled })}
              />
              <Label htmlFor="enabled">Enable this rule</Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createConfigMutation.isPending || updateConfigMutation.isPending}
                className="backdrop-blur-sm bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0"
              >
                <Save className="w-4 h-4 mr-2" />
                {selectedConfig ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}