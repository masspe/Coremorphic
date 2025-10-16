import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useQuery } from "@tanstack/react-query";
import { Loader2, Plus, Trash2 } from "lucide-react";

export default function EditTriggerDialog({ open, onOpenChange, trigger, onSuccess }) {
  const [updating, setUpdating] = useState(false);
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
  const [mappingFields, setMappingFields] = useState([{ target: "", source: "" }]);

  // Fetch available entities
  const { data: entities = [] } = useQuery({
    queryKey: ['app-entities', trigger?.app_id],
    queryFn: async () => {
      if (!trigger?.app_id) return [];
      const entityFiles = await base44.entities.AppFile.filter({ 
        app_id: trigger.app_id,
        type: 'entity'
      });
      return entityFiles.map(f => f.name.replace('.json', ''));
    },
    enabled: !!trigger?.app_id && open,
  });

  useEffect(() => {
    if (trigger) {
      setFormData({
        name: trigger.name || "",
        source_entity: trigger.source_entity || "",
        trigger_event: trigger.trigger_event || "create",
        target_entity: trigger.target_entity || "",
        target_action: trigger.target_action || "create",
        field_mapping: trigger.field_mapping || {},
        conditions: trigger.conditions || {},
        is_active: trigger.is_active ?? true
      });

      // Convert field_mapping object to array
      const mappings = Object.entries(trigger.field_mapping || {}).map(([target, source]) => ({
        target,
        source
      }));
      setMappingFields(mappings.length > 0 ? mappings : [{ target: "", source: "" }]);
    }
  }, [trigger]);

  const handleAddMapping = () => {
    setMappingFields([...mappingFields, { target: "", source: "" }]);
  };

  const handleRemoveMapping = (index) => {
    setMappingFields(mappingFields.filter((_, i) => i !== index));
  };

  const handleMappingChange = (index, field, value) => {
    const newMappings = [...mappingFields];
    newMappings[index][field] = value;
    setMappingFields(newMappings);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!trigger) return;

    setUpdating(true);

    try {
      // Build field mapping from array
      const fieldMapping = {};
      mappingFields.forEach(({ target, source }) => {
        if (target && source) {
          fieldMapping[target] = source;
        }
      });

      await base44.entities.Trigger.update(trigger.id, {
        ...formData,
        field_mapping: fieldMapping
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating trigger:', error);
      alert('Failed to update trigger: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };

  if (!trigger) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="backdrop-blur-xl bg-white/95 border-white/30 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Trigger</DialogTitle>
          <DialogDescription>
            Update trigger configuration
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Trigger Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                  <SelectValue />
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
                  <SelectItem value="create">Create</SelectItem>
                  <SelectItem value="update">Update</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
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
                  <SelectValue />
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
                  <SelectItem value="create">Create</SelectItem>
                  <SelectItem value="update">Update</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Field Mapping</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddMapping}
              >
                <Plus className="w-3 h-3 mr-1" />
                Add Field
              </Button>
            </div>
            <div className="space-y-2">
              {mappingFields.map((mapping, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="Target field"
                    value={mapping.target}
                    onChange={(e) => handleMappingChange(index, 'target', e.target.value)}
                  />
                  <span className="flex items-center px-2">→</span>
                  <Input
                    placeholder="Source field or $sourceId, $timestamp, $userId"
                    value={mapping.source}
                    onChange={(e) => handleMappingChange(index, 'source', e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveMapping(index)}
                    disabled={mappingFields.length === 1}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updating}>
              {updating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Trigger'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}