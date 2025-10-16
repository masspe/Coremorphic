
import React from "react";
import { Webhook, Copy, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function APISection() {
  return (
    <div className="space-y-6">
      <div className="backdrop-blur-xl bg-white/20 border border-white/30 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Webhook className="w-8 h-8" />
              API Configuration
            </h1>
            <p className="text-gray-800 mt-2">Manage API endpoints and webhooks</p>
          </div>
          <Button className="backdrop-blur-sm bg-white/90 hover:bg-white text-purple-600 border border-white/50 shadow-xl">
            <Plus className="w-4 h-4 mr-2" />
            New Endpoint
          </Button>
        </div>

        <div className="space-y-4">
          <div className="backdrop-blur-sm bg-white/10 border border-white/20 rounded-xl p-6">
            <h3 className="text-gray-900 font-bold mb-3">Base URL</h3>
            <div className="backdrop-blur-sm bg-gray-900/80 border border-white/20 rounded-lg p-3 flex items-center justify-between">
              <code className="text-green-300 text-sm">https://api.coremorphic.app/v1/myapp</code>
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="backdrop-blur-sm bg-white/10 border border-white/20 rounded-xl p-6">
            <h3 className="text-gray-900 font-bold mb-3">API Key</h3>
            <div className="backdrop-blur-sm bg-gray-900/80 border border-white/20 rounded-lg p-3 flex items-center justify-between">
              <code className="text-purple-300 text-sm">sk_live_••••••••••••••••••••</code>
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
