
import React, { useState } from "react";
import { Key, Trash2, Power, Copy, Check, Calendar, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
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
import { format } from "date-fns";

export default function APIKeyManagement({ appId }) {
  const [revokeDialog, setRevokeDialog] = useState({ open: false, keyId: null, keyName: null });
  const [copiedKey, setCopiedKey] = useState(null);
  const queryClient = useQueryClient();

  const { data: apiKeys = [], isLoading } = useQuery({
    queryKey: ['api-keys', appId],
    queryFn: async () => {
      if (!appId) return [];
      return await base44.entities.APIKey.filter({ app_id: appId }, '-created_date');
    },
    enabled: !!appId,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ keyId, isActive }) => {
      await base44.functions.invoke('toggleAPIKey', { keyId, isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys', appId] });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (keyId) => {
      await base44.functions.invoke('revokeAPIKey', { keyId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys', appId] });
      setRevokeDialog({ open: false, keyId: null, keyName: null });
    },
  });

  const handleCopy = (keyPrefix, keyId) => {
    navigator.clipboard.writeText(keyPrefix);
    setCopiedKey(keyId);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleRevoke = (keyId, keyName) => {
    setRevokeDialog({ open: true, keyId, keyName });
  };

  const confirmRevoke = () => {
    if (revokeDialog.keyId) {
      revokeMutation.mutate(revokeDialog.keyId);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map(i => (
          <div key={i} className="backdrop-blur-sm bg-white/10 border border-white/20 rounded-xl p-4 animate-pulse h-24" />
        ))}
      </div>
    );
  }

  if (apiKeys.length === 0) {
    return (
      <div className="backdrop-blur-sm bg-white/10 border border-white/20 rounded-xl p-8 text-center">
        <Key className="w-12 h-12 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-800 font-medium">No API keys created yet</p>
        <p className="text-gray-700 text-sm mt-1">Create your first API key to start using the API</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {apiKeys.map((apiKey) => (
          <div key={apiKey.id} className="backdrop-blur-sm bg-white/10 border border-white/20 rounded-xl p-4 hover:bg-white/15 transition-all">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h4 className="text-gray-900 font-semibold">{apiKey.name}</h4>
                  <Badge className={cn(
                    "backdrop-blur-sm border text-xs",
                    apiKey.is_active 
                      ? "bg-green-500/20 border-green-500/40 text-green-900"
                      : "bg-gray-500/20 border-gray-500/40 text-gray-900"
                  )}>
                    {apiKey.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <code className="text-xs text-purple-700 backdrop-blur-sm bg-gray-900/80 px-2 py-1 rounded border border-white/20 font-mono">
                    {apiKey.key_prefix}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(apiKey.key_prefix, apiKey.id)}
                    className="h-7 text-gray-700 hover:text-gray-900"
                  >
                    {copiedKey === apiKey.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {apiKey.permissions?.map((perm) => (
                    <Badge key={perm} className="backdrop-blur-sm bg-purple-500/10 border-purple-500/30 text-purple-900 text-xs">
                      <Shield className="w-3 h-3 mr-1" />
                      {perm}
                    </Badge>
                  ))}
                </div>
                {apiKey.last_used && (
                  <div className="flex items-center gap-1 text-xs text-gray-700 mt-2">
                    <Calendar className="w-3 h-3" />
                    Last used: {format(new Date(apiKey.last_used), 'MMM d, yyyy')}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={apiKey.is_active}
                  onCheckedChange={(checked) => toggleMutation.mutate({ keyId: apiKey.id, isActive: checked })}
                  disabled={toggleMutation.isPending}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRevoke(apiKey.id, apiKey.name)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-500/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <AlertDialog open={revokeDialog.open} onOpenChange={(open) => setRevokeDialog({ ...revokeDialog, open })}>
        <AlertDialogContent className="backdrop-blur-xl bg-white/95 border-white/30">
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API Key?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke "{revokeDialog.keyName}"? This action cannot be undone and will immediately invalidate the key.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRevoke}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Revoke Key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
