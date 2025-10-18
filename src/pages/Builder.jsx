import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import BuilderSidebar from "../components/builder/BuilderSidebar";
import AIAssistant from "../components/builder/AIAssistant";
import PreviewPanel from "../components/builder/PreviewPanel";
import OverviewSection from "../components/builder/sections/OverviewSection";
import CodeSection from "../components/builder/sections/CodeSection";

export default function Builder() {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get("projectId");

  const [activeSection, setActiveSection] = useState("overview");
  const [showPreview, setShowPreview] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    const handleFileSelect = (event) => {
      setSelectedFile(event.detail);
    };

    const handleTogglePreview = () => {
      setShowPreview((prev) => !prev);
    };

    window.addEventListener("file-selected", handleFileSelect);
    window.addEventListener("toggle-preview", handleTogglePreview);

    return () => {
      window.removeEventListener("file-selected", handleFileSelect);
      window.removeEventListener("toggle-preview", handleTogglePreview);
    };
  }, []);

  const renderSection = () => {
    switch (activeSection) {
      case "code":
        return <CodeSection projectId={projectId} />;
      case "overview":
      default:
        return <OverviewSection projectId={projectId} />;
    }
  };

  return (
    <div className="fixed inset-0 pt-28 flex">
      <AIAssistant projectId={projectId} />
      <BuilderSidebar activeSection={activeSection} setActiveSection={setActiveSection} />

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6">
          {projectId ? (
            renderSection()
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="backdrop-blur-xl bg-white/30 border border-white/40 rounded-2xl px-10 py-12 text-center shadow-2xl">
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Select a project</h2>
                <p className="text-gray-700">Open a project from the dashboard to start building.</p>
              </div>
            </div>
          )}
        </div>

        {showPreview && (
          <PreviewPanel
            projectId={projectId}
            selectedFile={selectedFile}
            onClose={() => setShowPreview(false)}
          />
        )}
      </div>
    </div>
  );
}
