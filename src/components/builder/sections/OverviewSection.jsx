
import React from "react";
import { Activity, Users, Database, TrendingUp, Sparkles, Zap } from "lucide-react";
import { motion } from "framer-motion";

export default function OverviewSection() {
  const stats = [
    { label: "Total Users", value: "1,234", icon: Users, color: "from-purple-500 to-pink-500" },
    { label: "Active Sessions", value: "89", icon: Activity, color: "from-cyan-500 to-blue-500" },
    { label: "Database Records", value: "5,678", icon: Database, color: "from-green-500 to-emerald-500" },
    { label: "API Calls", value: "12.5K", icon: TrendingUp, color: "from-orange-500 to-red-500" },
  ];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="backdrop-blur-xl bg-white/20 border border-white/30 rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-6 h-6 text-gray-900" />
            <h1 className="text-3xl font-bold text-gray-900">App Overview</h1>
          </div>
          <p className="text-gray-800">Monitor your app's performance and metrics</p>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <div className="backdrop-blur-xl bg-white/20 border border-white/30 rounded-2xl p-6 shadow-2xl hover:shadow-purple-500/30 transition-all duration-300 group hover:scale-105">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-4 border border-white/20 shadow-lg group-hover:shadow-xl transition-all`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
              <div className="text-gray-800 text-sm">{stat.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Activity Feed */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="backdrop-blur-xl bg-white/20 border border-white/30 rounded-2xl p-6 shadow-2xl">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Recent Activity
          </h2>
          <div className="space-y-3">
            {[
              { action: "New user registered", time: "2 minutes ago" },
              { action: "Database updated", time: "15 minutes ago" },
              { action: "API endpoint called", time: "1 hour ago" },
              { action: "App deployed", time: "3 hours ago" },
            ].map((activity, i) => (
              <div key={i} className="backdrop-blur-sm bg-white/10 border border-white/20 rounded-xl p-4 flex justify-between items-center hover:bg-white/20 transition-all">
                <span className="text-gray-900 font-medium">{activity.action}</span>
                <span className="text-gray-700 text-sm">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
