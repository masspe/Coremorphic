import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  SandpackProvider,
  SandpackLayout,
  SandpackPreview,
  SandpackCodeEditor,
  SandpackFileExplorer,
  SandpackConsole,
  useSandpack,
  useSandpackShell,
  useSandpackShellStdout
} from "@codesandbox/sandpack-react";
import {
  ExternalLink,
  Monitor,
  Play,
  RefreshCw,
  RotateCcw,
  Terminal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  getSandboxStatus,
  canRunSandboxPreview,
  runSandboxPreviewSafely
} from "./sandboxControlsLogic";
import PropTypes from "prop-types";

const createPackageJson = (dependencies, devDependencies = {}) =>
  JSON.stringify(
    {
      name: "coremorphic-react-sandbox",
      version: "1.0.0",
      private: true,
      type: "module",
      scripts: {
        dev: "vite",
        start: "npm run dev",
        build: "vite build",
        preview: "vite preview"
      },
      dependencies,
      devDependencies
    },
    null,
    2
  );

const DEFAULT_VITE_CONFIG_JS = `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
});
`;

const DEFAULT_VITE_CONFIG_TS = `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
});
`;

const REACT_JS_PRESET = {
  label: "React + Vite (JavaScript)",
  template: "vite-react",
  entry: "/src/main.jsx",
  activeFile: "/src/App.jsx",
  environment: "node",
  dependencies: {
    react: "18.2.0",
    "react-dom": "18.2.0"
  },
  devDependencies: {
    vite: "5.4.0",
    "@vitejs/plugin-react": "4.3.4"
  },
  files: {
    "/src/App.jsx": `import { useState } from "react";
import "./App.css";

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="sandbox-app">
      <header>
        <h1>React Sandbox</h1>
        <p>
          Edit <code>src/App.jsx</code> and save to test hot module reloading.
        </p>
      </header>

      <section>
        <p>
          This playground is powered by Vite and Sandpack. You can add files,
          install dependencies, and experiment with React components in real time.
        </p>
        <button onClick={() => setCount((value) => value + 1)}>
          count is {count}
        </button>
      </section>
    </div>
  );
}
`,
    "/src/App.css": `:root {
  font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color-scheme: light;
  background-color: #f5f5f7;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: radial-gradient(circle at top, rgba(118, 87, 255, 0.12), transparent 65%),
    radial-gradient(circle at bottom, rgba(51, 153, 255, 0.12), transparent 60%),
    #f8fafc;
  min-height: 100vh;
}

.sandbox-app {
  max-width: 720px;
  margin: 0 auto;
  padding: 3rem 2.5rem 4rem;
  display: grid;
  gap: 2rem;
  background: rgba(255, 255, 255, 0.92);
  border-radius: 28px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  box-shadow: 0 30px 60px -25px rgba(15, 23, 42, 0.3);
}

.sandbox-app header h1 {
  font-size: clamp(2rem, 4vw, 2.8rem);
  margin-bottom: 0.75rem;
  color: #0f172a;
  font-weight: 800;
}

.sandbox-app header p {
  margin: 0;
  color: #475569;
  font-size: 1rem;
}

.sandbox-app section {
  display: grid;
  gap: 1.25rem;
}

.sandbox-app section p {
  margin: 0;
  line-height: 1.7;
  color: #334155;
}

.sandbox-app button {
  justify-self: start;
  padding: 0.85rem 1.5rem;
  border-radius: 9999px;
  border: none;
  font-size: 0.95rem;
  font-weight: 600;
  background: linear-gradient(135deg, #7c3aed, #a855f7);
  color: white;
  cursor: pointer;
  transition: transform 160ms ease, box-shadow 160ms ease;
  box-shadow: 0 18px 35px -18px rgba(124, 58, 237, 0.65);
}

.sandbox-app button:hover {
  transform: translateY(-1px) scale(1.01);
  box-shadow: 0 22px 45px -20px rgba(124, 58, 237, 0.75);
}
`,
    "/src/main.jsx": `import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./App.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`,
    "/index.html": `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>React Sandbox</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`,
    "/package.json": createPackageJson(
      {
        react: "18.2.0",
        "react-dom": "18.2.0"
      },
      {
        vite: "5.4.0",
        "@vitejs/plugin-react": "4.3.4"
      }
    ),
    "/vite.config.js": DEFAULT_VITE_CONFIG_JS
  }
};

const REACT_TS_PRESET = {
  label: "React + Vite (TypeScript)",
  template: "vite-react-ts",
  entry: "/src/main.tsx",
  activeFile: "/src/App.tsx",
  environment: "node",
  dependencies: {
    react: "18.2.0",
    "react-dom": "18.2.0"
  },
  devDependencies: {
    vite: "5.4.0",
    "@vitejs/plugin-react": "4.3.4",
    typescript: "5.6.2",
    "@types/react": "18.3.3",
    "@types/react-dom": "18.3.3"
  },
  files: {
    "/src/App.tsx": `import { useState } from "react";
import "./App.css";

type Todo = {
  id: number;
  title: string;
  completed: boolean;
};

const initialTodos: Todo[] = [
  { id: 1, title: "Explore the sandbox", completed: true },
  { id: 2, title: "Add a new component", completed: false },
  { id: 3, title: "Install a dependency", completed: false }
];

export default function App(): JSX.Element {
  const [todos, setTodos] = useState(initialTodos);

  const toggleTodo = (id: number) => {
    setTodos((current) =>
      current.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  return (
    <div className="sandbox-app">
      <header>
        <h1>TypeScript Sandbox</h1>
        <p>Statically typed React components with hot reloading.</p>
      </header>

      <section>
        <p>
          Hover over the todo items to see inferred types in your editor. Modify
          <code> Todo </code>
          to evolve the data model on the fly.
        </p>
        <ul>
          {todos.map((todo) => (
            <li key={todo.id}>
              <label>
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={() => toggleTodo(todo.id)}
                />
                <span className={todo.completed ? "completed" : undefined}>
                  {todo.title}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
`,
    "/src/App.css": `:root {
  font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background-color: #f5f5f7;
  color: #0f172a;
}

body {
  margin: 0;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  background: radial-gradient(circle at top, rgba(118, 87, 255, 0.12), transparent 65%),
    radial-gradient(circle at bottom, rgba(51, 153, 255, 0.12), transparent 60%),
    #f8fafc;
}

.sandbox-app {
  margin-top: 4rem;
  max-width: 760px;
  width: min(760px, 90vw);
  padding: 3rem 2.5rem 4rem;
  background: rgba(255, 255, 255, 0.92);
  border-radius: 28px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  box-shadow: 0 30px 60px -25px rgba(15, 23, 42, 0.3);
  display: grid;
  gap: 1.75rem;
}

.sandbox-app header h1 {
  font-size: clamp(2rem, 4vw, 2.8rem);
  margin-bottom: 0.75rem;
}

.sandbox-app header p {
  margin: 0;
  color: #475569;
}

.sandbox-app section ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 0.75rem;
}

.sandbox-app section li {
  background: rgba(99, 102, 241, 0.08);
  border: 1px solid rgba(99, 102, 241, 0.18);
  border-radius: 16px;
  padding: 0.85rem 1.1rem;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.sandbox-app section li:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 30px -20px rgba(99, 102, 241, 0.55);
}

.sandbox-app label {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  color: #312e81;
}

.sandbox-app input[type="checkbox"] {
  width: 1rem;
  height: 1rem;
  accent-color: #6366f1;
}

.sandbox-app .completed {
  text-decoration: line-through;
  color: #64748b;
}
`,
    "/src/main.tsx": `import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./App.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`,
    "/src/vite-env.d.ts": `/// <reference types="vite/client" />
`,
    "/tsconfig.json": JSON.stringify(
      {
        compilerOptions: {
          target: "ES2020",
          useDefineForClassFields: true,
          lib: ["DOM", "DOM.Iterable", "ES2020"],
          module: "ESNext",
          skipLibCheck: true,
          moduleResolution: "Bundler",
          allowImportingTsExtensions: true,
          resolveJsonModule: true,
          isolatedModules: true,
          noEmit: true,
          jsx: "react-jsx"
        },
        include: ["src"],
        references: []
      },
      null,
      2
    ),
    "/package.json": createPackageJson(
      {
        react: "18.2.0",
        "react-dom": "18.2.0"
      },
      {
        vite: "5.4.0",
        "@vitejs/plugin-react": "4.3.4",
        typescript: "5.6.2",
        "@types/react": "18.3.3",
        "@types/react-dom": "18.3.3"
      }
    ),
    "/vite.config.ts": DEFAULT_VITE_CONFIG_TS
  }
};

const SANDBOX_PRESETS = {
  "react-js": REACT_JS_PRESET,
  "react-ts": REACT_TS_PRESET
};

const SANDBOX_STATUS_LABELS = {
  idle: "Ready",
  running: "Compiling",
  success: "Running",
  error: "Error",
  initial: "Starting",
  done: "Running",
  timeout: "Timeout"
};

const SANDBOX_STATUS_STYLES = {
  idle: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  running: "bg-amber-100 text-amber-700 border border-amber-200",
  success: "bg-sky-100 text-sky-700 border border-sky-200",
  error: "bg-rose-100 text-rose-700 border border-rose-200",
  initial: "bg-amber-100 text-amber-700 border border-amber-200",
  done: "bg-sky-100 text-sky-700 border border-sky-200",
  timeout: "bg-rose-100 text-rose-700 border border-rose-200"
};

const TERMINAL_PROGRESS_MESSAGES = {
  downloading_manifest: "Downloading dependencies…",
  downloaded_module: "Installing dependencies…",
  starting_command: "Starting dev server…",
  command_running: "Running dev server"
};

const createFileMap = (files, activeFile) => {
  return Object.fromEntries(
    Object.entries(files).map(([path, code]) => [
      path,
      {
        code,
        active: path === activeFile
      }
    ])
  );
};

function SandboxControls({ onReset }) {
  const { sandpack } = useSandpack();
  const status = getSandboxStatus(sandpack);
  const runSandpack = sandpack?.runSandpack;
  const canRunPreview = canRunSandboxPreview(status, runSandpack);
  const { openPreview } = useSandpackShell();

  const handleRunPreview = useCallback(() => {
    if (runSandpack) {
      void runSandboxPreviewSafely(runSandpack);
    }
  }, [runSandpack]);

  const handleOpenPreview = useCallback(() => {
    if (typeof openPreview === "function") {
      openPreview();
    }
  }, [openPreview]);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/50 bg-white/80 p-4 shadow-sm backdrop-blur-sm md:flex-row md:items-center md:justify-between">
      <div className="flex flex-col gap-1 text-sm text-slate-600 md:flex-row md:items-center md:gap-3">
        <span className={cn(
          "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide",
          SANDBOX_STATUS_STYLES[status] || SANDBOX_STATUS_STYLES.idle
        )}>
          <Monitor className="h-4 w-4" />
          {SANDBOX_STATUS_LABELS[status] || SANDBOX_STATUS_LABELS.idle}
        </span>
        <span className="text-xs md:text-sm">
          Bundler status: {SANDBOX_STATUS_LABELS[status] || SANDBOX_STATUS_LABELS.idle}
        </span>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button
          type="button"
          variant="outline"
          className="bg-white/90"
          onClick={onReset}
        >
          <RefreshCw className="mr-2 h-4 w-4" /> Reset sandbox
        </Button>
        <Button
          type="button"
          className="bg-purple-600 hover:bg-purple-700"
          onClick={handleRunPreview}
          disabled={!canRunPreview}
        >
          <Play className="mr-2 h-4 w-4" /> Run preview
        </Button>
        <Button
          type="button"
          variant="outline"
          className="bg-white/90"
          onClick={handleOpenPreview}
        >
          <ExternalLink className="mr-2 h-4 w-4" /> Open preview window
        </Button>
      </div>
    </div>
  );
}

SandboxControls.propTypes = {
  onReset: PropTypes.func.isRequired
};

function SandboxTerminal() {
  const { sandpack, listen } = useSandpack();
  const { restart, openPreview } = useSandpackShell();
  const { logs, reset } = useSandpackShellStdout({
    resetOnPreviewRestart: true
  });
  const status = getSandboxStatus(sandpack);
  const statusLabel =
    SANDBOX_STATUS_LABELS[status] || SANDBOX_STATUS_LABELS.idle;
  const statusClassName =
    SANDBOX_STATUS_STYLES[status] || SANDBOX_STATUS_STYLES.idle;

  const [progress, setProgress] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const outputRef = useRef(null);

  useEffect(() => {
    const unsubscribe = listen((message) => {
      if (message.type === "shell/progress") {
        const nextState = {
          state: message.data?.state ?? null,
          command: message.data?.command?.trim() || null
        };
        setProgress(nextState);
      } else if (message.type === "done") {
        setProgress((current) =>
          current ? { ...current, state: "done" } : { state: "done" }
        );
      } else if (message.type === "urlchange" && typeof message.url === "string") {
        setPreviewUrl(message.url);
      }
    });

    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, [listen]);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [logs]);

  const command = progress?.command || "npm run dev";
  const hasLogs = logs.length > 0;
  const logText = logs.map((entry) => entry.data).join("");

  const progressLabel = useMemo(() => {
    if (status === "error" || status === "timeout") {
      return "Dev server encountered an error";
    }

    if (status === "success" || status === "done" || status === "idle") {
      return "Dev server ready";
    }

    if (progress?.state) {
      if (progress.state === "command_running") {
        return progress.command
          ? `Running "${progress.command}"`
          : TERMINAL_PROGRESS_MESSAGES.command_running;
      }

      return (
        TERMINAL_PROGRESS_MESSAGES[progress.state] ||
        "Preparing workspace…"
      );
    }

    return "Preparing workspace…";
  }, [progress, status]);

  const handleRestart = useCallback(() => {
    if (typeof restart === "function") {
      restart();
    }
    reset();
  }, [restart, reset]);

  const handleOpenPreview = useCallback(() => {
    if (previewUrl) {
      window.open(previewUrl, "_blank", "noopener,noreferrer");
      return;
    }

    if (typeof openPreview === "function") {
      openPreview();
    }
  }, [openPreview, previewUrl]);

  const handleClear = useCallback(() => {
    reset();
  }, [reset]);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/95 text-slate-100 shadow-xl">
      <div className="flex flex-col gap-3 border-b border-white/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3 text-sm font-medium">
          <span className="inline-flex items-center gap-2">
            <Terminal className="h-4 w-4" /> Dev server terminal
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide",
              statusClassName
            )}
          >
            {statusLabel}
          </span>
        </div>
        <span className="text-xs text-slate-400">{progressLabel}</span>
      </div>
      <div
        ref={outputRef}
        className="max-h-64 overflow-auto px-4 py-4 font-mono text-xs leading-relaxed"
        data-testid="sandbox-terminal-output"
      >
        <pre className="whitespace-pre-wrap">
          <span className="text-emerald-300">{`> ${command}`}</span>
          {"\n"}
          <span className="text-slate-100">
            {hasLogs ? logText : "Waiting for dev server output…"}
          </span>
        </pre>
      </div>
      <div className="flex flex-col gap-3 border-t border-white/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-xs text-slate-400">
          Output from the sandboxed Vite development server.
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-slate-700 bg-slate-900/50 text-slate-100 hover:bg-slate-900"
            onClick={handleRestart}
          >
            <RotateCcw className="h-3.5 w-3.5" /> Restart dev server
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-slate-700 bg-slate-900/50 text-slate-100 hover:bg-slate-900"
            onClick={handleOpenPreview}
            disabled={!previewUrl && status !== "done" && status !== "success" && status !== "idle"}
          >
            <ExternalLink className="h-3.5 w-3.5" /> Open in new tab
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-slate-300 hover:bg-slate-900"
            onClick={handleClear}
          >
            Clear output
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Sandbox() {
  const [presetKey, setPresetKey] = useState("react-js");
  const [sessionKey, setSessionKey] = useState(0);

  const preset = useMemo(
    () => SANDBOX_PRESETS[presetKey] ?? REACT_JS_PRESET,
    [presetKey]
  );

  const sandpackFiles = useMemo(
    () => {
      void sessionKey;
      return createFileMap(preset.files, preset.activeFile);
    },
    [preset, sessionKey]
  );

  const visibleFiles = useMemo(
    () => Object.keys(preset.files),
    [preset]
  );

  const sandpackSetup = useMemo(
    () => ({
      dependencies: preset.dependencies,
      devDependencies: preset.devDependencies,
      entry: preset.entry,
      environment: preset.environment ?? "node"
    }),
    [preset]
  );

  const handleReset = () => setSessionKey((key) => key + 1);

  const handlePresetChange = (value) => {
    setPresetKey(value);
    setSessionKey((key) => key + 1);
  };

  return (
    <div className="space-y-8">
      <div className="backdrop-blur-2xl bg-white/30 border border-white/40 rounded-3xl px-8 py-10 shadow-2xl">
        <div className="mx-auto flex max-w-4xl flex-col gap-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/90 to-indigo-500/90 text-white shadow-lg">
            <Play className="h-8 w-8" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900">Interactive React Sandbox</h1>
          <p className="text-base text-slate-700">
            Build and run React components instantly with an embedded Vite + Sandpack environment.
            Choose between JavaScript or TypeScript starters, install dependencies, and iterate in real time.
          </p>
          <div className="grid gap-4 pt-4 sm:grid-cols-3">
            {["Hot module reloading", "Full file explorer", "Live console output"].map((feature) => (
              <div
                key={feature}
                className="rounded-2xl border border-white/40 bg-white/40 px-4 py-3 text-sm font-medium text-slate-700 shadow-sm"
              >
                {feature}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-4 rounded-2xl border border-white/50 bg-white/60 p-5 shadow-xl backdrop-blur-sm md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Sandbox workspace</h2>
            <p className="text-sm text-slate-600">
              Switch starters or reset the environment to begin from a clean slate.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="w-full sm:w-60">
              <Select value={presetKey} onValueChange={handlePresetChange}>
                <SelectTrigger className="w-full bg-white/80">
                  <SelectValue placeholder="Select a starter" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SANDBOX_PRESETS).map(([value, config]) => (
                    <SelectItem key={value} value={value}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              variant="outline"
              className="bg-white/90"
              onClick={handleReset}
            >
              <RefreshCw className="mr-2 h-4 w-4" /> Reset files
            </Button>
          </div>
        </div>

        <SandpackProvider
          key={`${presetKey}-${sessionKey}`}
          template={preset.template}
          files={sandpackFiles}
          customSetup={sandpackSetup}
          options={{
            autorun: true,
            initMode: "immediate",
            activeFile: preset.activeFile,
            visibleFiles,
            editorHeight: 520,
            showTabs: true,
            closableTabs: true,
            recompileDelay: 300
          }}
          theme="light"
        >
          <div className="space-y-4">
            <SandboxControls onReset={handleReset} />

            <SandpackLayout className="overflow-hidden rounded-3xl border border-white/60 bg-white/80 shadow-2xl">
              <SandpackFileExplorer className="hidden w-64 border-r border-white/50 bg-white/70 p-4 text-sm text-slate-700 lg:block" />
              <SandpackCodeEditor
                className="!bg-white/60"
                showLineNumbers
                showInlineErrors
                wrapContent
                showTabs
              />
              <SandpackPreview
                className="!bg-white"
                showOpenInCodeSandbox
                showRefreshButton
                showRunButton
              />
            </SandpackLayout>

            <SandboxTerminal />

            <div className="rounded-2xl border border-white/60 bg-slate-950/90 text-slate-100 shadow-xl">
              <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3 text-sm font-medium">
                <Terminal className="h-4 w-4" /> Runtime console
              </div>
              <SandpackConsole
                showHeader={false}
                className="max-h-60 overflow-auto text-sm"
              />
            </div>
          </div>
        </SandpackProvider>
      </div>
    </div>
  );
}
