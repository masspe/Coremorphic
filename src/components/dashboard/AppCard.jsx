import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
};

export default function AppCard({ project, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="group"
    >
      <div className="backdrop-blur-xl bg-white/20 border border-white/30 rounded-2xl shadow-2xl hover:shadow-purple-500/30 transition-all duration-300 overflow-hidden h-full flex flex-col">
        <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-b border-white/20 px-6 py-5">
          <h3 className="text-2xl font-semibold text-gray-900">{project.name}</h3>
          <p className="text-sm text-gray-700 mt-1">
            Created {formatDate(project.created_at)}
          </p>
        </div>

        <div className="flex-1 px-6 py-5 flex flex-col gap-4 justify-between">
          <p className="text-sm text-gray-700">
            Use the builder to chat with the assistant, manage files, and preview the generated Vite project.
          </p>

          <div className="flex justify-end">
            <Button
              asChild
              className="backdrop-blur-sm bg-white/90 hover:bg-white text-purple-600 border border-white/40 shadow-lg"
            >
              <Link to={`${createPageUrl("Builder")}?projectId=${project.id}`}>
                Open builder
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
