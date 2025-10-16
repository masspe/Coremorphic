
import React, { useState, useEffect } from "react";
import { Bot, Loader2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
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

export default function EditAgentDialog({ open, onOpenChange, agent, onSuccess }) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    instructions: "",
    model: "gpt-4o-mini",
    whatsapp_enabled: false,
    whatsapp_greeting: ""
  });

  useEffect(() => {
    if (agent) {
      setFormData({
        name: agent.name || "",
        description: agent.description || "",
        instructions: agent.instructions || "",
        model: agent.model || "gpt-4o-mini",
        whatsapp_enabled: agent.whatsapp_enabled || false,
        whatsapp_greeting: agent.whatsapp_greeting || ""
      });
    }
  }, [agent]);

  const updateAgentMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.Agent.update(agent.id, data);
    },
    onSuccess: () => {
      onSuccess();
      onOpenChange(false);
    },
    onError: (error) => {
      console.error('Error updating agent:', error);
      alert('Failed to update agent: ' + (error.message || 'Unknown error'));
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert('Agent Name is required.');
      return;
    }
    if (!formData.description.trim()) {
      alert('Description is required.');
      return;
    }
    if (!formData.instructions.trim()) {
      alert('System Instructions are required.');
      return;
    }

    updateAgentMutation.mutate(formData);
  };

  if (!agent) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="backdrop-blur-xl bg-white/95 border-white/30 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Bot className="w-6 h-6" />
            Edit Agent
          </DialogTitle>
          <DialogDescription>
            Update your AI agent's configuration and behavior
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Agent Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Customer Support Agent"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="backdrop-blur-sm bg-white/50 border-white/40"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Describe what this agent does..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="backdrop-blur-sm bg-white/50 border-white/40 h-20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="instructions">System Instructions *</Label>
              <Textarea
                id="instructions"
                placeholder="Give detailed instructions on how the agent should behave..."
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                className="backdrop-blur-sm bg-white/50 border-white/40 h-32"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">AI Model</Label>
              <Select 
                value={formData.model} 
                onValueChange={(value) => setFormData({ ...formData, model: value })}
              >
                <SelectTrigger id="model" className="backdrop-blur-sm bg-white/50 border-white/40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-4o-mini">GPT-4o Mini (Fast & Efficient)</SelectItem>
                  <SelectItem value="gpt-4o">GPT-4o (Most Capable)</SelectItem>
                  <SelectItem value="gpt-4-turbo">GPT-4 Turbo (Balanced)</SelectItem>
                  <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo (Budget)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="whatsapp">WhatsApp Integration</Label>
                <p className="text-xs text-gray-600 mt-1">
                  Enable users to interact with this agent via WhatsApp
                </p>
              </div>
              <Switch
                id="whatsapp"
                checked={formData.whatsapp_enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, whatsapp_enabled: checked })}
              />
            </div>

            {formData.whatsapp_enabled && (
              <div className="space-y-2">
                <Label htmlFor="whatsapp_greeting">WhatsApp Greeting Message</Label>
                <Textarea
                  id="whatsapp_greeting"
                  placeholder="e.g., Hi! I'm your virtual assistant. How can I help you today?"
                  value={formData.whatsapp_greeting}
                  onChange={(e) => setFormData({ ...formData, whatsapp_greeting: e.target.value })}
                  className="backdrop-blur-sm bg-white/50 border-white/40 h-20"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="backdrop-blur-sm bg-white/50 border-white/40"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateAgentMutation.isPending}
              className="backdrop-blur-sm bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0"
            >
              {updateAgentMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
