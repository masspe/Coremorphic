import React, { useState, useEffect, useMemo } from "react";
import { Loader2, Save, RefreshCw, FileCode, Search, Download } from "lucide-react";
import { backend } from "@/api/backendClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import CodeEditor from "../CodeEditor";

const sortFiles = (files) =>
  [...files].sort((a, b) => a.path.localeCompare(b.path, undefined, { sensitivity: "base" }));

export default function CodeSection({ projectId }) {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!projectId) {
      setFiles([]);
      setSelectedFile(null);
      setFileContent("");
      setOriginalContent("");
      return;
    }
    loadFiles();
  }, [projectId]);

  useEffect(() => {
    const refreshHandler = () => {
      if (projectId) {
        loadFiles();
      }
    };

    window.addEventListener("files-updated", refreshHandler);
    return () => window.removeEventListener("files-updated", refreshHandler);
  }, [projectId]);

  const loadFiles = async () => {
    try {
      setLoading(true);
      const data = await backend.files.list(projectId);
      const sorted = sortFiles(data ?? []);
      setFiles(sorted);
      if (sorted.length > 0) {
        selectFile(sorted[0]);
      } else {
        setSelectedFile(null);
        setFileContent("");
        setOriginalContent("");
      }
    } catch (error) {
      console.error("Failed to load files", error);
      setStatus({ type: "error", message: error.message || "Failed to load files" });
    } finally {
      setLoading(false);
    }
  };

  const selectFile = (file) => {
    setSelectedFile(file);
    setFileContent(file.content ?? "");
    setOriginalContent(file.content ?? "");
    setStatus(null);
    window.dispatchEvent(new CustomEvent("file-selected", { detail: file }));
  };

  const handleSave = async () => {
    if (!projectId || !selectedFile) return;
    setSaving(true);
    setStatus(null);
    try {
      await backend.files.save(projectId, selectedFile.path, fileContent);
      setOriginalContent(fileContent);
      setStatus({ type: "success", message: "File saved" });
      window.dispatchEvent(new CustomEvent("file-saved", { detail: { path: selectedFile.path } }));
    } catch (error) {
      console.error("Failed to save file", error);
      setStatus({ type: "error", message: error.message || "Failed to save file" });
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    if (!projectId) return;
    setExporting(true);
    try {
      const { blob, filename } = await backend.files.exportZip(projectId);
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.URL.revokeObjectURL(url);
      setStatus({ type: "success", message: "Exported project as ZIP" });
    } catch (error) {
      console.error("Failed to export project", error);
      setStatus({ type: "error", message: error.message || "Failed to export project" });
    } finally {
      setExporting(false);
    }
  };

  const filteredFiles = useMemo(() => {
    if (!search) return files;
    return files.filter((file) => file.path.toLowerCase().includes(search.toLowerCase()));
  }, [files, search]);

  const languageForPath = (path = "") => {
    if (path.endsWith(".tsx")) return "typescript";
    if (path.endsWith(".ts")) return "typescript";
    if (path.endsWith(".jsx") || path.endsWith(".js")) return "javascript";
    if (path.endsWith(".json")) return "json";
    if (path.endsWith(".css")) return "css";
    if (path.endsWith(".html")) return "html";
    return "plaintext";
  };

  const hasChanges = selectedFile && fileContent !== originalContent;

  return (
    <div className="grid grid-cols-[260px_1fr] gap-6 h-full">
      <div className="border border-white/30 rounded-2xl backdrop-blur-xl bg-white/30 flex flex-col">
        <div className="p-4 border-b border-white/30">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <FileCode className="w-4 h-4" />
            Project files
          </div>
          <div className="mt-3 relative">
            <Search className="w-4 h-4 text-gray-600 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search files"
              className="pl-9 bg-white/70 border-white/40 text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full text-sm text-gray-600">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="p-6 text-sm text-gray-600">No files yet. Ask the assistant to generate some!</div>
          ) : (
            <ul className="py-2">
              {filteredFiles.map((file) => {
                const isActive = selectedFile?.path === file.path;
                return (
                  <li key={file.path}>
                    <button
                      onClick={() => selectFile(file)}
                      className={`w-full text-left px-4 py-2 text-sm transition-all ${
                        isActive
                          ? "bg-white/60 text-gray-900 font-medium"
                          : "text-gray-800 hover:bg-white/30"
                      }`}
                    >
                      {file.path}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="border border-white/30 rounded-2xl backdrop-blur-xl bg-white/40 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-white/30 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {selectedFile ? selectedFile.path : "No file selected"}
            </h3>
            {status && (
              <p
                className={`text-xs mt-1 ${
                  status.type === "success" ? "text-green-700" : "text-red-600"
                }`}
              >
                {status.message}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="bg-white/80 border-white/50"
              onClick={loadFiles}
              disabled={loading}
            >
              <RefreshCw className="w-4 h-4 mr-1" /> Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-white/80 border-white/50"
              onClick={handleExport}
              disabled={exporting || loading || files.length === 0}
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-1" />
              )}
              Export
            </Button>
            <Button
              size="sm"
              className="bg-purple-600 hover:bg-purple-700"
              onClick={handleSave}
              disabled={!hasChanges || saving}
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save
            </Button>
          </div>
        </div>

        <div className="flex-1 min-h-0">
          {selectedFile ? (
            <CodeEditor
              language={languageForPath(selectedFile.path)}
              value={fileContent}
              onChange={setFileContent}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-600">
              Select a file to view its contents.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
