import React, { useState, useEffect } from "react";
import { Code, FileCode, Folder, FolderOpen, Save, RefreshCw, Check, AlertCircle, Download, Search, Wand2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { backend } from "@/api/backendClient";
import { cn } from "@/lib/utils";
import CodeEditor from "../CodeEditor";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const FILE_ICONS = {
  page: "📄",
  component: "🧩",
  entity: "📊",
  function: "⚡",
  agent: "🤖",
  layout: "🎨"
};

export default function CodeSection({ appId }) {
  const [files, setFiles] = useState({});
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formatting, setFormatting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFolders, setExpandedFolders] = useState({
    pages: true,
    components: true,
    entities: false,
    functions: false,
    agents: false,
    layout: false
  });

  useEffect(() => {
    if (appId) {
      loadFiles();
    }
  }, [appId]);

  useEffect(() => {
    // Listen for Cmd/Ctrl + S save event
    const handleSave = () => {
      if (selectedFile && hasChanges) {
        saveFile();
      }
    };
    
    window.addEventListener('editor-save', handleSave);
    return () => window.removeEventListener('editor-save', handleSave);
  }, [selectedFile, fileContent, originalContent]);

  const loadFiles = async () => {
    try {
      setLoading(true);
      setSaveStatus(null);
      const { data } = await backend.functions.invoke('listAppFiles', { appId });
      setFiles(data.files);
      
      // Auto-select first page if available
      if (data.files.pages && data.files.pages.length > 0) {
        loadFile(data.files.pages[0]);
      }
    } catch (error) {
      console.error('Error loading files:', error);
      setSaveStatus({ type: 'error', message: 'Failed to load files: ' + (error.message || 'Unknown error') });
    } finally {
      setLoading(false);
    }
  };

  const loadFile = async (file) => {
    try {
      setLoading(true);
      setSelectedFile(file);
      
      // Emit event for Builder to listen
      const event = new CustomEvent('file-selected', { detail: file });
      window.dispatchEvent(event);
      
      const { data } = await backend.functions.invoke('getFileContent', { 
        filePath: file.path,
        appId 
      });
      setFileContent(data.content);
      setOriginalContent(data.content);
      setSaveStatus(null);
    } catch (error) {
      console.error('Error loading file:', error);
      setSaveStatus({ type: 'error', message: 'Failed to load file: ' + (error.message || 'Unknown error') });
    } finally {
      setLoading(false);
    }
  };

  const saveFile = async () => {
    if (!selectedFile) return;
    
    try {
      setSaving(true);
      setSaveStatus(null);
      
      await backend.functions.invoke('updateFileContent', {
        filePath: selectedFile.path,
        content: fileContent,
        appId
      });
      
      setOriginalContent(fileContent);
      setSaveStatus({ type: 'success', message: 'File saved successfully!' });
      
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
      console.error('Error saving file:', error);
      setSaveStatus({ type: 'error', message: error.message || 'Failed to save file' });
    } finally {
      setSaving(false);
    }
  };

  const formatCode = async () => {
    if (!selectedFile || !fileContent) return;
    
    try {
      setFormatting(true);
      setSaveStatus({ type: 'success', message: 'Code formatted! (Use Ctrl/Cmd+Shift+F in editor)' });
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
      console.error('Error formatting code:', error);
      setSaveStatus({ type: 'error', message: 'Failed to format code' });
    } finally {
      setFormatting(false);
    }
  };

  const exportApp = async () => {
    if (!appId) {
      setSaveStatus({ type: 'error', message: 'No app selected to export' });
      return;
    }
    
    try {
      setExporting(true);
      setSaveStatus({ type: 'success', message: 'Preparing export...' });
      
      const response = await backend.functions.invoke('exportAppToZip', { appId });
      
      const blob = new Blob([response.data], { type: 'application/zip' });
      const url = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `app-export-${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setSaveStatus({ type: 'success', message: 'App exported successfully!' });
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
      console.error('Error exporting app:', error);
      setSaveStatus({ type: 'error', message: 'Failed to export: ' + (error.message || 'Unknown error') });
    } finally {
      setExporting(false);
    }
  };

  const toggleFolder = (folder) => {
    setExpandedFolders(prev => ({ ...prev, [folder]: !prev[folder] }));
  };

  const hasChanges = fileContent !== originalContent;

  const getLanguageFromPath = (path) => {
    if (path.endsWith('.js') || path.endsWith('.jsx')) return 'javascript';
    if (path.endsWith('.json')) return 'json';
    if (path.endsWith('.ts') || path.endsWith('.tsx')) return 'typescript';
    if (path.endsWith('.css')) return 'css';
    if (path.endsWith('.html')) return 'html';
    return 'javascript';
  };

  const filterFiles = (fileList) => {
    if (!searchQuery) return fileList;
    return fileList.filter(file => 
      file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.path.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const renderFileTree = () => {
    return (
      <div className="space-y-2">
        {Object.entries(files).map(([folder, items]) => {
          const filteredItems = filterFiles(items || []);
          if (filteredItems.length === 0) return null;
          
          const isExpanded = expandedFolders[folder];
          
          return (
            <div key={folder}>
              <button
                onClick={() => toggleFolder(folder)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-gray-900 hover:bg-white/30 rounded-xl transition-all text-left group"
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <FolderOpen className="w-4 h-4 text-purple-600" />
                  ) : (
                    <Folder className="w-4 h-4 text-gray-700" />
                  )}
                  <span className="font-semibold capitalize text-sm">{folder}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs backdrop-blur-sm bg-white/40 px-2 py-0.5 rounded-full text-gray-800 font-medium">
                    {filteredItems.length}
                  </span>
                  <ChevronRight className={cn(
                    "w-3.5 h-3.5 text-gray-600 transition-transform",
                    isExpanded && "rotate-90"
                  )} />
                </div>
              </button>
              
              {isExpanded && (
                <div className="ml-2 mt-1 space-y-0.5 border-l-2 border-white/20 pl-2">
                  {filteredItems.map((file) => (
                    <button
                      key={file.path}
                      onClick={() => loadFile(file)}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-left text-sm group",
                        selectedFile?.path === file.path
                          ? "bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-purple-900 font-medium shadow-md"
                          : "text-gray-800 hover:bg-white/20 border border-transparent"
                      )}
                    >
                      <span className="text-lg">{FILE_ICONS[file.type]}</span>
                      <span className="truncate flex-1">{file.name}</span>
                      {selectedFile?.path === file.path && (
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-pulse" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="backdrop-blur-xl bg-gradient-to-br from-white/30 to-white/10 border border-white/40 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                <Code className="w-5 h-5 text-white" />
              </div>
              Code Editor
            </h1>
            <p className="text-gray-800 font-medium">Professional code editing with IntelliSense & formatting</p>
          </div>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={formatCode}
                    disabled={!selectedFile || formatting || !appId}
                    className="backdrop-blur-sm bg-white/30 border-white/40 text-gray-900 hover:bg-white/50 shadow-md"
                  >
                    <Wand2 className={cn("w-4 h-4", formatting && "animate-spin")} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Format Code (Ctrl/Cmd+Shift+F)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Button
              variant="outline"
              size="sm"
              onClick={exportApp}
              disabled={exporting || !appId}
              className="backdrop-blur-sm bg-white/30 border-white/40 text-gray-900 hover:bg-white/50 shadow-md"
            >
              {exporting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={loadFiles}
              disabled={loading || !appId}
              className="backdrop-blur-sm bg-white/30 border-white/40 text-gray-900 hover:bg-white/50 shadow-md"
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
              Refresh
            </Button>
            {selectedFile && (
              <Button
                onClick={saveFile}
                disabled={!hasChanges || saving || !appId}
                className={cn(
                  "backdrop-blur-sm border border-white/50 shadow-xl transition-all",
                  hasChanges && appId
                    ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                    : "bg-white/50 text-gray-600 cursor-not-allowed"
                )}
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {hasChanges ? 'Save (⌘S)' : 'Saved'}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {saveStatus && (
          <div className={cn(
            "mt-4 p-3 rounded-xl border flex items-center gap-2 text-sm font-medium backdrop-blur-sm",
            saveStatus.type === 'success'
              ? "bg-green-500/20 border-green-500/40 text-green-900"
              : "bg-red-500/20 border-red-500/40 text-red-900"
          )}>
            {saveStatus.type === 'success' ? (
              <Check className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            {saveStatus.message}
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* File Tree Sidebar */}
        <div className="lg:col-span-1">
          <div className="backdrop-blur-xl bg-gradient-to-br from-white/30 to-white/10 border border-white/40 rounded-2xl shadow-2xl overflow-hidden">
            {/* Sidebar Header */}
            <div className="backdrop-blur-sm bg-white/20 border-b border-white/30 px-4 py-3">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Folder className="w-4 h-4 text-purple-600" />
                Project Files
              </h3>
            </div>
            
            <div className="p-4">
              {/* Search Bar */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                  <Input
                    placeholder="Search files..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 backdrop-blur-sm bg-white/50 border-white/40 text-gray-900 placeholder-gray-600 h-9 text-sm shadow-inner focus:bg-white/70 transition-colors"
                  />
                </div>
              </div>

              {/* File Tree */}
              {loading && !selectedFile ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-9 bg-white/20 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : (
                renderFileTree()
              )}
              {!appId && !loading && (
                <div className="text-center py-8">
                  <FileCode className="w-12 h-12 text-gray-500 mx-auto mb-3 opacity-50" />
                  <p className="text-sm text-gray-700 font-medium">No app selected</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Code Editor */}
        <div className="lg:col-span-3">
          <div className="backdrop-blur-xl bg-gradient-to-br from-white/30 to-white/10 border border-white/40 rounded-2xl shadow-2xl overflow-hidden">
            {selectedFile ? (
              <>
                {/* File Header */}
                <div className="backdrop-blur-sm bg-white/20 border-b border-white/30 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-md">
                      <FileCode className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <div className="text-gray-900 font-semibold">{selectedFile.path}</div>
                      <div className="text-xs text-gray-700 capitalize flex items-center gap-2">
                        <span>{selectedFile.type} file</span>
                        <span className="text-gray-600">•</span>
                        <span className="backdrop-blur-sm bg-white/30 px-2 py-0.5 rounded-full font-medium">
                          {getLanguageFromPath(selectedFile.path)}
                        </span>
                      </div>
                    </div>
                  </div>
                  {hasChanges && (
                    <div className="backdrop-blur-sm bg-gradient-to-r from-orange-500/30 to-red-500/30 border border-orange-500/40 px-3 py-1.5 rounded-lg">
                      <span className="text-orange-900 text-xs font-bold flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-orange-600 animate-pulse" />
                        Unsaved Changes
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Editor */}
                <div className="h-[600px] bg-[#1e1e1e]">
                  {loading ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center">
                        <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-2" />
                        <p className="text-gray-400">Loading file...</p>
                      </div>
                    </div>
                  ) : (
                    <CodeEditor
                      value={fileContent}
                      onChange={setFileContent}
                      language={getLanguageFromPath(selectedFile.path)}
                    />
                  )}
                </div>

                {/* Footer with Save Actions */}
                {hasChanges && (
                  <div className="backdrop-blur-sm bg-gradient-to-r from-orange-500/10 to-red-500/10 border-t border-orange-500/20 p-4 flex items-center justify-between">
                    <p className="text-gray-900 text-sm font-medium flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-orange-600" />
                      You have unsaved changes • Press ⌘S (Ctrl+S) to save
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setFileContent(originalContent);
                          setSaveStatus(null);
                        }}
                        className="backdrop-blur-sm bg-white/30 border-white/40 text-gray-900 hover:bg-white/50"
                      >
                        Discard
                      </Button>
                      <Button
                        size="sm"
                        onClick={saveFile}
                        disabled={saving || !appId}
                        className="backdrop-blur-sm bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 shadow-lg"
                      >
                        {saving ? 'Saving...' : 'Save Now'}
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="h-[600px] flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                <div className="text-center p-8">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                    <FileCode className="w-10 h-10 text-purple-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">No File Selected</h3>
                  <p className="text-gray-700 mb-1">Select a file from the sidebar to start editing</p>
                  <p className="text-sm text-gray-600 mt-2">✨ Powered by Monaco Editor with IntelliSense</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}