
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea"; // This import is no longer used but was part of original code, so keeping it
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
import { backend } from "@/api/backendClient";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Plus, Trash2 } from "lucide-react"; // Plus, Trash2 are no longer used but were part of original code, so keeping them for now

import FieldMappingBuilder from "./FieldMappingBuilder";
import ConditionsBuilder from "./ConditionsBuilder";

export default function CreateTriggerDialog({ open, onOpenChange, appId, onSuccess }) {
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    source_entity: "",
    trigger_event: "create",
    target_entity: "",
    target_action: "create",
    field_mapping: {},
    conditions: {},
    is_active: true
  });

  // Fetch available entities
  const { data: entities = [] } = useQuery({
    queryKey: ['app-entities', appId],
    queryFn: async () => {
      if (!appId) return [];
      const entityFiles = await backend.entities.AppFile.filter({
        app_id: appId,
        type: 'entity'
      });
      return entityFiles.map(f => f.name.replace('.json', ''));
    },
    enabled: !!appId && open,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCreating(true);

    try {
      await backend.entities.Trigger.create({
        ...formData,
        app_id: appId
      });

      onSuccess?.();
      onOpenChange(false);

      // Reset form
      setFormData({
        name: "",
        source_entity: "",
        trigger_event: "create",
        target_entity: "",
        target_action: "create",
        field_mapping: {},
        conditions: {},
        is_active: true
      });
    } catch (error) {
      console.error('Error creating trigger:', error);
      alert('Failed to create trigger: ' + error.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="backdrop-blur-xl bg-white/95 border-white/30 max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Trigger</DialogTitle>
          <DialogDescription>
            Automatically propagate data changes between entities with visual field mapping and conditions.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Trigger Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Sync Order to History"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="source_entity">Source Entity *</Label>
              <Select
                value={formData.source_entity}
                onValueChange={(value) => setFormData({ ...formData, source_entity: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select entity" />
                </SelectTrigger>
                <SelectContent>
                  {entities.map((entity) => (
                    <SelectItem key={entity} value={entity}>
                      {entity}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="trigger_event">Trigger Event *</Label>
              <Select
                value={formData.trigger_event}
                onValueChange={(value) => setFormData({ ...formData, trigger_event: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="create">On Create</SelectItem>
                  <SelectItem value="update">On Update</SelectItem>
                  <SelectItem value="delete">On Delete</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="target_entity">Target Entity *</Label>
              <Select
                value={formData.target_entity}
                onValueChange={(value) => setFormData({ ...formData, target_entity: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select entity" />
                </SelectTrigger>
                <SelectContent>
                  {entities.map((entity) => (
                    <SelectItem key={entity} value={entity}>
                      {entity}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="target_action">Target Action *</Label>
              <Select
                value={formData.target_action}
                onValueChange={(value) => setFormData({ ...formData, target_action: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="create">Create Record</SelectItem>
                  <SelectItem value="update">Update Record</SelectItem>
                  <SelectItem value="delete">Delete Record</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Visual Field Mapping Builder */}
          {formData.source_entity && formData.target_entity && (
            <FieldMappingBuilder
              sourceEntity={formData.source_entity}
              targetEntity={formData.target_entity}
              initialMapping={formData.field_mapping}
              onChange={(mapping) => setFormData({ ...formData, field_mapping: mapping })}
              appId={appId}
            />
          )}

          {/* Visual Conditions Builder */}
          {formData.source_entity && (
            <ConditionsBuilder
              sourceEntity={formData.source_entity}
              initialConditions={formData.conditions}
              onChange={(conditions) => setFormData({ ...formData, conditions: conditions })}
              appId={appId}
            />
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={creating || !formData.name || !formData.source_entity || !formData.target_entity}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Trigger'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
