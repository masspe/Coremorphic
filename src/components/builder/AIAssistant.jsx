import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Sparkles,
  Send,
  Loader2,
  MessageSquare,
  FileText,
  StickyNote,
  RefreshCw,
  FileSearch,
  Search
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchStatus, setSearchStatus] = useState(null);
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
    setSearchResults([]);
    setSearchStatus(null);
  }, [projectId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const appendMessage = useCallback((message) => {
    setMessages((prev) => [...prev, message]);
  }, [setMessages]);

  const resolveLoadingMessage = useCallback((message) => {
    setMessages((prev) => {
      const next = [...prev];
      for (let index = next.length - 1; index >= 0; index -= 1) {
        if (next[index].loading) {
          next[index] = { role: "assistant", ...(message ?? {}) };
          return next;
        }
      }
      return next.concat({ role: "assistant", ...(message ?? {}) });
    });
  }, [setMessages]);

  const formatCompilationErrors = useCallback((result) => {
    if (!result) {
      return "Build failed.";
    }

    const segments = [];
    if (result.message) {
      segments.push(result.message);
    }

    if (Array.isArray(result.errors) && result.errors.length > 0) {
      const details = result.errors
        .map((error, index) => {
          const lines = [`${index + 1}. ${error.text}`];
          const location = error.location ?? {};
          if (location.file) lines.push(`File: ${location.file}`);
          if (typeof location.line === "number") {
            const columnText =
              typeof location.column === "number" ? `, Column: ${location.column}` : "";
            lines.push(`Line: ${location.line}${columnText}`);
          }
          if (location.lineText) lines.push(`Code: ${location.lineText}`);
          return lines.join("\n");
        })
        .join("\n\n");
      segments.push(details);
    }

    return segments.join("\n\n");
  }, []);

  const attemptAutoFix = useCallback(
    async (compileResult, originalPrompt) => {
      if (!projectId || !compileResult?.errors?.length) {
        return;
      }

      appendMessage({
        role: "assistant",
        content: "Attempting automatic fix for the build errors...",
        loading: true
      });

      try {
        const response = await backend.projects.autofix(projectId, {
          errors: compileResult.errors,
          prompt: originalPrompt,
          model: selectedModel
        });

        const result = response?.result ?? {};
        const generatedFiles = Object.entries(result.files ?? {}).map(([path, content]) => ({
          path,
          content
        }));

        setFiles(generatedFiles);
        setNotes(
          result.notes ?? "Applied automatic fixes to address the reported build errors."
        );

        resolveLoadingMessage({
          content:
            result.notes ||
            `Applied automatic fixes to ${generatedFiles.length} file${
              generatedFiles.length === 1 ? "" : "s"
            }. Review the updates in the code panel.`
        });

        window.dispatchEvent(new CustomEvent("files-updated"));

        appendMessage({
          role: "assistant",
          content: "Re-running compilation after automatic fixes...",
          loading: true
        });

        const verification = await backend.projects.compile(projectId);
        if (verification?.ok) {
          resolveLoadingMessage({ content: "✅ Build passed after automatic fixes." });
        } else {
          resolveLoadingMessage({
            content: `⚠️ Build still failing after automatic fixes:\n${formatCompilationErrors(
              verification
            )}`
          });
        }
      } catch (error) {
        console.error("Automatic fix failed", error);
        resolveLoadingMessage({
          content: `Automatic fix failed: ${error.message}`
        });
      }
    },
    [projectId, selectedModel, appendMessage, resolveLoadingMessage, formatCompilationErrors]
  );

  const handleSearchSubmit = useCallback(
    async (event) => {
      event?.preventDefault();
      const query = searchQuery.trim();

      if (!query) {
        setSearchResults([]);
        setSearchStatus(null);
        return;
      }

      if (!projectId) {
        setSearchStatus({ type: "info", message: "Open or create a project to search its files." });
        return;
      }

      setIsSearching(true);
      setSearchStatus(null);

      try {
        const response = await backend.projects.search(projectId, { query, limit: 30 });
        const results = Array.isArray(response?.results) ? response.results : [];
        setSearchResults(results);

        if (results.length === 0) {
          setSearchStatus({ type: "info", message: "No matches found." });
        }
      } catch (error) {
        console.error("Search failed", error);
        setSearchResults([]);
        setSearchStatus({ type: "error", message: error.message || "Search failed" });
      } finally {
        setIsSearching(false);
      }
    },
    [projectId, searchQuery]
  );

  const handleOpenSearchResult = useCallback((result) => {
    if (!result?.path) return;

    window.dispatchEvent(
      new CustomEvent("open-file", {
        detail: {
          path: result.path,
          line: result.line,
          column: result.column
        }
      })
    );
  }, []);

  const handleSend = useCallback(async (overridePrompt) => {
    const promptToSend = typeof overridePrompt === "string" ? overridePrompt : input;
    const trimmed = promptToSend.trim();
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

      resolveLoadingMessage({
        content:
          result.notes ||
          `Generated ${generatedFiles.length} file${generatedFiles.length === 1 ? "" : "s"}. Review them in the code panel.`
      });

      window.dispatchEvent(new CustomEvent("files-updated"));

      appendMessage({
        role: "assistant",
        content: "Running compilation checks...",
        loading: true
      });

      try {
        const compilation = await backend.projects.compile(projectId);
        if (compilation?.ok) {
          resolveLoadingMessage({ content: "✅ Build passed without compile errors." });
        } else {
          resolveLoadingMessage({
            content: `⚠️ Build failed:\n${formatCompilationErrors(compilation)}`
          });

          if (Array.isArray(compilation?.errors) && compilation.errors.length > 0) {
            await attemptAutoFix(compilation, trimmed);
          }
        }
      } catch (error) {
        console.error("Compilation check failed", error);
        resolveLoadingMessage({
          content: `⚠️ Unable to complete compilation check: ${error.message}`
        });
      }
    } catch (error) {
      console.error("Generation failed", error);
      resolveLoadingMessage({
        content: `Something went wrong: ${error.message}`
      });
    } finally {
      setIsGenerating(false);
    }
  }, [
    appendMessage,
    input,
    projectId,
    isGenerating,
    memory,
    selectedModel,
    resolveLoadingMessage,
    formatCompilationErrors,
    attemptAutoFix
  ]);

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

  useEffect(() => {
    const handleExternalPrompt = (event) => {
      const detail = event.detail ?? {};
      if (!detail.prompt) {
        return;
      }

      setInput(detail.prompt);

      if (detail.autoSend) {
        handleSend(detail.prompt);
      }
    };

    window.addEventListener("ai-assistant:submit", handleExternalPrompt);
    return () => window.removeEventListener("ai-assistant:submit", handleExternalPrompt);
  }, [handleSend]);

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

        <div className="border border-white/40 rounded-xl p-3 bg-white/40">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-2">
            <FileSearch className="w-4 h-4" /> Project search
          </div>
          <form onSubmit={handleSearchSubmit} className="flex gap-2 mb-2">
            <Input
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setSearchStatus(null);
              }}
              placeholder={projectId ? "Search project files" : "Open a project to search"}
              className="bg-white/60 border-white/50 text-sm"
              disabled={!projectId || isSearching}
            />
            <Button
              type="submit"
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 text-white"
              disabled={!projectId || isSearching || !searchQuery.trim()}
            >
              {isSearching ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Searching
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </>
              )}
            </Button>
          </form>
          {searchStatus && (
            <p
              className={cn(
                "text-xs mb-2",
                searchStatus.type === "error" ? "text-red-600" : "text-gray-600"
              )}
            >
              {searchStatus.message}
            </p>
          )}
          <div className="max-h-40 overflow-y-auto space-y-2">
            {searchResults.length === 0 && !isSearching ? (
              <p className="text-xs text-gray-600">
                {projectId
                  ? "Enter a keyword to quickly find relevant code snippets."
                  : "Project search is available once a project is open."}
              </p>
            ) : (
              <ul className="space-y-2">
                {searchResults.map((result, index) => (
                  <li key={`${result.path}-${result.line}-${index}`}>
                    <button
                      type="button"
                      onClick={() => handleOpenSearchResult(result)}
                      className="w-full text-left bg-white/60 hover:bg-white/80 border border-white/60 rounded-lg px-3 py-2 transition"
                    >
                      <div className="flex items-center justify-between text-xs font-semibold text-gray-800">
                        <span className="truncate">{result.path}</span>
                        {result.line && (
                          <span className="ml-2 text-gray-600">Line {result.line}</span>
                        )}
                      </div>
                      {result.snippet && (
                        <pre className="mt-1 text-[11px] text-gray-700 whitespace-pre-wrap font-mono leading-4">
                          {result.snippet}
                        </pre>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
