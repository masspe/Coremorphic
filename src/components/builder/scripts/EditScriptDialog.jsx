import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { Loader2, FileCode } from "lucide-react";

export default function EditScriptDialog({ open, onOpenChange, script, onSuccess }) {
  const [updating, setUpdating] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    script_type: "python",
    script_content: "",
    timeout_seconds: 300,
    is_active: true
  });

  useEffect(() => {
    if (script && open) {
      setFormData({
        name: script.name || "",
        description: script.description || "",
        script_type: script.script_type || "python",
        script_content: script.script_content || "",
        timeout_seconds: script.timeout_seconds || 300,
        is_active: script.is_active !== undefined ? script.is_active : true
      });
    }
  }, [script, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUpdating(true);

    try {
      await base44.entities.CustomScript.update(script.id, formData);

      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating script:', error);
      alert('Failed to update script: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="backdrop-blur-xl bg-white/95 border-white/30 max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCode className="w-5 h-5" />
            Edit Script
          </DialogTitle>
          <DialogDescription>
            Update your custom script configuration and code
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Script Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Data Processor"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="script_type">Script Type *</Label>
              <Select
                value={formData.script_type}
                onValueChange={(value) => setFormData({ ...formData, script_type: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="python">🐍 Python</SelectItem>
                  <SelectItem value="powershell">⚡ PowerShell</SelectItem>
                  <SelectItem value="bash">🔧 Bash</SelectItem>
                  <SelectItem value="javascript">📜 JavaScript</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe what this script does..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="script_content">Script Code *</Label>
            <Textarea
              id="script_content"
              value={formData.script_content}
              onChange={(e) => setFormData({ ...formData, script_content: e.target.value })}
              placeholder="Enter your script code..."
              className="font-mono text-sm h-96"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="timeout">Timeout (seconds)</Label>
            <Input
              id="timeout"
              type="number"
              value={formData.timeout_seconds}
              onChange={(e) => setFormData({ ...formData, timeout_seconds: parseInt(e.target.value) })}
              min={10}
              max={3600}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={updating}
              className="backdrop-blur-sm bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
            >
              {updating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Script'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}