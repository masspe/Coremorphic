
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
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

export default function NewEntityDialog({ open, onOpenChange, onSuccess }) {
  const [searchParams] = useSearchParams();
  const appId = searchParams.get('appId');
  
  const [entityName, setEntityName] = useState("");
  const [schemaJson, setSchemaJson] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const handleGenerateWithAI = async () => {
    if (!aiPrompt.trim()) {
      alert('Please enter a description for the AI to generate the entity');
      return;
    }

    setGenerating(true);
    try {
      const response = await base44.functions.invoke('generateEntitySchema', {
        prompt: aiPrompt.trim() // Changed from aiPrompt to aiPrompt.trim() for safety
      });

      if (response.data.success) {
        const { entity } = response.data;
        setEntityName(entity.name);
        setSchemaJson(JSON.stringify(entity.schema, null, 2));
      } else {
        alert('Failed to generate entity: ' + (response.data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error generating entity:', error);
      alert('Failed to generate entity: ' + error.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleCreate = async () => {
    if (!entityName.trim()) {
      alert('Please enter an entity name');
      return;
    }

    if (!schemaJson.trim()) {
      alert('Please enter a schema');
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
      await base44.functions.invoke('createEntity', {
        appId: appId,
        name: entityName.trim(), // Changed entityName to name, and trimmed
        schema: JSON.parse(schemaJson)
      });

      // Reset form
      setEntityName("");
      setSchemaJson("");
      setAiPrompt("");
      
      onSuccess?.(); // Added optional chaining for onSuccess
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating entity:', error);
      alert('Failed to create entity: ' + error.message);
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
            Create New Entity
          </DialogTitle>
          <DialogDescription>
            Define a new data entity for your app
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* AI Generation Section */}
          <div className="backdrop-blur-sm bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <Label className="font-semibold text-purple-900">Generate with AI</Label>
            </div>
            <Textarea
              placeholder="Describe what data you want to store... e.g., 'A blog post with title, content, author, publish date, and tags'"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              className="mb-3 h-24"
            />
            <Button
              onClick={handleGenerateWithAI}
              disabled={generating || !aiPrompt.trim()}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Generate Entity Schema
                </>
              )}
            </Button>
          </div>

          {/* Manual Definition Section */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="entityName">Entity Name</Label>
              <Input
                id="entityName"
                placeholder="e.g., BlogPost, Product, User"
                value={entityName}
                onChange={(e) => setEntityName(e.target.value)}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="schema">JSON Schema</Label>
              <Textarea
                id="schema"
                placeholder={`{
  "name": "EntityName",
  "type": "object",
  "properties": {
    "field_name": {
      "type": "string",
      "description": "Field description"
    }
  },
  "required": ["field_name"]
}`}
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
            onClick={handleCreate}
            disabled={loading || !entityName.trim() || !schemaJson.trim()}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Database className="w-4 h-4 mr-2" />
                Create Entity
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
