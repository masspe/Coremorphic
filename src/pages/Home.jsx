
import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Sparkles, Zap, Shield, Layers, ArrowRight, Code, Palette, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function Home() {
  const features = [
    {
      icon: Code,
      title: "AI-Powered Builder",
      description: "Build apps with natural language. Just describe what you want and watch it come to life.",
      gradient: "from-purple-500 to-pink-500"
    },
    {
      icon: Palette,
      title: "Beautiful Design System",
      description: "Stunning glassmorphic interfaces with frosted glass effects and modern aesthetics.",
      gradient: "from-cyan-500 to-blue-500"
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Instant deployment and real-time updates. See your changes live as you build.",
      gradient: "from-pink-500 to-orange-500"
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Bank-level security with authentication, authorization, and data encryption built-in.",
      gradient: "from-blue-500 to-purple-500"
    },
    {
      icon: Layers,
      title: "Component Library",
      description: "Rich set of pre-built components and templates to accelerate your development.",
      gradient: "from-purple-500 to-cyan-500"
    },
    {
      icon: Rocket,
      title: "Scale Effortlessly",
      description: "From prototype to production. Scale your apps without infrastructure worries.",
      gradient: "from-orange-500 to-pink-500"
    }
  ];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Hero Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-24"
      >
        <div className="backdrop-blur-2xl bg-white/20 border border-white/30 rounded-3xl p-12 md:p-16 shadow-2xl relative overflow-hidden">
          {/* Glow effects */}
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-purple-500/30 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-pink-500/30 rounded-full blur-3xl" />
          
          <div className="relative z-10">
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="inline-block mb-6"
            >
              <div className="backdrop-blur-sm bg-white/20 border border-white/40 rounded-full px-6 py-2 shadow-lg">
                <span className="text-gray-900 text-sm font-medium flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  The Future of App Building is Here
                </span>
              </div>
            </motion.div>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 text-gray-900 leading-tight">
              Build Beautiful Apps
              <br />
              <span className="bg-gradient-to-r from-purple-700 via-pink-700 to-cyan-700 bg-clip-text text-transparent">
                With Glass Magic
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-800 mb-10 max-w-3xl mx-auto leading-relaxed">
              Create stunning applications with our AI-powered platform.
              No coding required. Just imagination and glassmorphic beauty.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link to={createPageUrl("Dashboard")}>
                <Button className="backdrop-blur-sm bg-white/90 hover:bg-white text-purple-600 border border-white/50 shadow-2xl hover:shadow-purple-500/50 px-8 py-6 text-lg font-semibold rounded-2xl transition-all duration-300 flex items-center gap-2">
                  Start Building
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link to={createPageUrl("Builder")}>
                <Button variant="outline" className="backdrop-blur-sm bg-white/10 hover:bg-white/20 text-white border border-white/30 shadow-xl px-8 py-6 text-lg font-semibold rounded-2xl transition-all duration-300">
                  Explore Builder
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Features Grid */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="mb-24"
      >
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Everything You Need
          </h2>
          <p className="text-xl text-white/90 max-w-2xl mx-auto">
            Powerful features wrapped in beautiful glassmorphic design
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
              className="group"
            >
              <div className="backdrop-blur-xl bg-white/20 border border-white/30 rounded-2xl p-8 shadow-2xl hover:shadow-purple-500/30 transition-all duration-300 hover:scale-105 h-full relative overflow-hidden">
                {/* Gradient glow on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300 rounded-2xl`} />
                
                <div className="relative z-10">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6 shadow-lg group-hover:shadow-xl transition-all duration-300 border border-white/20`}>
                    <feature.icon className="w-7 h-7 text-white" />
                  </div>
                  
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    {feature.title}
                  </h3>
                  
                  <p className="text-gray-800 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* CTA Section */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.8 }}
        className="mb-12"
      >
        <div className="backdrop-blur-2xl bg-white/20 border border-white/30 rounded-3xl p-12 md:p-16 shadow-2xl text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
          
          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Ready to Create Something Amazing?
            </h2>
            <p className="text-xl text-gray-800 mb-8 max-w-2xl mx-auto">
              Join thousands of builders creating the future with Coremorphic
            </p>
            <Link to={createPageUrl("Dashboard")}>
              <Button className="backdrop-blur-sm bg-white/90 hover:bg-white text-purple-600 border border-white/50 shadow-2xl hover:shadow-cyan-500/50 px-10 py-7 text-xl font-semibold rounded-2xl transition-all duration-300">
                Get Started Free
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
