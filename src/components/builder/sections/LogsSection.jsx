
import React from "react";
import { ScrollText, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function LogsSection() {
  const logs = [
    { level: "info", message: "User logged in successfully", time: "10:32:15 AM" },
    { level: "success", message: "Database record created", time: "10:31:42 AM" },
    { level: "warning", message: "API rate limit approaching", time: "10:28:03 AM" },
    { level: "error", message: "Failed to load resource", time: "10:25:11 AM" },
  ];

  const levelColors = {
    info: "text-blue-300",
    success: "text-green-300",
    warning: "text-yellow-300",
    error: "text-red-300"
  };

  return (
    <div className="space-y-6">
      <div className="backdrop-blur-xl bg-white/20 border border-white/30 rounded-2xl p-6 shadow-2xl">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3 mb-6">
          <ScrollText className="w-8 h-8" />
          Application Logs
        </h1>

        <div className="backdrop-blur-sm bg-white/20 border border-white/30 rounded-xl p-3 mb-6">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-gray-700" />
            <Input
              placeholder="Search logs..."
              className="bg-transparent border-none text-gray-900 placeholder-gray-600 focus-visible:ring-0"
            />
          </div>
        </div>

        <div className="backdrop-blur-sm bg-gray-900/80 border border-white/20 rounded-xl p-4 space-y-2 font-mono text-sm max-h-96 overflow-y-auto">
          {logs.map((log, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="text-gray-400">{log.time}</span>
              <span className={`font-bold uppercase ${levelColors[log.level]}`}>[{log.level}]</span>
              <span className="text-gray-200 flex-1">{log.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
