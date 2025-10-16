
import React from "react";
import { Settings, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function AppSettingsSection() {
  return (
    <div className="space-y-6">
      <div className="backdrop-blur-xl bg-white/20 border border-white/30 rounded-2xl p-6 shadow-2xl">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3 mb-2">
          <Settings className="w-8 h-8" />
          App Settings
        </h1>
        <p className="text-gray-800">Configure your app's basic settings</p>
      </div>

      <div className="backdrop-blur-xl bg-white/20 border border-white/30 rounded-2xl p-6 shadow-2xl">
        <form className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="appName" className="text-gray-900 font-medium">App Name</Label>
            <Input
              id="appName"
              defaultValue="My Amazing App"
              className="backdrop-blur-sm bg-white/20 border-white/30 text-gray-900"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="appDescription" className="text-gray-900 font-medium">Description</Label>
            <Textarea
              id="appDescription"
              defaultValue="A beautiful app built with Coremorphic"
              className="backdrop-blur-sm bg-white/20 border-white/30 text-gray-900 h-24"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="appUrl" className="text-gray-900 font-medium">App URL</Label>
            <Input
              id="appUrl"
              defaultValue="myapp.coremorphic.app"
              className="backdrop-blur-sm bg-white/20 border-white/30 text-gray-900"
            />
          </div>

          <Button className="backdrop-blur-sm bg-white/90 hover:bg-white text-purple-600 border border-white/50 shadow-xl">
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </form>
      </div>
    </div>
  );
}
