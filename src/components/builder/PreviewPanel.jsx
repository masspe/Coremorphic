import React from "react";
import { X, Monitor, Smartphone, Tablet, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function PreviewPanel({ appId, selectedFile, onClose }) {
  const [device, setDevice] = React.useState("desktop");
  const [key, setKey] = React.useState(0);

  const deviceSizes = {
    desktop: "w-full h-full",
    tablet: "w-[768px] h-[1024px] mx-auto",
    mobile: "w-[375px] h-[667px] mx-auto"
  };

  const handleRefresh = () => {
    setKey(prev => prev + 1);
  };

  // Determine preview URL
  const getPreviewUrl = () => {
    if (!appId) return null;
    
    // If a page file is selected, preview it
    if (selectedFile && selectedFile.type === 'page') {
      return `/api/functions/renderLivePage?appId=${appId}&pagePath=${encodeURIComponent(selectedFile.path)}`;
    }
    
    // Default to Home page
    return `/api/functions/renderLivePage?appId=${appId}`;
  };

  const previewUrl = getPreviewUrl();

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 25 }}
      className="fixed right-0 top-28 bottom-0 w-2/3 backdrop-blur-2xl bg-white/20 border-l border-white/30 shadow-2xl z-50 flex flex-col"
    >
      {/* Header */}
      <div className="backdrop-blur-sm bg-white/20 border-b border-white/30 p-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-bold text-gray-900">Live Preview</h3>
          <div className="flex items-center gap-2 backdrop-blur-sm bg-white/20 border border-white/30 rounded-lg p-1">
            <button
              onClick={() => setDevice("desktop")}
              className={`p-2 rounded transition-all ${
                device === "desktop" ? "bg-white/40 text-gray-900" : "text-gray-800 hover:text-gray-900"
              }`}
              title="Desktop View"
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDevice("tablet")}
              className={`p-2 rounded transition-all ${
                device === "tablet" ? "bg-white/40 text-gray-900" : "text-gray-800 hover:text-gray-900"
              }`}
              title="Tablet View"
            >
              <Tablet className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDevice("mobile")}
              className={`p-2 rounded transition-all ${
                device === "mobile" ? "bg-white/40 text-gray-900" : "text-gray-800 hover:text-gray-900"
              }`}
              title="Mobile View"
            >
              <Smartphone className="w-4 h-4" />
            </button>
          </div>
          {selectedFile && (
            <div className="text-sm text-gray-700">
              Previewing: <span className="font-medium text-gray-900">{selectedFile.name}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            className="text-gray-800 hover:text-gray-900 hover:bg-white/20"
            title="Refresh Preview"
          >
            <RefreshCw className="w-4 h-4" />
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

      {/* Preview Area */}
      <div className="flex-1 p-8 overflow-auto bg-gradient-to-br from-gray-50 to-gray-100">
        <div className={`${deviceSizes[device]} h-full transition-all duration-300`}>
          {previewUrl ? (
            <iframe
              key={key}
              src={previewUrl}
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
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Select an App</h3>
                <p className="text-gray-600">Choose an app to preview its pages</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}