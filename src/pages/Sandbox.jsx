import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ExternalLink, Monitor, Play, RefreshCw, Server, Terminal } from "lucide-react";

const DEFAULT_PREVIEW_PORT = Number(import.meta.env.VITE_SANDBOX_PREVIEW_PORT ?? 4173);
const MAX_TERMINAL_BUFFER = 60000;

const STATUS_LABELS = {
  idle: "Idle",
  connecting: "Connecting",
  connected: "Connected",
  ready: "Shell ready",
  disconnected: "Disconnected",
  stopped: "Terminal exited"
};

const STATUS_CLASSES = {
  idle: "bg-slate-100 text-slate-600 border border-slate-200",
  connecting: "bg-amber-100 text-amber-700 border border-amber-200",
  connected: "bg-sky-100 text-sky-700 border border-sky-200",
  ready: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  disconnected: "bg-slate-200 text-slate-700 border border-slate-300",
  stopped: "bg-rose-100 text-rose-700 border border-rose-200"
};

const createSocket = (projectId) =>
  io("/", {
    path: "/socket.io",
    transports: ["websocket"],
    query: { projectId }
  });

function useProjects(initialProjectId, setProjectId) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/projects");
      if (!response.ok) {
        throw new Error(`Failed to load projects (status ${response.status})`);
      }
      const data = await response.json();
      setProjects(data);

      if (!data.length) {
        setProjectId("");
        return;
      }

      const hasExistingSelection = data.some((project) => project.id === initialProjectId);
      if (!hasExistingSelection) {
        setProjectId(data[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [initialProjectId, setProjectId]);

  useEffect(() => {
    void fetchProjects();
  }, [fetchProjects]);

  return useMemo(
    () => ({
      projects,
      loading,
      error,
      refresh: fetchProjects
    }),
    [projects, loading, error, fetchProjects]
  );
}

export default function Sandbox() {
  const [projectId, setProjectId] = useState("");
  const { projects, loading, error: projectsError, refresh } = useProjects(projectId, setProjectId);
  const [terminalOutput, setTerminalOutput] = useState("");
  const [terminalStatus, setTerminalStatus] = useState("idle");
  const [terminalExitInfo, setTerminalExitInfo] = useState(null);
  const [socketError, setSocketError] = useState(null);
  const [previewError, setPreviewError] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewPort, setPreviewPort] = useState(String(DEFAULT_PREVIEW_PORT));
  const socketRef = useRef(null);
  const terminalRef = useRef(null);

  useEffect(() => {
    setPreviewPort(String(DEFAULT_PREVIEW_PORT));
  }, [projectId]);

  useEffect(() => {
    if (!projectId) {
      setTerminalStatus("idle");
      setTerminalOutput("");
      setPreviewUrl("");
      setSocketError(null);
      setPreviewError(null);
      return;
    }

    const socket = createSocket(projectId);
    socketRef.current = socket;
    setTerminalStatus("connecting");
    setTerminalOutput("");
    setPreviewUrl("");
    setTerminalExitInfo(null);
    setSocketError(null);
    setPreviewError(null);

    const handleConnect = () => setTerminalStatus("connected");
    const handleDisconnect = () => {
      setTerminalStatus("disconnected");
      setPreviewUrl("");
    };
    const handleReady = () => setTerminalStatus("ready");
    const handleData = (chunk) => {
      const text = typeof chunk === "string" ? chunk : String(chunk ?? "");
      setTerminalOutput((current) => {
        const next = current + text;
        if (next.length <= MAX_TERMINAL_BUFFER) return next;
        return next.slice(next.length - MAX_TERMINAL_BUFFER);
      });
    };
    const handleExit = (payload) => {
      setTerminalExitInfo(payload ?? null);
      setTerminalStatus("stopped");
    };
    const handleSocketError = (payload) => {
      const message = payload?.message || "Sandbox error";
      setSocketError(message);
    };
    const handleTerminalError = (payload) => {
      const message = payload?.message || "Terminal error";
      setSocketError(message);
    };
    const handlePreviewReady = (payload) => {
      setPreviewError(null);
      setPreviewUrl(payload?.url || "");
    };
    const handlePreviewClosed = () => {
      setPreviewUrl("");
    };
    const handlePreviewError = (payload) => {
      const message = payload?.message || "Preview unavailable";
      setPreviewError(message);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleSocketError);
    socket.on("terminal:ready", handleReady);
    socket.on("terminal:data", handleData);
    socket.on("terminal:exit", handleExit);
    socket.on("terminal:error", handleTerminalError);
    socket.on("sandbox:error", handleSocketError);
    socket.on("preview:ready", handlePreviewReady);
    socket.on("preview:closed", handlePreviewClosed);
    socket.on("preview:error", handlePreviewError);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleSocketError);
      socket.off("terminal:ready", handleReady);
      socket.off("terminal:data", handleData);
      socket.off("terminal:exit", handleExit);
      socket.off("terminal:error", handleTerminalError);
      socket.off("sandbox:error", handleSocketError);
      socket.off("preview:ready", handlePreviewReady);
      socket.off("preview:closed", handlePreviewClosed);
      socket.off("preview:error", handlePreviewError);
      socket.disconnect();
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
  }, [projectId]);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalOutput]);

  useEffect(() => {
    if (terminalStatus !== "ready") return undefined;
    const resolvedPort = previewPort ? Number(previewPort) : DEFAULT_PREVIEW_PORT;
    if (!Number.isInteger(resolvedPort) || resolvedPort <= 0) return undefined;
    const socket = socketRef.current;
    if (!socket) return undefined;

    socket.emit("preview:open", { port: resolvedPort });

    return () => {
      socket.emit("preview:close", { port: resolvedPort });
    };
  }, [terminalStatus, previewPort]);

  const handleCommandSubmit = useCallback(
    (event) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      const value = String(formData.get("command") ?? "").trim();
      if (!value || !socketRef.current) return;
      socketRef.current.emit("terminal:input", value.endsWith("\n") ? value : `${value}\n`);
      event.currentTarget.reset();
    },
    []
  );

  const handlePreviewReconnect = useCallback(() => {
    if (terminalStatus !== "ready" || !socketRef.current) return;
    const resolvedPort = previewPort ? Number(previewPort) : DEFAULT_PREVIEW_PORT;
    if (!Number.isInteger(resolvedPort) || resolvedPort <= 0) return;
    socketRef.current.emit("preview:open", { port: resolvedPort });
  }, [previewPort, terminalStatus]);

  const handleOpenPreviewInNewTab = useCallback(() => {
    if (!previewUrl) return;
    window.open(previewUrl, "_blank", "noopener,noreferrer");
  }, [previewUrl]);

  const activeProjectName = useMemo(() => {
    const project = projects.find((item) => item.id === projectId);
    return project?.name ?? "Select a project";
  }, [projectId, projects]);

  const statusLabel = STATUS_LABELS[terminalStatus] || STATUS_LABELS.idle;
  const statusClassName = STATUS_CLASSES[terminalStatus] || STATUS_CLASSES.idle;

  const aggregatedErrors = [projectsError, socketError, previewError].filter(Boolean);

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-white/40 bg-white/60 px-8 py-10 shadow-2xl backdrop-blur">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-500 text-white shadow-lg">
              <Play className="h-8 w-8" />
            </div>
            <h1 className="text-4xl font-bold text-slate-900">Project sandboxes</h1>
            <p className="max-w-2xl text-sm text-slate-600">
              Launch an isolated Linux workspace for each project, stream shell output directly in your browser, and preview any dev
              server exposed from the sandbox VM.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="w-full sm:w-72">
              <Select value={projectId} onValueChange={setProjectId} disabled={loading || !projects.length}>
                <SelectTrigger className="w-full bg-white/80">
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              variant="outline"
              className="bg-white/80"
              onClick={() => void refresh()}
              disabled={loading}
            >
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh projects
            </Button>
          </div>
        </div>
        {!projects.length && !loading ? (
          <p className="mt-6 text-sm text-slate-600">
            No projects found. Create a project from the builder to launch a sandbox session.
          </p>
        ) : null}
        {aggregatedErrors.length ? (
          <div className="mt-6 space-y-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {aggregatedErrors.map((message, index) => (
              <p key={index}>{message}</p>
            ))}
          </div>
        ) : null}
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-900 bg-slate-950 text-slate-100 shadow-2xl">
            <div className="flex flex-col gap-3 border-b border-slate-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="inline-flex items-center gap-2">
                  <Terminal className="h-4 w-4" /> {activeProjectName}
                </span>
                <span className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase", statusClassName)}>
                  {statusLabel}
                </span>
              </div>
              {terminalExitInfo ? (
                <span className="text-xs text-slate-400">
                  Process exited with code {String(terminalExitInfo.code ?? "?")} {terminalExitInfo.signal ? `(signal ${terminalExitInfo.signal})` : ""}
                </span>
              ) : (
                <span className="text-xs text-slate-400">Interactive shell connected to the sandbox VM.</span>
              )}
            </div>
            <div
              ref={terminalRef}
              className="h-80 overflow-auto px-5 py-4 font-mono text-xs leading-relaxed"
              data-testid="sandbox-terminal-output"
            >
              <pre className="whitespace-pre-wrap text-slate-100">{terminalOutput || "Connecting to sandbox…"}</pre>
            </div>
            <form onSubmit={handleCommandSubmit} className="flex flex-col gap-3 border-t border-slate-800 px-5 py-4 sm:flex-row sm:items-center">
              <Input
                name="command"
                placeholder="Enter a shell command (e.g. npm install)"
                className="border-slate-700 bg-slate-900 text-xs text-slate-100 placeholder:text-slate-500"
                autoComplete="off"
              />
              <Button
                type="submit"
                size="sm"
                className="bg-purple-600 text-white hover:bg-purple-700"
                disabled={terminalStatus === "disconnected" || terminalStatus === "idle"}
              >
                Send command
              </Button>
            </form>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-3xl border border-white/60 bg-white/80 shadow-xl backdrop-blur">
            <div className="flex items-center justify-between gap-2 border-b border-white/70 px-5 py-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Monitor className="h-4 w-4" /> Sandbox preview
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                Forwarded port
                <Input
                  value={previewPort}
                  onChange={(event) => {
                    const digits = event.target.value.replace(/[^0-9]/g, "");
                    setPreviewPort(digits || "");
                  }}
                  className="h-8 w-20 border-slate-200 text-xs"
                  inputMode="numeric"
                  pattern="[0-9]*"
                />
                <Button type="button" size="sm" variant="outline" className="border-slate-200" onClick={handlePreviewReconnect}>
                  <Server className="mr-2 h-4 w-4" /> Reconnect
                </Button>
              </div>
            </div>
            <div className="relative aspect-video overflow-hidden rounded-b-3xl border-t border-white/60">
              {previewUrl ? (
                <iframe
                  title="Sandbox preview"
                  src={previewUrl}
                  className="h-full w-full"
                  allow="accelerometer; ambient-light-sensor; autoplay; camera; encrypted-media; geolocation; gyroscope; microphone; midi"
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-slate-100 text-sm text-slate-500">
                  {previewError ||
                    (terminalStatus === "ready"
                      ? "Waiting for the dev server to expose a port…"
                      : "Preview available once the sandbox shell is ready.")}
                </div>
              )}
              {previewUrl ? (
                <div className="absolute bottom-4 right-4 flex items-center gap-2">
                  <Button type="button" size="sm" variant="secondary" onClick={handleOpenPreviewInNewTab}>
                    <ExternalLink className="mr-2 h-4 w-4" /> Open in new tab
                  </Button>
                </div>
              ) : null}
            </div>
          </section>

          <section className="rounded-3xl border border-white/60 bg-white/80 p-5 shadow-xl backdrop-blur">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Terminal className="h-4 w-4" /> Getting started
            </h2>
            <ol className="mt-3 space-y-2 text-sm text-slate-600">
              <li>1. Select a project above to launch its dedicated sandbox VM.</li>
              <li>
                2. Use the terminal to install dependencies and start your dev server (for example, <code>npm install</code> then{" "}
                <code>{`npm run dev -- --host --port ${previewPort || DEFAULT_PREVIEW_PORT}`}</code>).
              </li>
              <li>3. Once the server is running, the forwarded port will load inside the preview frame automatically.</li>
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
