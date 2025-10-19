import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

export default function CodeEditor({
  value,
  onChange,
  language = 'javascript',
  readOnly = false,
  scrollPosition
}) {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const containerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [theme, setTheme] = useState('vs-dark');

  useEffect(() => {
    // Load Monaco Editor from CDN
    const loadMonaco = async () => {
      if (window.monaco) {
        initializeEditor();
        return;
      }

      // Load Monaco loader
      const loaderScript = document.createElement('script');
      loaderScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs/loader.min.js';
      loaderScript.async = true;
      
      loaderScript.onload = () => {
        window.require.config({ 
          paths: { 
            vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' 
          } 
        });
        
        window.require(['vs/editor/editor.main'], () => {
          initializeEditor();
        });
      };

      document.head.appendChild(loaderScript);
    };

    const initializeEditor = () => {
      if (!containerRef.current || editorRef.current) return;

      const monaco = window.monaco;
      monacoRef.current = monaco;

      // Configure TypeScript/JavaScript language features
      monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: false,
        noSyntaxValidation: false
      });

      monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.ES2020,
        allowNonTsExtensions: true,
        moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
        module: monaco.languages.typescript.ModuleKind.CommonJS,
        noEmit: true,
        esModuleInterop: true,
        jsx: monaco.languages.typescript.JsxEmit.React,
        reactNamespace: 'React',
        allowJs: true,
        typeRoots: ['node_modules/@types']
      });

      // Add backend client type definitions for autocompletion
      const backendTypes = `
        declare module '@/api/backendClient' {
          export const backend: {
            entities: any;
            functions: {
              invoke: (name: string, params?: any) => Promise<any>;
            };
            integrations: {
              Core: {
                InvokeLLM: (params: any) => Promise<any>;
                SendEmail: (params: any) => Promise<any>;
                UploadFile: (params: any) => Promise<{file_url: string}>;
                GenerateImage: (params: any) => Promise<{url: string}>;
              };
            };
            auth: {
              me: () => Promise<any>;
              updateMe: (data: any) => Promise<any>;
              logout: (redirectUrl?: string) => void;
              redirectToLogin: (nextUrl?: string) => void;
              isAuthenticated: () => Promise<boolean>;
            };
            asServiceRole: any;
          };
        }

        declare module '@/utils' {
          export function createPageUrl(pageName: string): string;
        }

        declare module 'react' {
          export = React;
          export as namespace React;
        }
      `;

      monaco.languages.typescript.javascriptDefaults.addExtraLib(
        backendTypes,
        'file:///node_modules/@types/backend/index.d.ts'
      );

      // Create editor instance
      const editor = monaco.editor.create(containerRef.current, {
        value: value || '',
        language: getMonacoLanguage(language),
        theme: theme,
        automaticLayout: true,
        minimap: { enabled: true },
        scrollBeyondLastLine: false,
        fontSize: 14,
        lineNumbers: 'on',
        roundedSelection: true,
        readOnly: readOnly,
        cursorStyle: 'line',
        wordWrap: 'on',
        formatOnPaste: true,
        formatOnType: true,
        suggestOnTriggerCharacters: true,
        quickSuggestions: true,
        tabSize: 2,
        insertSpaces: true,
        folding: true,
        foldingStrategy: 'indentation',
        showFoldingControls: 'always',
        matchBrackets: 'always',
        autoClosingBrackets: 'always',
        autoClosingQuotes: 'always',
        autoIndent: 'full',
        contextmenu: true,
        mouseWheelZoom: true,
        smoothScrolling: true,
        cursorBlinking: 'smooth',
        renderLineHighlight: 'all',
        scrollbar: {
          useShadows: true,
          verticalScrollbarSize: 10,
          horizontalScrollbarSize: 10
        }
      });

      // Add custom key bindings
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        // Trigger save event
        window.dispatchEvent(new CustomEvent('editor-save'));
      });

      // Format document shortcut
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF, () => {
        editor.getAction('editor.action.formatDocument').run();
      });

      // Listen for content changes
      editor.onDidChangeModelContent(() => {
        if (onChange) {
          onChange(editor.getValue());
        }
      });

      editorRef.current = editor;
      setIsLoading(false);
    };

    loadMonaco();

    // Cleanup
    return () => {
      if (editorRef.current) {
        editorRef.current.dispose();
        editorRef.current = null;
      }
    };
  }, []);

  // Update editor value when prop changes
  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.getValue()) {
      const position = editorRef.current.getPosition();
      editorRef.current.setValue(value || '');
      if (position) {
        editorRef.current.setPosition(position);
      }
    }
  }, [value]);

  // Update language when prop changes
  useEffect(() => {
    if (editorRef.current && monacoRef.current) {
      const model = editorRef.current.getModel();
      if (model) {
        monacoRef.current.editor.setModelLanguage(model, getMonacoLanguage(language));
      }
    }
  }, [language]);

  // Update theme
  useEffect(() => {
    if (monacoRef.current) {
      monacoRef.current.editor.setTheme(theme);
    }
  }, [theme]);

  useEffect(() => {
    if (!scrollPosition || !editorRef.current) {
      return;
    }

    const { line, column } = scrollPosition;
    if (typeof line !== 'number' || Number.isNaN(line)) {
      return;
    }

    const editor = editorRef.current;
    const safeColumn = typeof column === 'number' && !Number.isNaN(column) && column > 0 ? column : 1;

    editor.revealLineInCenter(line);
    editor.setSelection({
      startLineNumber: line,
      endLineNumber: line,
      startColumn: safeColumn,
      endColumn: safeColumn
    });
    editor.focus();
  }, [scrollPosition]);

  const getMonacoLanguage = (lang) => {
    const languageMap = {
      'javascript': 'javascript',
      'typescript': 'typescript',
      'json': 'json',
      'html': 'html',
      'css': 'css',
      'markdown': 'markdown'
    };
    return languageMap[lang] || 'javascript';
  };

  return (
    <div className="relative w-full h-full">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Loading editor...</p>
          </div>
        </div>
      )}
      
      <div 
        ref={containerRef} 
        className="w-full h-full"
        style={{ minHeight: '400px' }}
      />

      {/* Theme Toggle - positioned absolutely */}
      {!isLoading && (
        <div className="absolute top-2 right-2 z-20">
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            className="text-xs backdrop-blur-sm bg-gray-800/80 text-gray-200 border border-gray-700 rounded px-2 py-1 cursor-pointer hover:bg-gray-700/80 transition-colors"
          >
            <option value="vs-dark">Dark Theme</option>
            <option value="vs-light">Light Theme</option>
            <option value="hc-black">High Contrast</option>
          </select>
        </div>
      )}
    </div>
  );
}