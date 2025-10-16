
import React from "react";
import { Lock, Mail, Shield } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function AuthenticationSection() {
  return (
    <div className="space-y-6">
      <div className="backdrop-blur-xl bg-white/20 border border-white/30 rounded-2xl p-6 shadow-2xl">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3 mb-2">
          <Lock className="w-8 h-8" />
          Authentication
        </h1>
        <p className="text-gray-800">Configure authentication methods</p>
      </div>

      <div className="backdrop-blur-xl bg-white/20 border border-white/30 rounded-2xl p-6 shadow-2xl space-y-6">
        <div className="flex items-center justify-between p-4 backdrop-blur-sm bg-white/10 border border-white/20 rounded-xl">
          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-gray-800" />
            <div>
              <Label className="text-gray-900 font-medium">Email/Password</Label>
              <p className="text-gray-700 text-sm">Allow users to sign in with email</p>
            </div>
          </div>
          <Switch defaultChecked />
        </div>

        <div className="flex items-center justify-between p-4 backdrop-blur-sm bg-white/10 border border-white/20 rounded-xl">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-gray-800" />
            <div>
              <Label className="text-gray-900 font-medium">Two-Factor Authentication</Label>
              <p className="text-gray-700 text-sm">Require 2FA for all users</p>
            </div>
          </div>
          <Switch />
        </div>
      </div>
    </div>
  );
}
