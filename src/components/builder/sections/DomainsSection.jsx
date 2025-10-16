
import React from "react";
import { Globe, Plus, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DomainsSection() {
  return (
    <div className="space-y-6">
      <div className="backdrop-blur-xl bg-white/20 border border-white/30 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Globe className="w-8 h-8" />
              Domains
            </h1>
            <p className="text-gray-800 mt-2">Manage your app's custom domains</p>
          </div>
          <Button className="backdrop-blur-sm bg-white/90 hover:bg-white text-purple-600 border border-white/50 shadow-xl">
            <Plus className="w-4 h-4 mr-2" />
            Add Domain
          </Button>
        </div>

        <div className="space-y-3">
          <div className="backdrop-blur-sm bg-white/10 border border-white/20 rounded-xl p-6 hover:bg-white/20 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-900 font-bold text-lg mb-1">myapp.coremorphic.app</div>
                <div className="text-gray-700 text-sm">Default domain • Active</div>
              </div>
              <Button variant="ghost" size="sm" className="text-gray-800 hover:text-gray-900">
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
