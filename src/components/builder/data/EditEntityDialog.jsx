import React, { useState, useEffect } from "react";
import { backend } from "@/api/backendClient";
import { useSearchParams } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Database, Loader2, Sparkles, Wand2 } from "lucide-react";

export default function EditEntityDialog({ open, onOpenChange, entity, onSuccess }) {
  const [searchParams] = useSearchParams();
  const appId = searchParams.get('appId');
  
  const [entityName, setEntityName] = useState("");
  const [schemaJson, setSchemaJson] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (entity) {
      setEntityName(entity.name);
      setSchemaJson(JSON.stringify(entity.schema, null, 2));
    }
  }, [entity]);

  const handleGenerateWithAI = async () => {
    if (!aiPrompt.trim()) {
      alert('Please enter a description for the AI to modify the entity');
      return;
    }

    setGenerating(true);
    try {
      const response = await backend.functions.invoke('generateEntitySchema', {
        prompt: `Modify the existing entity "${entityName}" based on this request: ${aiPrompt}\n\nCurrent schema: ${schemaJson}`
      });

      if (response.data.success) {
        const { entity: generatedEntity } = response.data;
        setSchemaJson(JSON.stringify(generatedEntity.schema, null, 2));
      } else {
        alert('Failed to generate modifications: ' + (response.data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error generating modifications:', error);
      alert('Failed to generate modifications: ' + error.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleUpdate = async () => {
    if (!entityName.trim() || !schemaJson.trim()) {
      alert('Please fill in all fields');
      return;
    }

    try {
      JSON.parse(schemaJson);
    } catch (e) {
      alert('Invalid JSON schema: ' + e.message);
      return;
    }

    setLoading(true);
    try {
      await backend.functions.invoke('updateEntity', {
        appId: appId,
        entityPath: entity.path,
        schema: JSON.parse(schemaJson)
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating entity:', error);
      alert('Failed to update entity: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="backdrop-blur-xl bg-white/95 border-white/30 max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Edit Entity: {entity?.name}
          </DialogTitle>
          <DialogDescription>
            Modify the entity schema
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* AI Modification Section */}
          <div className="backdrop-blur-sm bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <Label className="font-semibold text-purple-900">Modify with AI</Label>
            </div>
            <Textarea
              placeholder="Describe how you want to modify this entity... e.g., 'Add a category field and make publish_date required'"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              className="mb-3 h-20"
            />
            <Button
              onClick={handleGenerateWithAI}
              disabled={generating || !aiPrompt.trim()}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Changes...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Apply AI Modifications
                </>
              )}
            </Button>
          </div>

          {/* Manual Edit Section */}
          <div className="space-y-4">
            <div>
              <Label>Entity Name</Label>
              <Input
                value={entityName}
                disabled
                className="mt-2 bg-gray-100"
              />
              <p className="text-xs text-gray-600 mt-1">Entity name cannot be changed</p>
            </div>

            <div>
              <Label htmlFor="schema">JSON Schema</Label>
              <Textarea
                id="schema"
                value={schemaJson}
                onChange={(e) => setSchemaJson(e.target.value)}
                className="mt-2 h-64 font-mono text-sm"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpdate}
            disabled={loading || !schemaJson.trim()}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Database className="w-4 h-4 mr-2" />
                Update Entity
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}