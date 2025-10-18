import React, { useState, useEffect } from "react";
import { X, Monitor, Smartphone, Tablet, RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { backend } from "@/api/backendClient";
import { cn } from "@/lib/utils";

const deviceSizes = {
  desktop: "w-full h-full",
  tablet: "w-[768px] h-[1024px] mx-auto",
  mobile: "w-[375px] h-[667px] mx-auto"
};

export default function PreviewPanel({ projectId, selectedFile, onClose }) {
  const [device, setDevice] = useState("desktop");
  const [refreshKey, setRefreshKey] = useState(0);
  const [previewHtml, setPreviewHtml] = useState("");
  const [buildError, setBuildError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleRefresh = () => {
    setRefreshKey((key) => key + 1);
  };

  useEffect(() => {
    const loadPreview = async () => {
      if (!projectId) {
        setPreviewHtml("");
        setBuildError("Select a project to preview.");
        return;
      }

      setLoading(true);
      setBuildError(null);
      try {
        const response = await backend.request(`/projects/${projectId}/preview`);
        setPreviewHtml(response?.html ?? "");
        if (!response?.html) {
          setBuildError("No previewable files were returned for this project.");
        }
      } catch (error) {
        setPreviewHtml("");
        setBuildError(error.message || "Failed to build preview");
      } finally {
        setLoading(false);
      }
    };

    loadPreview();
  }, [projectId, refreshKey]);

  useEffect(() => {
    const onFileSaved = () => setRefreshKey((key) => key + 1);
    window.addEventListener("file-saved", onFileSaved);
    return () => window.removeEventListener("file-saved", onFileSaved);
  }, []);

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 25 }}
      className="fixed right-0 top-28 bottom-0 w-2/3 backdrop-blur-2xl bg-white/20 border-l border-white/30 shadow-2xl z-50 flex flex-col"
    >
      <div className="backdrop-blur-sm bg-white/20 border-b border-white/30 p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-bold text-gray-900">Live Preview</h3>
          <div className="flex items-center gap-2 backdrop-blur-sm bg-white/20 border border-white/30 rounded-lg p-1">
            <button
              onClick={() => setDevice("desktop")}
              className={cn("p-2 rounded transition-all", device === "desktop" ? "bg-white/40 text-gray-900" : "text-gray-800 hover:text-gray-900")}
              title="Desktop view"
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDevice("tablet")}
              className={cn("p-2 rounded transition-all", device === "tablet" ? "bg-white/40 text-gray-900" : "text-gray-800 hover:text-gray-900")}
              title="Tablet view"
            >
              <Tablet className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDevice("mobile")}
              className={cn("p-2 rounded transition-all", device === "mobile" ? "bg-white/40 text-gray-900" : "text-gray-800 hover:text-gray-900")}
              title="Mobile view"
            >
              <Smartphone className="w-4 h-4" />
            </button>
          </div>
          {selectedFile && (
            <div className="text-sm text-gray-700">
              Previewing: <span className="font-medium text-gray-900">{selectedFile.name || selectedFile.path}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            className="text-gray-800 hover:text-gray-900 hover:bg-white/20"
            title="Rebuild preview"
            disabled={loading}
          >
            <RefreshCw className={loading ? "w-4 h-4 mr-1 animate-spin" : "w-4 h-4"} />
            {loading ? "Building" : "Refresh"}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-gray-800 hover:text-gray-900 hover:bg-white/20"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 p-8 overflow-auto bg-gradient-to-br from-gray-50 to-gray-100">
        <div className={`${deviceSizes[device]} h-full transition-all duration-300`}>
          {buildError ? (
            <div className="h-full flex items-center justify-center backdrop-blur-xl bg-white/90 rounded-2xl shadow-2xl border border-white/50">
              <div className="text-center p-8">
                <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-red-100 to-orange-100 flex items-center justify-center">
                  <AlertTriangle className="w-10 h-10 text-red-500" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Preview unavailable</h3>
                <p className="text-gray-700 text-sm max-w-md mx-auto">{buildError}</p>
              </div>
            </div>
          ) : previewHtml ? (
            <iframe
              key={refreshKey}
              srcDoc={previewHtml}
              className="w-full h-full backdrop-blur-xl bg-white rounded-2xl shadow-2xl border border-white/50"
              title="App Preview"
              sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
            />
          ) : (
            <div className="h-full flex items-center justify-center backdrop-blur-xl bg-white/90 rounded-2xl shadow-2xl border border-white/50">
              <div className="text-center p-8">
                <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                  <Monitor className="w-10 h-10 text-purple-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">No preview yet</h3>
                <p className="text-gray-700 text-sm">Generate files with the assistant or select a project to preview.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
