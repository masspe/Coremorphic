import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { backend } from "@/api/backendClient";
import { Loader2, FileCode } from "lucide-react";

const SCRIPT_TEMPLATES = {
  python: `# Python Script Example
import json
import sys

def main(input_data):
    """
    Main function that processes input and returns output
    Args:
        input_data: Dictionary with input parameters
    Returns:
        Dictionary with results
    """
    # Your code here
    result = {
        "status": "success",
        "message": "Script executed successfully",
        "data": input_data
    }
    return result

if __name__ == "__main__":
    # Read input from stdin
    input_json = sys.stdin.read()
    input_data = json.loads(input_json) if input_json else {}
    
    # Execute main function
    output = main(input_data)
    
    # Write output to stdout
    print(json.dumps(output))`,
  
  powershell: `# PowerShell Script Example
param(
    [Parameter(Mandatory=$false)]
    [string]$InputJson
)

# Parse input JSON
$inputData = if ($InputJson) { $InputJson | ConvertFrom-Json } else { @{} }

# Your code here
$result = @{
    status = "success"
    message = "Script executed successfully"
    data = $inputData
}

# Output as JSON
$result | ConvertTo-Json -Depth 10`,
  
  bash: `#!/bin/bash
# Bash Script Example

# Read input JSON from stdin
read -r INPUT_JSON

# Parse and process
# Note: Consider using jq for JSON parsing
# Example: echo "$INPUT_JSON" | jq '.someField'

# Your code here

# Output JSON result
echo '{"status":"success","message":"Script executed successfully"}'`,
  
  javascript: `// JavaScript/Node.js Script Example
const inputData = JSON.parse(process.argv[2] || '{}');

async function main(input) {
  // Your code here
  
  return {
    status: "success",
    message: "Script executed successfully",
    data: input
  };
}

main(inputData)
  .then(result => console.log(JSON.stringify(result)))
  .catch(error => console.error(JSON.stringify({ status: "error", message: error.message })));`
};

export default function CreateScriptDialog({ open, onOpenChange, appId, onSuccess }) {
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    script_type: "python",
    script_content: SCRIPT_TEMPLATES.python,
    timeout_seconds: 300,
    is_active: true
  });

  const handleScriptTypeChange = (type) => {
    setFormData({
      ...formData,
      script_type: type,
      script_content: SCRIPT_TEMPLATES[type] || ""
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCreating(true);

    try {
      await backend.entities.CustomScript.create({
        ...formData,
        app_id: appId
      });

      onSuccess?.();
      onOpenChange(false);
      
      // Reset form
      setFormData({
        name: "",
        description: "",
        script_type: "python",
        script_content: SCRIPT_TEMPLATES.python,
        timeout_seconds: 300,
        is_active: true
      });
    } catch (error) {
      console.error('Error creating script:', error);
      alert('Failed to create script: ' + error.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="backdrop-blur-xl bg-white/95 border-white/30 max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCode className="w-5 h-5" />
            Create Custom Script
          </DialogTitle>
          <DialogDescription>
            Write scripts in Python, PowerShell, Bash, or JavaScript to extend your app
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Script Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Data Processor"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="script_type">Script Type *</Label>
              <Select
                value={formData.script_type}
                onValueChange={handleScriptTypeChange}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="python">🐍 Python</SelectItem>
                  <SelectItem value="powershell">⚡ PowerShell</SelectItem>
                  <SelectItem value="bash">🔧 Bash</SelectItem>
                  <SelectItem value="javascript">📜 JavaScript</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe what this script does..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="script_content">Script Code *</Label>
            <Textarea
              id="script_content"
              value={formData.script_content}
              onChange={(e) => setFormData({ ...formData, script_content: e.target.value })}
              placeholder="Enter your script code..."
              className="font-mono text-sm h-96"
              required
            />
            <p className="text-xs text-gray-600">
              💡 Tip: Your script should read JSON input from stdin and output JSON to stdout
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timeout">Timeout (seconds)</Label>
            <Input
              id="timeout"
              type="number"
              value={formData.timeout_seconds}
              onChange={(e) => setFormData({ ...formData, timeout_seconds: parseInt(e.target.value) })}
              min={10}
              max={3600}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={creating || !appId}
              className="backdrop-blur-sm bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Script'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}