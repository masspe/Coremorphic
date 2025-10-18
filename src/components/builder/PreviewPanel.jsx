import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Sandpack,
  SandpackPreview,
  SandpackLayout,
  useErrorMessage
} from "@codesandbox/sandpack-react";
import {
  X,
  Monitor,
  Smartphone,
  Tablet,
  RefreshCw,
  AlertTriangle,
  Loader2,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { backend } from "@/api/backendClient";
import { cn } from "@/lib/utils";

const deviceSizes = {
  desktop: "w-full h-full",
  tablet: "w-[768px] h-[1024px] mx-auto",
  mobile: "w-[375px] h-[667px] mx-auto"
};

const SandpackErrorBridge = ({ onErrorChange }) => {
  const errorMessage = useErrorMessage();
  const previousMessageRef = useRef();

  useEffect(() => {
    if (previousMessageRef.current !== errorMessage) {
      onErrorChange?.(errorMessage);
      previousMessageRef.current = errorMessage;
    }
  }, [errorMessage, onErrorChange]);

  return null;
};

export default function PreviewPanel({ projectId, selectedFile, onClose }) {
  const [device, setDevice] = useState("desktop");
  const [refreshKey, setRefreshKey] = useState(0);
  const [files, setFiles] = useState([]);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [runtimeError, setRuntimeError] = useState(null);

  const handleRefresh = () => {
    setRefreshKey((key) => key + 1);
    setRuntimeError(null);
  };

  useEffect(() => {
    const loadPreview = async () => {
      if (!projectId) {
        setLoading(false);
        setFiles([]);
        setStatus({
          kind: "empty",
          heading: "Select a project",
          message: "Open a project from the dashboard to start previewing.",
          icon: Monitor
        });
        setRuntimeError(null);
        return;
      }

      setLoading(true);
      setStatus(null);
      setRuntimeError(null);
      try {
        const response = await backend.files.list(projectId);
        const fileList = Array.isArray(response) ? response : [];
        setFiles(fileList);
        if (fileList.length === 0) {
          setStatus({
            kind: "empty",
            heading: "No preview yet",
            message: "Generate files with the assistant or save code to preview it.",
            icon: Monitor
          });
        } else {
          setStatus(null);
        }
      } catch (error) {
        console.error("Failed to load preview", error);
        setFiles([]);
        setStatus({
          kind: "error",
          heading: "Preview unavailable",
          message: error.message || "Failed to load project files.",
          icon: AlertTriangle
        });
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

  const activeFilePath = useMemo(() => {
    if (!selectedFile?.path) return null;
    return selectedFile.path.startsWith("/") ? selectedFile.path : `/${selectedFile.path}`;
  }, [selectedFile]);

  const sandpackFiles = useMemo(() => {
    const map = {};

    const ensure = (path, code) => {
      if (!map[path]) {
        map[path] = { code };
      }
    };

    ensure(
      "/index.html",
      `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Preview</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`
    );

    ensure(
      "/src/main.tsx",
      `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>
)`
    );

    ensure("/src/App.tsx", `export default function App(){ return <h1>Hello from preview</h1> }`);

    files.forEach((file) => {
      const normalizedPath = file.path.startsWith("/") ? file.path : `/${file.path}`;
      map[normalizedPath] = {
        code: file.content ?? "",
        active: normalizedPath === activeFilePath
      };
    });

    ensure(
      "/tsconfig.json",
      JSON.stringify(
        {
          compilerOptions: {
            target: "ES2020",
            module: "ESNext",
            jsx: "react-jsx",
            moduleResolution: "Bundler",
            esModuleInterop: true,
            strict: true,
            skipLibCheck: true
          }
        },
        null,
        2
      )
    );

    ensure(
      "/package.json",
      JSON.stringify(
        {
          name: "generated-react-app",
          version: "1.0.0",
          private: true,
          type: "module",
          scripts: {
            dev: "vite",
            build: "vite build",
            preview: "vite preview"
          },
          dependencies: {
            react: "18.2.0",
            "react-dom": "18.2.0"
          },
          devDependencies: {
            vite: "5.4.0",
            typescript: "5.6.2"
          }
        },
        null,
        2
      )
    );

    return map;
  }, [files, activeFilePath]);

  const handleRuntimeErrorChange = useCallback((message) => {
    setRuntimeError(message || null);
  }, []);

  const sendErrorToAssistant = useCallback((message) => {
    if (!message) return;

    const prompt = `The live preview encountered the following error:\n\n${message}\n\nPlease diagnose the issue and propose the necessary code changes to resolve it.`;

    window.dispatchEvent(
      new CustomEvent("ai-assistant:submit", {
        detail: {
          prompt,
          autoSend: true
        }
      })
    );
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
          {loading ? (
            <div className="h-full flex items-center justify-center backdrop-blur-xl bg-white/90 rounded-2xl shadow-2xl border border-white/50">
              <div className="text-center p-8 flex flex-col items-center gap-3 text-gray-700">
                <Loader2 className="w-8 h-8 animate-spin" />
                <p className="text-sm font-medium">Preparing live preview…</p>
              </div>
            </div>
          ) : status ? (
            <div className="h-full flex items-center justify-center backdrop-blur-xl bg-white/90 rounded-2xl shadow-2xl border border-white/50">
              <div className="text-center p-8">
                <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                  <status.icon className={`w-10 h-10 ${status.kind === "error" ? "text-red-500" : "text-purple-600"}`} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{status.heading}</h3>
                <p className="text-gray-700 text-sm max-w-md mx-auto">{status.message}</p>
                {status.kind === "error" && status.message && (
                  <Button
                    className="mt-6 bg-purple-600 hover:bg-purple-700 text-white"
                    onClick={() => sendErrorToAssistant(status.message)}
                  >
                    <Sparkles className="w-4 h-4 mr-2" /> Ask AI to fix it
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="relative h-full">
              <Sandpack
                key={refreshKey}
                template="react-ts"
                files={sandpackFiles}
                options={{
                  autorun: true,
                  recompileMode: "delayed",
                  recompileDelay: 300,
                  showTabs: false,
                  externalResources: [],
                  classes: {
                    preview: "h-full"
                  }
                }}
                customSetup={{
                  dependencies: {
                    react: "18.2.0",
                    "react-dom": "18.2.0"
                  },
                  entry: "/src/main.tsx"
                }}
              >
                <SandpackLayout style={{ height: "100%" }}>
                  <SandpackPreview
                    style={{ height: "100%" }}
                    showOpenInCodeSandbox={false}
                    showRefreshButton={false}
                    showNavigator={false}
                    showSandpackErrorOverlay={false}
                  />
                </SandpackLayout>
                <SandpackErrorBridge onErrorChange={handleRuntimeErrorChange} />
              </Sandpack>

              {runtimeError && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="backdrop-blur-xl bg-white/95 border border-red-200 rounded-2xl shadow-2xl max-w-xl mx-auto p-8 text-center space-y-4">
                    <div className="flex items-center justify-center gap-3 text-red-600">
                      <AlertTriangle className="w-6 h-6" />
                      <span className="text-lg font-semibold">Runtime error in preview</span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap text-left">
                      {runtimeError}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <Button
                        variant="outline"
                        onClick={handleRefresh}
                        className="border-red-200 text-red-600 hover:bg-red-50"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" /> Retry preview
                      </Button>
                      <Button
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                        onClick={() => sendErrorToAssistant(runtimeError)}
                      >
                        <Sparkles className="w-4 h-4 mr-2" /> Ask AI to fix it
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
