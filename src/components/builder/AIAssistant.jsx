
import React, { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Plus, Loader2, Settings, MessageSquare, Code, Eye, Lightbulb, Paperclip, X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { backend } from "@/api/backendClient";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const PREDEFINED_PROMPTS = [
  {
    category: "Blog & Content",
    prompts: [
      "Create a blog app with posts, comments, and categories",
      "Build a news website with articles and author profiles",
      "Create a portfolio website with projects gallery"
    ]
  },
  {
    category: "E-commerce",
    prompts: [
      "Build an online store with products, cart, and checkout",
      "Create a product catalog with filters and search",
      "Build a marketplace with seller profiles and reviews"
    ]
  },
  {
    category: "Productivity",
    prompts: [
      "Create a task management app with projects and assignments",
      "Build a note-taking app with folders and tags",
      "Create a time tracking app with projects and reports"
    ]
  },
    {
    category: "Social",
    prompts: [
      "Build a social network with posts, likes, and comments",
      "Create a forum with topics, threads, and replies",
      "Build a messaging app with chat rooms and direct messages"
    ]
  },
  {
    category: "Business",
    prompts: [
      "Create a CRM system with contacts, deals, and tasks",
      "Build an invoicing app with clients and payments",
      "Create a project management tool with teams and milestones"
    ]
  }
];

export default function AIAssistant({ appId }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "👋 Hi! I'm your AI assistant. I can help you build your app by:\n\n• Creating pages, components, and entities\n• Setting up triggers for data synchronization\n• Scheduling automated tasks\n• Writing custom scripts (Python, PowerShell, etc.)\n• Generating comprehensive test cases\n• Generating full-featured applications\n\n**Examples:**\n• \"Create a blog with posts and comments\"\n• \"Sync Order data to OrderHistory when created\"\n• \"Send weekly reports every Monday at 9am\"\n• \"Create tests for the Order sync trigger\"\n• \"Write a Python script to process CSV files\"\n\n💡 Upload documents (images, PDFs, etc.) for additional context!"
    }
  ]);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [promptsOpen, setPromptsOpen] = useState(false);
  const [generatedArtifacts, setGeneratedArtifacts] = useState({ files: [], entities: [], triggers: [], tasks: [], scripts: [], tests: [] });
  const [artifactsExpanded, setArtifactsExpanded] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  
  // Settings
  const [selectedModel, setSelectedModel] = useState("gpt-4o-mini");
  const [creationMode, setCreationMode] = useState(true);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = files.map(async (file) => {
        const { file_url } = await backend.integrations.Core.UploadFile({ file });
        return {
          name: file.name,
          url: file_url,
          type: file.type,
          size: file.size
        };
      });

      const uploadedFileData = await Promise.all(uploadPromises);
      setUploadedFiles(prev => [...prev, ...uploadedFileData]);
    } catch (error) {
      console.error('Error uploading files:', error);
      alert('Failed to upload files: ' + error.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveFile = (index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if ((!input.trim() && uploadedFiles.length === 0) || isGenerating) return;

    const userMessage = input.trim();
    const filesForContext = [...uploadedFiles];
    
    setInput("");
    setUploadedFiles([]);
    
    // Add user message with files
    const messageContent = userMessage || "📎 Sent files";
    setMessages(prev => [...prev, { 
      role: "user", 
      content: messageContent,
      files: filesForContext.length > 0 ? filesForContext : undefined
    }]);
    
    // Add loading message
    setMessages(prev => [...prev, { 
      role: "assistant", 
      content: creationMode ? "🤖 Generating your code..." : "🤔 Thinking...",
      isLoading: true 
    }]);
    
    setIsGenerating(true);

    try {
      if (creationMode) {
        // Creation mode - generate code
        const response = await backend.functions.invoke('generateAppCode', {
          prompt: userMessage || "Generate code based on the uploaded files",
          appId: appId,
          model: selectedModel,
          fileUrls: filesForContext.map(f => f.url),
          modificationMode: userMessage.toLowerCase().includes('modify') || 
                           userMessage.toLowerCase().includes('change') ||
                           userMessage.toLowerCase().includes('update') ||
                           userMessage.toLowerCase().includes('edit')
        });

        const { 
          summary, 
          createdFiles = [], 
          createdEntities = [], 
          createdTriggers = [],
          createdTasks = [],
          createdScripts = [],
          createdTests = [],
          totalFiles = 0, 
          totalEntities = 0,
          totalTriggers = 0,
          totalTasks = 0,
          totalScripts = 0,
          totalTests = 0
        } = response.data;

        // Update artifacts
        setGeneratedArtifacts(prev => ({
          files: [...prev.files, ...createdFiles],
          entities: [...prev.entities, ...createdEntities],
          triggers: [...prev.triggers, ...createdTriggers],
          tasks: [...prev.tasks, ...createdTasks],
          scripts: [...prev.scripts, ...createdScripts],
          tests: [...prev.tests, ...createdTests]
        }));

        // Remove loading message
        setMessages(prev => prev.filter(m => !m.isLoading));

        // Add success message with details
        let resultMessage = `✅ ${summary}\n\n`;
        
        if (totalEntities > 0) {
          resultMessage += `📊 **Created ${totalEntities} ${totalEntities === 1 ? 'Entity' : 'Entities'}:**\n`;
          createdEntities.forEach(entity => {
            resultMessage += `• ${entity.name}\n`;
          });
          resultMessage += '\n';
        }
        
        if (totalFiles > 0) {
          resultMessage += `📄 **Created ${totalFiles} ${totalFiles === 1 ? 'File' : 'Files'}:**\n`;
          createdFiles.forEach(file => {
            resultMessage += `• ${file.path} (${file.type})\n`;
          });
          resultMessage += '\n';
        }

        if (totalTriggers > 0) {
          resultMessage += `⚡ **Created ${totalTriggers} ${totalTriggers === 1 ? 'Trigger' : 'Triggers'}:**\n`;
          createdTriggers.forEach(trigger => {
            resultMessage += `• ${trigger.name}: ${trigger.source} → ${trigger.target}\n`;
          });
          resultMessage += '\n';
        }

        if (totalTasks > 0) {
          resultMessage += `🕐 **Created ${totalTasks} Scheduled ${totalTasks === 1 ? 'Task' : 'Tasks'}:**\n`;
          createdTasks.forEach(task => {
            resultMessage += `• ${task.name} (scheduled for ${new Date(task.scheduled_at).toLocaleString()})\n`;
          });
          resultMessage += '\n';
        }

        if (totalScripts > 0) {
          resultMessage += `🐍 **Created ${totalScripts} Custom ${totalScripts === 1 ? 'Script' : 'Scripts'}:**\n`;
          createdScripts.forEach(script => {
            resultMessage += `• ${script.name}\n`;
          });
          resultMessage += '\n';
        }

        if (totalTests > 0) {
          resultMessage += `🧪 **Created ${totalTests} Test ${totalTests === 1 ? 'Case' : 'Cases'}:**\n`;
          createdTests.forEach(test => {
            resultMessage += `• ${test.name} (${test.test_type})\n`;
          });
          resultMessage += '\n';
        }

        resultMessage += '💡 Check the Code, Triggers, Scheduled Tasks, Custom Scripts, and Testing sections to manage your creations!';

        setMessages(prev => [...prev, {
          role: "assistant",
          content: resultMessage,
          isSuccess: true,
          data: { createdFiles, createdEntities, createdTriggers, createdTasks, createdScripts, createdTests }
        }]);

      } else {
        // Discussion mode - just chat
        const response = await backend.integrations.Core.InvokeLLM({
          prompt: userMessage || "Analyze these files and provide insights",
          add_context_from_internet: false,
          file_urls: filesForContext.map(f => f.url)
        });

        // Remove loading message
        setMessages(prev => prev.filter(m => !m.isLoading));

        setMessages(prev => [...prev, {
          role: "assistant",
          content: response
        }]);
      }

    } catch (error) {
      // Remove loading message
      setMessages(prev => prev.filter(m => !m.isLoading));
      
      // Add error message
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `❌ Sorry, I encountered an error: ${error.message || 'Failed to process request'}\n\nPlease try again with a different request.`,
        isError: true
      }]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePromptSelect = (prompt) => {
    setInput(prompt);
    setPromptsOpen(false);
  };

  const handleVisualEdit = () => {
    // Trigger preview panel to open
    window.dispatchEvent(new CustomEvent('toggle-preview'));
  };

  const handleFileClick = (file) => {
    // Trigger file selection in CodeSection
    window.dispatchEvent(new CustomEvent('file-selected', { detail: file }));
  };

  const formatMessage = (content) => {
    return content.split('\n').map((line, i) => {
      if (line.startsWith('•')) {
        return <div key={i} className="ml-4 flex gap-2"><span>•</span><span>{line.substring(1).trim()}</span></div>;
      }
      if (line.startsWith('**') && line.endsWith('**')) {
        return <div key={i} className="font-bold mt-2">{line.replace(/\*\*/g, '')}</div>;
      }
      return <div key={i}>{line || <br />}</div>;
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="w-96 backdrop-blur-xl bg-white/20 border-r border-white/30 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-white/30">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center backdrop-blur-sm border border-white/30 shadow-lg">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">AI Assistant</h2>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPromptsOpen(true)}
              className="text-gray-800 hover:text-gray-900 hover:bg-white/20"
              title="Prompt ideas"
            >
              <Lightbulb className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSettingsOpen(true)}
              className="text-gray-800 hover:text-gray-900 hover:bg-white/20"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMessages([messages[0]])}
              className="text-gray-800 hover:text-gray-900 hover:bg-white/20"
              title="Clear conversation"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Mode Toggle Button and Model Badge */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCreationMode(!creationMode)}
            className={cn(
              "backdrop-blur-sm border text-xs font-medium transition-all",
              creationMode 
                ? "bg-purple-500/20 border-purple-500/40 text-purple-900 hover:bg-purple-500/30"
                : "bg-blue-500/20 border-blue-500/40 text-blue-900 hover:bg-blue-500/30"
            )}
          >
            {creationMode ? (
              <>
                <Code className="w-3 h-3 mr-1" />
                Creation Mode
              </>
            ) : (
              <>
                <MessageSquare className="w-3 h-3 mr-1" />
                Discussion Mode
              </>
            )}
          </Button>
          <Badge className="backdrop-blur-sm bg-white/20 border-white/30 text-gray-900 text-xs">
            {selectedModel}
          </Badge>
        </div>
      </div>

      {/* Generated Artifacts */}
      {(generatedArtifacts.files.length > 0 || generatedArtifacts.entities.length > 0 || 
        (generatedArtifacts.triggers && generatedArtifacts.triggers.length > 0) ||
        (generatedArtifacts.tasks && generatedArtifacts.tasks.length > 0) ||
        (generatedArtifacts.scripts && generatedArtifacts.scripts.length > 0) ||
        (generatedArtifacts.tests && generatedArtifacts.tests.length > 0)) && (
        <div className="border-b border-white/30">
          <button
            onClick={() => setArtifactsExpanded(!artifactsExpanded)}
            className="w-full px-4 py-3 flex items-center justify-between text-gray-900 hover:bg-white/10 transition-all"
          >
            <span className="font-medium text-sm">Generated Artifacts</span>
            <Badge className="backdrop-blur-sm bg-white/20 border-white/30 text-gray-900">
              {generatedArtifacts.files.length + generatedArtifacts.entities.length + 
               (generatedArtifacts.triggers?.length || 0) + (generatedArtifacts.tasks?.length || 0) +
               (generatedArtifacts.scripts?.length || 0) + (generatedArtifacts.tests?.length || 0)}
            </Badge>
          </button>
          
          {artifactsExpanded && (
            <div className="px-4 pb-3 space-y-2 max-h-48 overflow-y-auto">
              {generatedArtifacts.entities.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-700 mb-1">Entities</div>
                  {generatedArtifacts.entities.map((entity, i) => (
                    <div key={i} className="text-xs text-gray-800 flex items-center gap-2 py-1">
                      <span>📊</span>
                      <span>{entity.name}</span>
                    </div>
                  ))}
                </div>
              )}
              
              {generatedArtifacts.files.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-700 mb-1">Files</div>
                  {generatedArtifacts.files.map((file, i) => (
                    <button
                      key={i}
                      onClick={() => handleFileClick(file)}
                      className="text-xs text-gray-800 flex items-center gap-2 py-1 hover:text-purple-600 w-full text-left"
                    >
                      <span>{file.type === 'page' ? '📄' : file.type === 'component' ? '🧩' : '📁'}</span>
                      <span className="truncate">{file.path}</span>
                    </button>
                  ))}
                </div>
              )}

              {generatedArtifacts.triggers && generatedArtifacts.triggers.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-700 mb-1">Triggers</div>
                  {generatedArtifacts.triggers.map((trigger, i) => (
                    <div key={i} className="text-xs text-gray-800 flex items-center gap-2 py-1">
                      <span>⚡</span>
                      <span className="truncate">{trigger.name}</span>
                    </div>
                  ))}
                </div>
              )}

              {generatedArtifacts.tasks && generatedArtifacts.tasks.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-700 mb-1">Scheduled Tasks</div>
                  {generatedArtifacts.tasks.map((task, i) => (
                    <div key={i} className="text-xs text-gray-800 flex items-center gap-2 py-1">
                      <span>🕐</span>
                      <span className="truncate">{task.name}</span>
                    </div>
                  ))}
                </div>
              )}

              {generatedArtifacts.scripts && generatedArtifacts.scripts.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-700 mb-1">Custom Scripts</div>
                  {generatedArtifacts.scripts.map((script, i) => (
                    <div key={i} className="text-xs text-gray-800 flex items-center gap-2 py-1">
                      <span>🐍</span>
                      <span className="truncate">{script.name}</span>
                    </div>
                  ))}
                </div>
              )}

              {generatedArtifacts.tests && generatedArtifacts.tests.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-700 mb-1">Test Cases</div>
                  {generatedArtifacts.tests.map((test, i) => (
                    <div key={i} className="text-xs text-gray-800 flex items-center gap-2 py-1">
                      <span>🧪</span>
                      <span className="truncate">{test.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map((message, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                  message.role === "user"
                    ? "backdrop-blur-sm bg-white/90 text-purple-900 border border-white/50 shadow-lg"
                    : message.isError
                    ? "backdrop-blur-sm bg-red-500/20 text-red-900 border border-red-500/30"
                    : message.isSuccess
                    ? "backdrop-blur-sm bg-green-500/20 text-green-900 border border-green-500/30"
                    : "backdrop-blur-sm bg-white/20 text-gray-900 border border-white/30"
                )}
              >
                {message.isLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{message.content}</span>
                  </div>
                ) : (
                  <>
                    <div className="whitespace-pre-wrap">{formatMessage(message.content)}</div>
                    {message.files && message.files.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {message.files.map((file, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs backdrop-blur-sm bg-white/20 border border-white/30 rounded-lg px-2 py-1">
                            <FileText className="w-3 h-3" />
                            <span className="truncate flex-1">{file.name}</span>
                            <span className="text-gray-700">{formatFileSize(file.size)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/30">
        {!appId && (
          <div className="mb-3 p-3 rounded-xl backdrop-blur-sm bg-orange-500/20 border border-orange-500/30 text-orange-900 text-xs">
            ⚠️ Please select an app from the dashboard first
          </div>
        )}
        
        {/* Uploaded Files Display */}
        {uploadedFiles.length > 0 && (
          <div className="mb-3 space-y-1">
            {uploadedFiles.map((file, i) => (
              <div key={i} className="flex items-center gap-2 backdrop-blur-sm bg-white/30 border border-white/40 rounded-lg px-3 py-2">
                <FileText className="w-4 h-4 text-gray-800" />
                <span className="text-xs text-gray-900 truncate flex-1">{file.name}</span>
                <span className="text-xs text-gray-700">{formatFileSize(file.size)}</span>
                <button
                  onClick={() => handleRemoveFile(i)}
                  className="text-gray-700 hover:text-gray-900"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        
        <div className="backdrop-blur-sm bg-white/20 border border-white/30 rounded-xl p-3 flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileUpload}
            className="hidden"
            accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif,.csv,.json"
          />
          
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || !appId}
            className={cn(
              "backdrop-blur-sm p-2 rounded-lg transition-all duration-300",
              uploading
                ? "bg-white/50 text-gray-400 cursor-wait"
                : appId
                ? "bg-white/90 hover:bg-white text-purple-600"
                : "bg-white/50 text-gray-400 cursor-not-allowed"
            )}
            title="Upload files"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Paperclip className="w-4 h-4" />
            )}
          </button>
          
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={appId ? "Describe what you want to build..." : "Select an app first..."}
            className="flex-1 bg-transparent text-gray-900 placeholder-gray-600 outline-none resize-none text-sm max-h-32"
            rows={2}
            disabled={isGenerating || !appId}
          />
          
          <button
            onClick={handleSend}
            className={cn(
              "backdrop-blur-sm p-2 rounded-lg transition-all duration-300",
              (input.trim() || uploadedFiles.length > 0) && !isGenerating && appId
                ? "bg-white/90 hover:bg-white text-purple-600"
                : "bg-white/50 text-gray-400 cursor-not-allowed"
            )}
            disabled={(!input.trim() && uploadedFiles.length === 0) || isGenerating || !appId}
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        
        <div className="mt-2 flex items-center justify-between">
          <div className="text-xs text-gray-700">
            Press Enter to send, Shift+Enter for new line
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleVisualEdit}
            disabled={!appId}
            className="text-gray-800 hover:text-gray-900 hover:bg-white/20 text-xs h-7"
          >
            <Eye className="w-3 h-3 mr-1" />
            Visual Edit
          </Button>
        </div>
      </div>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="backdrop-blur-xl bg-white/95 border-white/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              AI Assistant Settings
            </DialogTitle>
            <DialogDescription>
              Configure how the AI assistant works
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="model">AI Model</Label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger id="model">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-4o-mini">GPT-4o Mini (Fast & Efficient)</SelectItem>
                  <SelectItem value="gpt-4o">GPT-4o (Most Capable)</SelectItem>
                  <SelectItem value="gpt-4-turbo">GPT-4 Turbo (Balanced)</SelectItem>
                  <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo (Budget)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-600">
                Choose the AI model for code generation. More powerful models are slower and cost more.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="creation-mode">Creation Mode</Label>
                  <p className="text-xs text-gray-600 mt-1">
                    {creationMode 
                      ? "AI will generate code and modify your app"
                      : "AI will only provide conversational responses"}
                  </p>
                </div>
                <Switch
                  id="creation-mode"
                  checked={creationMode}
                  onCheckedChange={setCreationMode}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Predefined Prompts Dialog */}
      <Dialog open={promptsOpen} onOpenChange={setPromptsOpen}>
        <DialogContent className="backdrop-blur-xl bg-white/95 border-white/30 max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5" />
              Prompt Ideas
            </DialogTitle>
            <DialogDescription>
              Select a template to get started quickly
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {PREDEFINED_PROMPTS.map((category, i) => (
              <div key={i}>
                <h3 className="font-semibold text-gray-900 mb-3">{category.category}</h3>
                <div className="space-y-2">
                  {category.prompts.map((prompt, j) => (
                    <button
                      key={j}
                      onClick={() => handlePromptSelect(prompt)}
                      className="w-full text-left p-3 rounded-xl backdrop-blur-sm bg-white/50 hover:bg-white/80 border border-white/30 transition-all text-sm text-gray-900"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
