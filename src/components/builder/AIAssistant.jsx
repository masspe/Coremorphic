import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Send, Loader2, MessageSquare, FileText, StickyNote, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { backend } from "@/api/backendClient";
import { cn } from "@/lib/utils";

const initialAssistantMessage = {
  role: "assistant",
  content:
    "👋 I'm your AI build partner. Tell me what you want to build and I'll generate React + Vite files for this project."
};

const modelOptions = [
  { id: "gpt-4o-mini", label: "gpt-4o-mini" },
  { id: "o4-mini", label: "o4-mini" },
  { id: "gpt-4.1-mini", label: "gpt-4.1-mini" }
];

export default function AIAssistant({ projectId }) {
  const [messages, setMessages] = useState([initialAssistantMessage]);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedModel, setSelectedModel] = useState(modelOptions[0].id);
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState([]);
  const [memory, setMemory] = useState("");
  const [memoryDraft, setMemoryDraft] = useState("");
  const [isSavingMemory, setIsSavingMemory] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const fetchMemory = async () => {
      if (!projectId) {
        setMemory("");
        setMemoryDraft("");
        return;
      }
      try {
        const result = await backend.memory.get(projectId);
        setMemory(result.content ?? "");
        setMemoryDraft(result.content ?? "");
      } catch (error) {
        console.error("Failed to load memory", error);
      }
    };

    fetchMemory();
  }, [projectId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const appendMessage = (message) => {
    setMessages((prev) => [...prev, message]);
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || !projectId || isGenerating) {
      return;
    }

    appendMessage({ role: "user", content: trimmed });
    appendMessage({ role: "assistant", content: "Generating...✨", loading: true });
    setInput("");
    setIsGenerating(true);

    try {
      const response = await backend.generate({
        projectId,
        prompt: trimmed,
        instructions: memory.trim() ? memory.trim() : undefined,
        model: selectedModel
      });

      const result = response?.result ?? {};
      const generatedFiles = Object.entries(result.files ?? {}).map(([path, content]) => ({
        path,
        content
      }));

      setFiles(generatedFiles);
      setNotes(result.notes ?? "Generated new files for your project.");

      setMessages((prev) =>
        prev
          .filter((message) => !message.loading)
          .concat({
            role: "assistant",
            content:
              result.notes ||
              `Generated ${generatedFiles.length} file${generatedFiles.length === 1 ? "" : "s"}. Review them in the code panel.`
          })
      );

      window.dispatchEvent(new CustomEvent("files-updated"));
    } catch (error) {
      console.error("Generation failed", error);
      setMessages((prev) =>
        prev.map((message) =>
          message.loading
            ? { role: "assistant", content: `Something went wrong: ${error.message}` }
            : message
        )
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveMemory = async () => {
    if (!projectId) return;
    setIsSavingMemory(true);
    try {
      await backend.memory.set(projectId, memoryDraft);
      setMemory(memoryDraft);
    } catch (error) {
      console.error("Failed to save memory", error);
    } finally {
      setIsSavingMemory(false);
    }
  };

  const handleKeyDown = (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="w-96 border-r border-white/30 backdrop-blur-xl bg-white/20 flex flex-col">
      <div className="p-4 border-b border-white/30">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <div>
            <h2 className="text-lg font-semibold text-gray-900">AI Assistant</h2>
            <p className="text-sm text-gray-700">Generate and iterate on your project files</p>
          </div>
        </div>
        <div className="mt-3">
          <label className="text-xs uppercase text-gray-600 block mb-1">Model</label>
          <select
            value={selectedModel}
            onChange={(event) => setSelectedModel(event.target.value)}
            className="w-full bg-white/50 border border-white/40 text-sm rounded-lg px-2 py-1"
          >
            {modelOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((message, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "rounded-2xl px-4 py-3 shadow-lg border",
              message.role === "assistant"
                ? "bg-white/70 border-white/40 text-gray-900"
                : "bg-purple-100/70 border-purple-200 text-gray-900"
            )}
          >
            <div className="flex items-center gap-2 mb-1 text-xs font-medium text-gray-600">
              {message.role === "assistant" ? <Sparkles className="w-3 h-3" /> : <MessageSquare className="w-3 h-3" />}
              {message.role === "assistant" ? "Assistant" : "You"}
            </div>
            <p className="text-sm whitespace-pre-line">
              {message.loading ? "Working on it..." : message.content}
            </p>
          </motion.div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-white/30 p-4 space-y-4">
        <div className="space-y-2">
          <label className="text-xs uppercase text-gray-600 flex items-center gap-2">
            <StickyNote className="w-3 h-3" /> Project memory
          </label>
          <Textarea
            value={memoryDraft}
            onChange={(event) => setMemoryDraft(event.target.value)}
            placeholder="Persist design choices, libraries, or instructions for future generations"
            className="bg-white/40 border-white/50 text-sm"
            rows={3}
            disabled={!projectId || isSavingMemory}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveMemory}
            disabled={!projectId || isSavingMemory || memoryDraft === memory}
            className="bg-white/70 border-white/40"
          >
            {isSavingMemory ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Save memory
          </Button>
        </div>

        <div className="space-y-2">
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={projectId ? "Describe a feature or update you'd like to build" : "Create or open a project first"}
            className="bg-white/70 border-white/60 text-gray-900"
            rows={4}
            disabled={!projectId || isGenerating}
          />
          <Button
            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            onClick={handleSend}
            disabled={!projectId || isGenerating || !input.trim()}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send prompt
              </>
            )}
          </Button>
        </div>

        {files.length > 0 && (
          <div className="border border-white/40 rounded-xl p-3 bg-white/40">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-2">
              <FileText className="w-4 h-4" /> Latest generation
            </div>
            {notes && <p className="text-xs text-gray-700 mb-2">{notes}</p>}
            <ul className="text-xs text-gray-700 space-y-1">
              {files.map((file) => (
                <li key={file.path} className="font-mono truncate">
                  {file.path}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
