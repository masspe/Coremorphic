import React, { useState } from "react";
import { backend } from "@/api/backendClient";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, Loader2, Wand2 } from "lucide-react";

const categories = [
  "productivity",
  "business",
  "social",
  "education",
  "entertainment",
  "utilities"
];

const colorThemes = [
  { name: "purple", gradient: "from-purple-500 to-pink-500" },
  { name: "cyan", gradient: "from-cyan-500 to-blue-500" },
  { name: "green", gradient: "from-green-500 to-emerald-500" },
  { name: "orange", gradient: "from-orange-500 to-red-500" },
  { name: "pink", gradient: "from-pink-500 to-rose-500" },
];

export default function CreateAppDialog({ open, onClose, onAppCreated }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    icon: "✨",
    color: "purple",
    category: "productivity",
    status: "draft",
    generationPrompt: ""
  });
  const [loading, setLoading] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLoadingMessage("Creating app...");

    try {
      // Create the app
      const app = await backend.entities.App.create({
        name: formData.name,
        description: formData.description,
        icon: formData.icon,
        color: formData.color,
        category: formData.category,
        status: formData.status
      });

      // Check if user provided a generation prompt
      if (formData.generationPrompt && formData.generationPrompt.trim()) {
        // Use AI to generate initial code
        setGeneratingCode(true);
        setLoadingMessage("AI is generating your app code...");

        try {
          const response = await backend.functions.invoke('generateAppCode', {
            prompt: formData.generationPrompt.trim(),
            appId: app.id
          });

          console.log('Generated:', response.data);
          setLoadingMessage("Code generated successfully!");
        } catch (genError) {
          console.error('Generation error:', genError);
          // If generation fails, create default files as fallback
          setLoadingMessage("Generation failed, creating default files...");
          await createDefaultFiles(app.id, formData.name);
        }
      } else {
        // No prompt provided, create default files
        setLoadingMessage("Creating default files...");
        await createDefaultFiles(app.id, formData.name);
      }

      // Invalidate queries and call success handlers
      queryClient.invalidateQueries({ queryKey: ['apps'] });
      
      if (onAppCreated && typeof onAppCreated === 'function') {
        onAppCreated(app);
      }
      
      onClose();
      setFormData({
        name: "",
        description: "",
        icon: "✨",
        color: "purple",
        category: "productivity",
        status: "draft",
        generationPrompt: ""
      });
    } catch (error) {
      console.error('Error creating app:', error);
      alert('Failed to create app: ' + error.message);
    } finally {
      setLoading(false);
      setGeneratingCode(false);
      setLoadingMessage("");
    }
  };

  const createDefaultFiles = async (appId, appName) => {
    const defaultFiles = [
      {
        appId: appId,
        name: 'Home.jsx',
        path: 'pages/Home.jsx',
        type: 'page',
        content: `import React from "react";\nimport { motion } from "framer-motion";\n\nexport default function Home() {\n  return (\n    <div className="max-w-7xl mx-auto p-6">\n      <motion.div\n        initial={{ opacity: 0, y: 20 }}\n        animate={{ opacity: 1, y: 0 }}\n        className="backdrop-blur-xl bg-white/20 border border-white/30 rounded-2xl p-12 text-center shadow-2xl"\n      >\n        <h1 className="text-4xl font-bold text-gray-900 mb-4">Welcome to ${appName}!</h1>\n        <p className="text-gray-800 text-lg">Start building something amazing.</p>\n      </motion.div>\n    </div>\n  );\n}`,
        language: 'javascript'
      },
      {
        appId: appId,
        name: 'Layout.js',
        path: 'Layout.js',
        type: 'layout',
        content: `import React from "react";\n\nexport default function Layout({ children }) {\n  return (\n    <div className="min-h-screen">\n      {children}\n    </div>\n  );\n}`,
        language: 'javascript'
      }
    ];

    for (const file of defaultFiles) {
      await backend.functions.invoke('createAppFile', file);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="backdrop-blur-2xl bg-white/10 border border-white/20 text-white shadow-2xl sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6" />
            Create New App
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-white/90">App Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="My Amazing App"
              className="backdrop-blur-sm bg-white/10 border-white/20 text-white placeholder-white/50"
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-white/90">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="What does your app do?"
              className="backdrop-blur-sm bg-white/10 border-white/20 text-white placeholder-white/50 h-20"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="generationPrompt" className="text-white/90 flex items-center gap-2">
              <Wand2 className="w-4 h-4" />
              AI Generation Prompt (Optional)
            </Label>
            <Textarea
              id="generationPrompt"
              value={formData.generationPrompt}
              onChange={(e) => setFormData({ ...formData, generationPrompt: e.target.value })}
              placeholder="e.g., 'Create a blog app with posts and comments' or 'Build a task manager with categories and due dates'"
              className="backdrop-blur-sm bg-white/10 border-white/20 text-white placeholder-white/50 h-24"
              disabled={loading}
            />
            <p className="text-xs text-white/70">
              💡 Describe what you want to build and AI will generate the initial code and entities for you!
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="icon" className="text-white/90">Icon (Emoji)</Label>
              <Input
                id="icon"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                placeholder="✨"
                className="backdrop-blur-sm bg-white/10 border-white/20 text-white placeholder-white/50 text-center text-2xl"
                maxLength={2}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category" className="text-white/90">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
                disabled={loading}
              >
                <SelectTrigger className="backdrop-blur-sm bg-white/10 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="backdrop-blur-xl bg-gray-900/90 border-white/20">
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat} className="text-white">
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-white/90">Color Theme</Label>
            <div className="grid grid-cols-5 gap-3">
              {colorThemes.map((theme) => (
                <button
                  key={theme.name}
                  type="button"
                  onClick={() => setFormData({ ...formData, color: theme.name })}
                  disabled={loading}
                  className={`w-full h-12 rounded-xl bg-gradient-to-br ${theme.gradient} border-2 transition-all duration-300 ${
                    formData.color === theme.name
                      ? "border-white shadow-lg scale-105"
                      : "border-white/20 hover:border-white/40"
                  } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
              ))}
            </div>
          </div>

          {loading && (
            <div className="backdrop-blur-sm bg-white/20 border border-white/30 rounded-xl p-4 flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin" />
              <div>
                <p className="text-white font-medium">{loadingMessage}</p>
                {generatingCode && (
                  <p className="text-white/70 text-sm">This may take 10-30 seconds...</p>
                )}
              </div>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full backdrop-blur-sm bg-white/90 hover:bg-white text-purple-600 border border-white/50 shadow-xl py-6 text-lg font-semibold rounded-xl"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                {generatingCode ? "Generating..." : "Creating..."}
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Create App
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}