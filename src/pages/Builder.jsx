
import React, { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import BuilderSidebar from "../components/builder/BuilderSidebar";
import AIAssistant from "../components/builder/AIAssistant";
import PreviewPanel from "../components/builder/PreviewPanel";
import OverviewSection from "../components/builder/sections/OverviewSection";
import UsersSection from "../components/builder/sections/UsersSection";
import DataSection from "../components/builder/sections/DataSection";
import AnalyticsSection from "../components/builder/sections/AnalyticsSection";
import DomainsSection from "../components/builder/sections/DomainsSection";
import SecuritySection from "../components/builder/sections/SecuritySection";
import CodeSection from "../components/builder/sections/CodeSection";
import AgentsSection from "../components/builder/sections/AgentsSection";
import LogsSection from "../components/builder/sections/LogsSection";
import APISection from "../components/builder/sections/APISection";
import AppSettingsSection from "../components/builder/sections/AppSettingsSection";
import AuthenticationSection from "../components/builder/sections/AuthenticationSection";
import SecretsSection from "../components/builder/sections/SecretsSection";
import TriggersSection from "../components/builder/sections/TriggersSection";
import ScheduledTasksSection from "../components/builder/sections/ScheduledTasksSection";
import ScriptsSection from "../components/builder/sections/ScriptsSection";
import TestingSection from "../components/builder/sections/TestingSection";
import DevOpsSection from "../components/builder/sections/DevOpsSection"; // Added import for DevOpsSection
import { Monitor, TestTube } from "lucide-react";

export default function Builder() {
  const [searchParams] = useSearchParams();
  const appId = searchParams.get('appId');
  
  const [activeSection, setActiveSection] = useState("overview");
  const [showPreview, setShowPreview] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  // Listen for file selection from CodeSection
  useEffect(() => {
    const handleFileSelect = (event) => {
      setSelectedFile(event.detail);
      // Auto-show preview when a page file is selected
      if (event.detail?.type === 'page') {
        setShowPreview(true);
      }
    };

    const handleTogglePreview = () => {
      setShowPreview(prev => !prev);
    };

    window.addEventListener('file-selected', handleFileSelect);
    window.addEventListener('toggle-preview', handleTogglePreview);
    
    return () => {
      window.removeEventListener('file-selected', handleFileSelect);
      window.removeEventListener('toggle-preview', handleTogglePreview);
    };
  }, []);

  const renderSection = () => {
    switch (activeSection) {
      case "overview":
        return <OverviewSection appId={appId} />;
      case "users":
        return <UsersSection appId={appId} />;
      case "data":
        return <DataSection appId={appId} />;
      case "analytics":
        return <AnalyticsSection appId={appId} />;
      case "domains":
        return <DomainsSection appId={appId} />;
      case "security":
        return <SecuritySection appId={appId} />;
      case "code":
        return <CodeSection appId={appId} />;
      case "agents":
        return <AgentsSection appId={appId} />;
      case "logs":
        return <LogsSection appId={appId} />;
      case "api":
        return <APISection appId={appId} />;
      case "triggers":
        return <TriggersSection appId={appId} />;
      case "scheduled-tasks":
        return <ScheduledTasksSection appId={appId} />;
      case "scripts":
        return <ScriptsSection appId={appId} />;
      case "testing":
        return <TestingSection appId={appId} />;
      case "devops": // Added new case for DevOpsSection
        return <DevOpsSection appId={appId} />;
      case "app-settings":
        return <AppSettingsSection appId={appId} />;
      case "authentication":
        return <AuthenticationSection appId={appId} />;
      case "secrets":
        return <SecretsSection appId={appId} />;
      default:
        return <OverviewSection appId={appId} />;
    }
  };

  return (
    <div className="fixed inset-0 pt-28 flex">
      {/* AI Assistant Panel - NOW FIRST ON THE LEFT */}
      <AIAssistant appId={appId} />

      {/* Left Sidebar Navigation - NOW SECOND FROM THE LEFT */}
      <BuilderSidebar activeSection={activeSection} setActiveSection={setActiveSection} />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Content Section */}
        <div className="flex-1 overflow-y-auto p-6">
          {renderSection()}
        </div>

        {/* Preview Panel */}
        {showPreview && (
          <PreviewPanel 
            appId={appId} 
            selectedFile={selectedFile}
            onClose={() => setShowPreview(false)} 
          />
        )}
      </div>
    </div>
  );
}
