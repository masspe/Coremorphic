import React, { useState } from "react";
import { backend } from "@/api/backendClient";
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
import { Sparkles, Loader2 } from "lucide-react";

export default function CreateAppDialog({ open, onClose, onProjectCreated }) {
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [instructions, setInstructions] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const reset = () => {
    setName("");
    setPrompt("");
    setInstructions("");
    setStatusMessage("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    setStatusMessage("Creating project...");

    try {
      const project = await backend.projects.create(name.trim());

      if (prompt.trim()) {
        setStatusMessage("Asking AI to generate starter files...");
        try {
          await backend.generate({
            projectId: project.id,
            prompt: prompt.trim(),
            instructions: instructions.trim() || undefined,
          });
        } catch (error) {
          console.error("Generation failed", error);
          setStatusMessage(
            "Project created, but generation failed. You can try again from the builder."
          );
        }
      }

      if (typeof onProjectCreated === "function") {
        onProjectCreated(project);
      }

      reset();
      onClose();
    } catch (error) {
      console.error("Failed to create project", error);
      alert(error.message || "Failed to create project");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent className="backdrop-blur-2xl bg-white/10 border border-white/20 text-white shadow-2xl sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Create a new project
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="space-y-2">
            <Label htmlFor="project-name" className="text-white/90">
              Project name
            </Label>
            <Input
              id="project-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="My next big idea"
              required
              disabled={isSubmitting}
              className="backdrop-blur-sm bg-white/10 border-white/20 text-white placeholder-white/40"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-prompt" className="text-white/90 flex items-center gap-2">
              AI prompt (optional)
            </Label>
            <Textarea
              id="project-prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Describe the app you want the AI to scaffold"
              disabled={isSubmitting}
              className="backdrop-blur-sm bg-white/10 border-white/20 text-white placeholder-white/40 h-28"
            />
            <p className="text-xs text-white/70">
              Provide a detailed request and the assistant will generate a Vite + React project for you.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-instructions" className="text-white/90">
              Additional instructions (optional)
            </Label>
            <Textarea
              id="project-instructions"
              value={instructions}
              onChange={(event) => setInstructions(event.target.value)}
              placeholder="Include constraints, libraries to install, or context for future generations"
              disabled={isSubmitting}
              className="backdrop-blur-sm bg-white/10 border-white/20 text-white placeholder-white/40 h-24"
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                onClose();
              }}
              disabled={isSubmitting}
              className="backdrop-blur-sm bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="backdrop-blur-sm bg-white/90 hover:bg-white text-purple-600 border border-white/50 shadow-xl"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Working...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Create project
                </>
              )}
            </Button>
          </div>

          {statusMessage && (
            <div className="text-sm text-white/80 backdrop-blur-sm bg-white/10 border border-white/20 rounded-lg p-3">
              {statusMessage}
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
