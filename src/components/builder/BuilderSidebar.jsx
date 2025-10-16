import React from "react";
import { LayoutDashboard, Users, Database, BarChart3, Globe, Shield, Code, Bot, ScrollText, Webhook, Settings, Lock, Key, Eye, Zap, Clock, TestTube, Rocket } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";

const navigationSections = [
  {
    title: "Dashboard",
    items: [
      { id: "overview", label: "Overview", icon: LayoutDashboard },
      { id: "users", label: "Users", icon: Users },
      { id: "data", label: "Data", icon: Database },
      { id: "analytics", label: "Analytics", icon: BarChart3 },
      { id: "domains", label: "Domains", icon: Globe },
      { id: "security", label: "Security", icon: Shield },
      { id: "code", label: "Code", icon: Code },
      { id: "agents", label: "Agents", icon: Bot },
      { id: "logs", label: "Logs", icon: ScrollText },
      { id: "api", label: "API", icon: Webhook },
    ]
  },
  {
    title: "Automation",
    items: [
      { id: "triggers", label: "Triggers", icon: Zap },
      { id: "scheduled-tasks", label: "Scheduled Tasks", icon: Clock },
      { id: "scripts", label: "Custom Scripts", icon: Code },
    ]
  },
  {
    title: "Development",
    items: [
      { id: "testing", label: "Testing", icon: TestTube },
    ]
  },
  {
    title: "Operations",
    items: [
      { id: "devops", label: "DevOps", icon: Rocket },
    ]
  },
  {
    title: "Settings",
    items: [
      { id: "app-settings", label: "App Settings", icon: Settings },
      { id: "authentication", label: "Authentication", icon: Lock },
      { id: "secrets", label: "Secrets", icon: Key },
    ]
  }
];

export default function BuilderSidebar({ activeSection, setActiveSection }) {
  const handleTogglePreview = () => {
    window.dispatchEvent(new CustomEvent('toggle-preview'));
  };

  return (
    <div className="w-64 backdrop-blur-xl bg-white/20 border-r border-white/30 overflow-y-auto flex flex-col">
      {/* Action Buttons at Top */}
      <div className="p-4 space-y-2 border-b border-white/30">
        <Link to={createPageUrl("Dashboard")}>
          <Button 
            className="w-full backdrop-blur-sm bg-white/90 hover:bg-white text-purple-600 border border-white/50 shadow-xl justify-start"
          >
            <LayoutDashboard className="w-4 h-4 mr-2" />
            Dashboard
          </Button>
        </Link>
        <Button 
          onClick={handleTogglePreview}
          className="w-full backdrop-blur-sm bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 text-purple-900 border border-purple-500/40 shadow-xl justify-start"
        >
          <Eye className="w-4 h-4 mr-2" />
          Live Preview
        </Button>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 p-4 space-y-6">
        {navigationSections.map((section, sectionIdx) => (
          <div key={section.title}>
            <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-3 px-3">
              {section.title}
            </h3>
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 ${
                      isActive
                        ? "backdrop-blur-sm bg-white/40 border border-white/50 text-gray-900 shadow-lg font-semibold"
                        : "text-gray-800 hover:bg-white/20 hover:text-gray-900 border border-transparent"
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span className="font-medium text-sm">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}