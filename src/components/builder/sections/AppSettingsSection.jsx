
import React from "react";
import { Settings, Save, AlertTriangle, Trash2, Globe, User, CalendarDays, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function AppSettingsSection({ projectId }) {
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="appName" className="text-gray-900 font-medium">App Name</Label>
              <Input
                id="appName"
                defaultValue="My Amazing App"
                className="backdrop-blur-sm bg-white/20 border-white/30 text-gray-900"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="appTagline" className="text-gray-900 font-medium">Tagline</Label>
              <Input
                id="appTagline"
                defaultValue="Build intelligent experiences effortlessly"
                className="backdrop-blur-sm bg-white/20 border-white/30 text-gray-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="appDescription" className="text-gray-900 font-medium">Description</Label>
              <Textarea
                id="appDescription"
                defaultValue="A beautiful app built with Coremorphic"
                className="backdrop-blur-sm bg-white/20 border-white/30 text-gray-900 h-32"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="appCategory" className="text-gray-900 font-medium">Category</Label>
              <Input
                id="appCategory"
                defaultValue="Productivity"
                className="backdrop-blur-sm bg-white/20 border-white/30 text-gray-900"
              />
              <Label htmlFor="appVisibility" className="text-gray-900 font-medium">Visibility</Label>
              <select
                id="appVisibility"
                defaultValue="private"
                className="w-full rounded-md border border-white/30 bg-white/10 px-3 py-2 text-sm text-gray-900 shadow-inner focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="private">Private</option>
                <option value="team">Team</option>
                <option value="public">Public</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="appUrl" className="text-gray-900 font-medium">App URL</Label>
              <Input
                id="appUrl"
                defaultValue="myapp.coremorphic.app"
                className="backdrop-blur-sm bg-white/20 border-white/30 text-gray-900"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="primaryColor" className="text-gray-900 font-medium">Primary Color</Label>
              <Input
                id="primaryColor"
                type="color"
                defaultValue="#7c3aed"
                className="h-10 w-full cursor-pointer rounded-md border border-white/30 bg-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactEmail" className="text-gray-900 font-medium">Contact Email</Label>
              <Input
                id="contactEmail"
                type="email"
                defaultValue="support@coremorphic.app"
                className="backdrop-blur-sm bg-white/20 border-white/30 text-gray-900"
              />
            </div>
          </div>

          <Button className="backdrop-blur-sm bg-white/90 hover:bg-white text-purple-600 border border-white/50 shadow-xl">
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </form>
      </div>

      <div className="backdrop-blur-xl bg-white/20 border border-white/30 rounded-2xl p-6 shadow-2xl">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Application Metadata</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3 rounded-xl border border-white/40 bg-white/10 p-4">
            <Globe className="mt-1 h-5 w-5 text-purple-600" />
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-600">Environment</p>
              <p className="text-sm font-semibold text-gray-900">Production</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-white/40 bg-white/10 p-4">
            <User className="mt-1 h-5 w-5 text-purple-600" />
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-600">Owner</p>
              <p className="text-sm font-semibold text-gray-900">core-team@coremorphic.app</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-white/40 bg-white/10 p-4">
            <CalendarDays className="mt-1 h-5 w-5 text-purple-600" />
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-600">Created</p>
              <p className="text-sm font-semibold text-gray-900">March 2, 2024</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-white/40 bg-white/10 p-4">
            <Tag className="mt-1 h-5 w-5 text-purple-600" />
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-600">Project ID</p>
              <p className="text-sm font-semibold text-gray-900">{projectId ?? "—"}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="backdrop-blur-xl bg-red-500/10 border border-red-400/40 rounded-2xl p-6 shadow-2xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-red-700 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </h2>
            <p className="text-sm text-red-600">
              Permanently delete this app and all of its associated data. This action cannot be undone.
            </p>
          </div>
          <Button
            variant="destructive"
            className="bg-red-600 hover:bg-red-700 border border-red-500/40 shadow-lg"
          >
            <Trash2 className="h-4 w-4" />
            Delete App
          </Button>
        </div>
      </div>
    </div>
  );
}
