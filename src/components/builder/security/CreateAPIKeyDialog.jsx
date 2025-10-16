
import React, { useState } from "react";
import { Key, Copy, Check, AlertTriangle, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge"; // Added this import
import { backend } from "@/api/backendClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const AVAILABLE_PERMISSIONS = [
  { value: 'read', label: 'Read', description: 'View app data and resources' },
  { value: 'write', label: 'Write', description: 'Create and update data' },
  { value: 'delete', label: 'Delete', description: 'Remove data and resources' },
  { value: 'admin', label: 'Admin', description: 'Full administrative access' }
];

export default function CreateAPIKeyDialog({ open, onOpenChange, appId, onSuccess }) {
  const [name, setName] = useState("");
  const [permissions, setPermissions] = useState(['read']);
  const [creating, setCreating] = useState(false);
  const [generatedKey, setGeneratedKey] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showKey, setShowKey] = useState(true);

  const handlePermissionToggle = (permission) => {
    setPermissions(prev => {
      if (prev.includes(permission)) {
        return prev.filter(p => p !== permission);
      } else {
        return [...prev, permission];
      }
    });
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      alert('Please enter a name for the API key');
      return;
    }

    if (permissions.length === 0) {
      alert('Please select at least one permission');
      return;
    }

    try {
      setCreating(true);
      const { data } = await backend.functions.invoke('createAPIKey', {
        appId,
        name: name.trim(),
        permissions
      });

      setGeneratedKey(data.fullKey);
    } catch (error) {
      console.error('Error creating API key:', error);
      alert('Failed to create API key: ' + (error.message || 'Unknown error'));
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async () => {
    if (generatedKey) {
      await navigator.clipboard.writeText(generatedKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setName("");
    setPermissions(['read']);
    setGeneratedKey(null);
    setCopied(false);
    setShowKey(true);
    onOpenChange(false);
    if (onSuccess) {
      onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="backdrop-blur-xl bg-white/95 border-white/30 max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Key className="w-4 h-4 text-white" />
            </div>
            {generatedKey ? 'API Key Created!' : 'Create New API Key'}
          </DialogTitle>
          <DialogDescription>
            {generatedKey 
              ? 'Copy your API key now. You won\'t be able to see it again!' 
              : 'Generate a new API key for your application'}
          </DialogDescription>
        </DialogHeader>

        {!generatedKey ? (
          <div className="space-y-6 py-4">
            {/* Key Name */}
            <div className="space-y-2">
              <Label htmlFor="keyName" className="text-gray-900 font-medium">
                Key Name *
              </Label>
              <Input
                id="keyName"
                placeholder="e.g., Production API Key"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="backdrop-blur-sm bg-white/50 border-white/40"
              />
              <p className="text-xs text-gray-600">
                A descriptive name to help you identify this key
              </p>
            </div>

            {/* Permissions */}
            <div className="space-y-3">
              <Label className="text-gray-900 font-medium">
                Permissions *
              </Label>
              <div className="space-y-2">
                {AVAILABLE_PERMISSIONS.map((perm) => (
                  <div
                    key={perm.value}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer",
                      permissions.includes(perm.value)
                        ? "backdrop-blur-sm bg-purple-500/10 border-purple-500/30"
                        : "backdrop-blur-sm bg-white/30 border-white/40 hover:bg-white/50"
                    )}
                    onClick={() => handlePermissionToggle(perm.value)}
                  >
                    <Checkbox
                      checked={permissions.includes(perm.value)}
                      onCheckedChange={() => handlePermissionToggle(perm.value)}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{perm.label}</div>
                      <div className="text-xs text-gray-600">{perm.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Warning */}
            <div className="backdrop-blur-sm bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
              <div className="flex gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-orange-900">
                  <p className="font-semibold mb-1">Important Security Notice</p>
                  <p>The API key will only be shown once after creation. Make sure to copy and store it securely.</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={creating}
                className="backdrop-blur-sm bg-white/50 border-white/40"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={creating || !name.trim() || permissions.length === 0}
                className="backdrop-blur-sm bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
              >
                {creating ? 'Creating...' : 'Create API Key'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Success Message */}
            <div className="backdrop-blur-sm bg-green-500/10 border border-green-500/30 rounded-xl p-4">
              <div className="flex gap-3">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-green-900">
                  <p className="font-semibold mb-1">API Key Created Successfully!</p>
                  <p>Copy your key now. For security reasons, it won't be shown again.</p>
                </div>
              </div>
            </div>

            {/* Generated Key Display */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-gray-900 font-medium">Your API Key</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowKey(!showKey)}
                  className="text-gray-600 hover:text-gray-900"
                >
                  {showKey ? (
                    <>
                      <EyeOff className="w-4 h-4 mr-1" />
                      Hide
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4 mr-1" />
                      Show
                    </>
                  )}
                </Button>
              </div>
              <div className="backdrop-blur-sm bg-gray-900/90 border border-gray-700 rounded-xl p-4 flex items-center gap-3">
                <code className="flex-1 text-green-400 font-mono text-sm break-all">
                  {showKey ? generatedKey : '••••••••••••••••••••••••••••••••••••••••'}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="flex-shrink-0 text-gray-400 hover:text-white"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-1" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Key Details */}
            <div className="backdrop-blur-sm bg-white/30 border border-white/40 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700">Name:</span>
                <span className="font-medium text-gray-900">{name}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700">Permissions:</span>
                <div className="flex gap-1">
                  {permissions.map(perm => (
                    <Badge key={perm} className="backdrop-blur-sm bg-purple-500/20 border-purple-500/30 text-purple-900 text-xs">
                      {perm}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Final Warning */}
            <div className="backdrop-blur-sm bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <div className="flex gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-900">
                  <p className="font-semibold mb-1">⚠️ Last Chance to Copy!</p>
                  <p>Once you close this dialog, the full API key will be lost forever. Make sure you've copied it to a secure location.</p>
                </div>
              </div>
            </div>

            {/* Done Button */}
            <div className="flex justify-end pt-2">
              <Button
                onClick={handleClose}
                className="backdrop-blur-sm bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
              >
                Done - I've Copied the Key
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
