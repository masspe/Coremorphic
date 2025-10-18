import React from "react";
import { LayoutDashboard, Code, Eye } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";

const navigationSections = [
  {
    title: "Workspace",
    items: [
      { id: "overview", label: "Overview", icon: LayoutDashboard },
      { id: "code", label: "Code", icon: Code },
    ]
  }
];

export default function BuilderSidebar({ activeSection, setActiveSection }) {
  const handleTogglePreview = () => {
    window.dispatchEvent(new CustomEvent("toggle-preview"));
  };

  return (
    <div className="w-56 backdrop-blur-xl bg-white/20 border-r border-white/30 overflow-y-auto flex flex-col">
      <div className="p-4 space-y-2 border-b border-white/30">
        <Link to={createPageUrl("Dashboard")}>
          <Button className="w-full backdrop-blur-sm bg-white/90 hover:bg-white text-purple-600 border border-white/50 shadow-xl justify-start">
            <LayoutDashboard className="w-4 h-4 mr-2" />
            Dashboard
          </Button>
        </Link>
        <Button
          onClick={handleTogglePreview}
          className="w-full backdrop-blur-sm bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 text-purple-900 border border-purple-500/40 shadow-xl justify-start"
        >
          <Eye className="w-4 h-4 mr-2" />
          Preview
        </Button>
      </div>

      <div className="flex-1 p-4 space-y-6">
        {navigationSections.map((section) => (
          <div key={section.title}>
            <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-3 px-3">
              {section.title}
            </h3>
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive = activeSection === item.id;
                return (
                  <motion.button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 ${
                      isActive
                        ? "backdrop-blur-sm bg-white/40 border border-white/50 text-gray-900 shadow-lg font-semibold"
                        : "text-gray-800 hover:bg-white/20 hover:text-gray-900 border border-transparent"
                    }`}
                    whileTap={{ scale: 0.98 }}
                  >
                    <item.icon className="w-4 h-4" />
                    <span className="font-medium text-sm">{item.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
