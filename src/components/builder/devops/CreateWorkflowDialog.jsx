import React, { useState } from "react";
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
import { backend } from "@/api/backendClient";
import { Loader2, Sparkles } from "lucide-react";
import YAMLEditor from "./YAMLEditor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const WORKFLOW_TEMPLATES = {
  deployment: `name: Deploy to Production
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Install dependencies
        run: npm install
      
      - name: Run tests
        run: npm test
      
      - name: Build application
        run: npm run build
      
      - name: Deploy to production
        run: npm run deploy
        env:
          DEPLOY_KEY: \${{ secrets.DEPLOY_KEY }}`,
  
  testing: `name: Run Tests
on:
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Run integration tests
        run: npm run test:integration
      
      - name: Generate coverage report
        run: npm run test:coverage`,
  
  backup: `name: Database Backup
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - name: Create database backup
        run: |
          pg_dump $DATABASE_URL > backup.sql
        env:
          DATABASE_URL: \${{ secrets.DATABASE_URL }}
      
      - name: Upload to S3
        run: |
          aws s3 cp backup.sql s3://backups/$(date +%Y%m%d)/
        env:
          AWS_ACCESS_KEY_ID: \${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: \${{ secrets.AWS_SECRET_ACCESS_KEY }}`,
  
  custom: `name: Custom Workflow
on:
  workflow_dispatch:  # Manual trigger

jobs:
  custom:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Custom step
        run: echo "Add your custom commands here"`
};

export default function CreateWorkflowDialog({ open, onOpenChange, appId, onSuccess }) {
  const [creating, setCreating] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    workflow_type: "deployment",
    trigger_type: "manual",
    environment: "development",
    is_active: true
  });
  const [yamlConfig, setYamlConfig] = useState(WORKFLOW_TEMPLATES.deployment);
  const [aiPrompt, setAiPrompt] = useState("");

  const handleTemplateChange = (type) => {
    setFormData({ ...formData, workflow_type: type });
    setYamlConfig(WORKFLOW_TEMPLATES[type] || WORKFLOW_TEMPLATES.custom);
  };

  const handleGenerateWithAI = async () => {
    if (!aiPrompt.trim()) {
      alert("Please describe what you want the workflow to do");
      return;
    }

    setGeneratingAI(true);

    try {
      const response = await backend.integrations.Core.InvokeLLM({
        prompt: `Generate a GitHub Actions YAML workflow configuration for the following requirement:

${aiPrompt}

Return ONLY the YAML configuration, no explanations. Make it production-ready with proper error handling and best practices.

The workflow should follow this general structure:
- name: descriptive name
- on: appropriate triggers
- jobs: with clear steps
- Include necessary environment variables and secrets

Format the output as valid YAML.`,
        add_context_from_internet: false
      });

      setYamlConfig(response);
    } catch (error) {
      console.error('Error generating workflow:', error);
      alert('Failed to generate workflow: ' + error.message);
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCreating(true);

    try {
      await backend.entities.Workflow.create({
        ...formData,
        app_id: appId,
        yaml_config: yamlConfig
      });

      onSuccess?.();
      onOpenChange(false);
      
      // Reset form
      setFormData({
        name: "",
        description: "",
        workflow_type: "deployment",
        trigger_type: "manual",
        environment: "development",
        is_active: true
      });
      setYamlConfig(WORKFLOW_TEMPLATES.deployment);
      setAiPrompt("");
    } catch (error) {
      console.error('Error creating workflow:', error);
      alert('Failed to create workflow: ' + error.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="backdrop-blur-xl bg-white/95 border-white/30 max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Workflow</DialogTitle>
          <DialogDescription>
            Define a CI/CD workflow with YAML configuration
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Workflow Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Deploy to Production"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="workflow_type">Workflow Type *</Label>
              <Select
                value={formData.workflow_type}
                onValueChange={handleTemplateChange}
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deployment">Deployment</SelectItem>
                  <SelectItem value="testing">Testing</SelectItem>
                  <SelectItem value="backup">Backup</SelectItem>
                  <SelectItem value="migration">Migration</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
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
              placeholder="What does this workflow do?"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="trigger_type">Trigger Type *</Label>
              <Select
                value={formData.trigger_type}
                onValueChange={(value) => setFormData({ ...formData, trigger_type: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="push">On Push</SelectItem>
                  <SelectItem value="pull_request">On Pull Request</SelectItem>
                  <SelectItem value="schedule">Scheduled</SelectItem>
                  <SelectItem value="webhook">Webhook</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="environment">Environment *</Label>
              <Select
                value={formData.environment}
                onValueChange={(value) => setFormData({ ...formData, environment: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="development">Development</SelectItem>
                  <SelectItem value="staging">Staging</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                  <SelectItem value="all">All Environments</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Tabs defaultValue="editor" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="editor">YAML Editor</TabsTrigger>
              <TabsTrigger value="ai">Generate with AI</TabsTrigger>
            </TabsList>

            <TabsContent value="editor" className="space-y-2">
              <Label>Workflow Configuration (YAML) *</Label>
              <YAMLEditor
                value={yamlConfig}
                onChange={setYamlConfig}
                height="500px"
              />
            </TabsContent>

            <TabsContent value="ai" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ai-prompt">Describe Your Workflow</Label>
                <Textarea
                  id="ai-prompt"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="E.g., Create a workflow that deploys my app to AWS when I push to the main branch, runs tests first, and sends a Slack notification on success or failure"
                  rows={6}
                />
              </div>
              <Button
                type="button"
                onClick={handleGenerateWithAI}
                disabled={generatingAI || !aiPrompt.trim()}
                className="w-full backdrop-blur-sm bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0"
              >
                {generatingAI ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating Workflow...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate with AI
                  </>
                )}
              </Button>
              {yamlConfig && (
                <div className="space-y-2 mt-4">
                  <Label>Generated Configuration</Label>
                  <YAMLEditor
                    value={yamlConfig}
                    onChange={setYamlConfig}
                    height="400px"
                  />
                </div>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={creating || !appId}
              className="backdrop-blur-sm bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Workflow'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}