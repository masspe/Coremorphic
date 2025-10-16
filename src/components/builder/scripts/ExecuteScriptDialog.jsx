import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";
import { Loader2, Play, CheckCircle2, AlertCircle } from "lucide-react";

export default function ExecuteScriptDialog({ open, onOpenChange, script, onSuccess }) {
  const [executing, setExecuting] = useState(false);
  const [inputData, setInputData] = useState("{}");
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (open) {
      setResult(null);
      setInputData("{}");
    }
  }, [open]);

  const handleExecute = async () => {
    setExecuting(true);
    setResult(null);

    try {
      // Parse input JSON
      let parsedInput = {};
      try {
        parsedInput = JSON.parse(inputData);
      } catch (e) {
        throw new Error('Invalid JSON input: ' + e.message);
      }

      // Execute script based on type
      const functionName = script.script_type === 'python' ? 'executePythonScript' : 
                          script.script_type === 'powershell' ? 'executePowerShellScript' :
                          'executeScript';

      const response = await base44.functions.invoke(functionName, {
        scriptId: script.id,
        inputData: parsedInput
      });

      setResult({
        success: true,
        output: response.data
      });

      onSuccess?.();
    } catch (error) {
      console.error('Error executing script:', error);
      setResult({
        success: false,
        error: error.message
      });
    } finally {
      setExecuting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="backdrop-blur-xl bg-white/95 border-white/30 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="w-5 h-5" />
            Execute Script: {script?.name}
          </DialogTitle>
          <DialogDescription>
            Provide input parameters as JSON and run the script
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="input">Input Data (JSON)</Label>
            <Textarea
              id="input"
              value={inputData}
              onChange={(e) => setInputData(e.target.value)}
              placeholder='{"key": "value"}'
              className="font-mono text-sm h-32"
            />
          </div>

          {result && (
            <div className={`p-4 rounded-xl ${result.success ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
              <div className="flex items-center gap-2 mb-2">
                {result.success ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-green-900">Success</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <span className="font-semibold text-red-900">Error</span>
                  </>
                )}
              </div>
              <pre className="text-sm overflow-auto max-h-64 bg-white/50 p-3 rounded">
                {result.success ? JSON.stringify(result.output, null, 2) : result.error}
              </pre>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button 
            onClick={handleExecute} 
            disabled={executing}
            className="backdrop-blur-sm bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
          >
            {executing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Executing...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Execute
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}