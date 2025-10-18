
import React, { useState } from "react";
import { backend } from "@/api/backendClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import CreateAppDialog from "../components/dashboard/CreateAppDialog";
import AppCard from "../components/dashboard/AppCard";

export default function Dashboard() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => backend.projects.list(),
  });

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12"
      >
        <div className="backdrop-blur-xl bg-white/20 border border-white/30 rounded-2xl p-8 shadow-2xl">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                <Sparkles className="w-8 h-8" />
                Your Apps
              </h1>
              <p className="text-gray-800 text-lg">
                Manage and create your beautiful applications
              </p>
            </div>
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="backdrop-blur-sm bg-white/90 hover:bg-white text-purple-600 border border-white/50 shadow-xl hover:shadow-purple-500/50 px-6 py-6 text-lg font-semibold rounded-xl transition-all duration-300"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create New App
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Apps Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="backdrop-blur-xl bg-white/20 border border-white/30 rounded-2xl p-6 shadow-xl animate-pulse"
            >
              <div className="w-16 h-16 bg-white/30 rounded-xl mb-4" />
              <div className="h-6 bg-white/30 rounded mb-2" />
              <div className="h-4 bg-white/30 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : apps.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="backdrop-blur-xl bg-white/20 border border-white/30 rounded-2xl p-16 shadow-2xl text-center"
        >
          <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-500/30 to-pink-500/30 border border-white/30 flex items-center justify-center">
            <Sparkles className="w-12 h-12 text-gray-800" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">No Apps Yet</h3>
          <p className="text-gray-800 mb-8 max-w-md mx-auto">
            Start your journey by creating your first beautiful app
          </p>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="backdrop-blur-sm bg-white/90 hover:bg-white text-purple-600 border border-white/50 shadow-xl px-8 py-6 text-lg font-semibold rounded-xl"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Your First App
          </Button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project, index) => (
            <AppCard
              key={project.id}
              project={project}
              index={index}
            />
          ))}
        </div>
      )}

      <CreateAppDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onProjectCreated={() => {
          queryClient.invalidateQueries({ queryKey: ['projects'] });
        }}
      />
    </div>
  );
}
