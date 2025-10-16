import React from "react";
import { motion } from "framer-motion";
import { ExternalLink, Trash2, MoreVertical, Code } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

const colorGradients = {
  purple: "from-purple-500 to-pink-500",
  cyan: "from-cyan-500 to-blue-500",
  green: "from-green-500 to-emerald-500",
  orange: "from-orange-500 to-red-500",
  pink: "from-pink-500 to-rose-500",
};

const statusColors = {
  draft: "bg-yellow-500/20 text-yellow-200 border-yellow-500/30",
  published: "bg-green-500/20 text-green-200 border-green-500/30",
  archived: "bg-gray-500/20 text-gray-200 border-gray-500/30",
};

export default function AppCard({ app, index, onDelete }) {
  const gradient = colorGradients[app.color] || colorGradients.purple;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="group"
    >
      <div className="backdrop-blur-xl bg-white/20 border border-white/30 rounded-2xl shadow-2xl hover:shadow-purple-500/30 transition-all duration-300 hover:scale-105 overflow-hidden h-full">
        <Link to={`${createPageUrl("Builder")}?appId=${app.id}`} className="block">
          {/* Gradient Header */}
          <div className={`h-32 bg-gradient-to-br ${gradient} relative overflow-hidden`}>
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-6xl filter drop-shadow-lg">{app.icon || "✨"}</span>
            </div>
            
            {/* Status Badge */}
            <div className="absolute top-3 left-3">
              <Badge className={`backdrop-blur-sm ${statusColors[app.status]} border`}>
                {app.status}
              </Badge>
            </div>

            {/* Actions Menu */}
            <div className="absolute top-3 right-3" onClick={(e) => e.preventDefault()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="backdrop-blur-sm bg-white/20 hover:bg-white/30 border border-white/30 text-white"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="backdrop-blur-xl bg-gray-900/90 border-white/20">
                  <DropdownMenuItem asChild className="text-white hover:bg-white/10">
                    <Link to={`${createPageUrl("Builder")}?appId=${app.id}`}>
                      <Code className="w-4 h-4 mr-2" />
                      Edit Code
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="text-white hover:bg-white/10">
                    <Link to={`${createPageUrl("Builder")}?appId=${app.id}`}>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Open
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.preventDefault();
                      onDelete(app);
                    }}
                    className="text-red-300 hover:bg-red-500/20"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2 truncate">
              {app.name}
            </h3>
            
            {app.description && (
              <p className="text-gray-800 text-sm mb-4 line-clamp-2">
                {app.description}
              </p>
            )}

            <div className="flex items-center justify-between mt-4">
              <Badge variant="outline" className="backdrop-blur-sm bg-white/20 border-white/30 text-gray-900 font-medium">
                {app.category}
              </Badge>
              
              <div className="text-gray-700 text-xs flex items-center gap-1">
                <Code className="w-3 h-3" />
                Click to open
              </div>
            </div>
          </div>
        </Link>
      </div>
    </motion.div>
  );
}