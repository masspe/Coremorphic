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
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Wand2, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function CreateTestDialog({ open, onOpenChange, appId, onSuccess }) {
  const [creating, setCreating] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    test_type: "trigger",
    target_id: "",
    target_name: "",
    mock_data: {},
    expected_output: {},
    assertions: [],
    is_active: true
  });
  const [mockDataJson, setMockDataJson] = useState("{}");
  const [expectedOutputJson, setExpectedOutputJson] = useState("{}");

  // Fetch available targets based on test type
  const { data: targets = [] } = useQuery({
    queryKey: ['test-targets', appId, formData.test_type],
    queryFn: async () => {
      if (!appId) return [];
      
      switch (formData.test_type) {
        case 'trigger':
          return await base44.entities.Trigger.filter({ app_id: appId });
        case 'script':
          return await base44.entities.CustomScript.filter({ app_id: appId });
        case 'scheduled_task':
          return await base44.entities.ScheduledTask.filter({ app_id: appId });
        default:
          return [];
      }
    },
    enabled: !!appId && open,
  });

  const handleGenerateWithAI = async () => {
    if (!formData.target_id) {
      alert('Please select a target first');
      return;
    }

    setGeneratingAI(true);
    try {
      const response = await base44.functions.invoke('generateTestCase', {
        targetType: formData.test_type,
        targetId: formData.target_id,
        appId: appId
      });

      setAiSuggestions(response.data.test_cases || []);
    } catch (error) {
      console.error('Error generating test cases:', error);
      alert('Failed to generate test cases: ' + error.message);
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleSelectSuggestion = (suggestion) => {
    setSelectedSuggestion(suggestion);
    setFormData({
      ...formData,
      name: suggestion.name,
      description: suggestion.description,
      mock_data: suggestion.mock_data,
      expected_output: suggestion.expected_output,
      assertions: suggestion.assertions || []
    });
    setMockDataJson(JSON.stringify(suggestion.mock_data, null, 2));
    setExpectedOutputJson(JSON.stringify(suggestion.expected_output, null, 2));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCreating(true);

    try {
      // Parse JSON fields
      const mockData = JSON.parse(mockDataJson);
      const expectedOutput = JSON.parse(expectedOutputJson);

      await base44.entities.TestCase.create({
        ...formData,
        app_id: appId,
        mock_data: mockData,
        expected_output: expectedOutput
      });

      onSuccess?.();
      onOpenChange(false);
      
      // Reset form
      setFormData({
        name: "",
        description: "",
        test_type: "trigger",
        target_id: "",
        target_name: "",
        mock_data: {},
        expected_output: {},
        assertions: [],
        is_active: true
      });
      setMockDataJson("{}");
      setExpectedOutputJson("{}");
      setAiSuggestions([]);
      setSelectedSuggestion(null);
    } catch (error) {
      console.error('Error creating test:', error);
      alert('Failed to create test: ' + error.message);
    } finally {
      setCreating(false);
    }
  };

  const handleTargetChange = (targetId) => {
    const target = targets.find(t => t.id === targetId);
    setFormData({
      ...formData,
      target_id: targetId,
      target_name: target?.name || ""
    });
    // Reset AI suggestions when target changes
    setAiSuggestions([]);
    setSelectedSuggestion(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="backdrop-blur-xl bg-white/95 border-white/30 max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Test Case</DialogTitle>
          <DialogDescription>
            Create automated tests to validate your app's functionality
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="test_type">Test Type *</Label>
              <Select
                value={formData.test_type}
                onValueChange={(value) => {
                  setFormData({ ...formData, test_type: value, target_id: "", target_name: "" });
                  setAiSuggestions([]);
                  setSelectedSuggestion(null);
                }}
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trigger">Trigger</SelectItem>
                  <SelectItem value="script">Custom Script</SelectItem>
                  <SelectItem value="scheduled_task">Scheduled Task</SelectItem>
                  <SelectItem value="function">Backend Function</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="target">Target {formData.test_type === 'function' ? 'Function Name' : '*'}</Label>
              {formData.test_type === 'function' ? (
                <Input
                  id="target"
                  value={formData.target_name}
                  onChange={(e) => setFormData({ ...formData, target_name: e.target.value, target_id: 'function' })}
                  placeholder="e.g., createOrder"
                  required
                />
              ) : (
                <Select
                  value={formData.target_id}
                  onValueChange={handleTargetChange}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select target" />
                  </SelectTrigger>
                  <SelectContent>
                    {targets.map((target) => (
                      <SelectItem key={target.id} value={target.id}>
                        {target.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* AI Generation Button */}
          {formData.target_id && formData.test_type !== 'function' && (
            <div className="backdrop-blur-sm bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-semibold text-gray-900 flex items-center gap-2">
                    <Wand2 className="w-4 h-4 text-purple-600" />
                    AI Test Generation
                  </div>
                  <div className="text-sm text-gray-700 mt-1">
                    Let AI generate comprehensive test cases for you
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={handleGenerateWithAI}
                  disabled={generatingAI || !formData.target_id}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  {generatingAI ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4 mr-2" />
                      Generate Tests
                    </>
                  )}
                </Button>
              </div>

              {/* AI Suggestions */}
              {aiSuggestions.length > 0 && (
                <div className="space-y-2 mt-4">
                  <div className="text-sm font-medium text-gray-900 mb-2">
                    AI Generated Test Cases ({aiSuggestions.length}):
                  </div>
                  {aiSuggestions.map((suggestion, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSelectSuggestion(suggestion)}
                      className={cn(
                        "p-3 rounded-lg border cursor-pointer transition-all",
                        selectedSuggestion === suggestion
                          ? "bg-purple-500/20 border-purple-500/40"
                          : "bg-white/50 border-white/60 hover:bg-white/70"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{suggestion.name}</div>
                          <div className="text-sm text-gray-700 mt-1">{suggestion.description}</div>
                          {suggestion.assertions && suggestion.assertions.length > 0 && (
                            <div className="mt-2">
                              <Badge className="backdrop-blur-sm bg-cyan-500/20 border-cyan-500/40 text-cyan-900 text-xs">
                                {suggestion.assertions.length} assertions
                              </Badge>
                            </div>
                          )}
                        </div>
                        {selectedSuggestion === suggestion && (
                          <CheckCircle2 className="w-5 h-5 text-purple-600 flex-shrink-0 ml-2" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Test Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Test Order Creation Trigger"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="What does this test validate?"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mock_data">Mock Input Data (JSON)</Label>
            <Textarea
              id="mock_data"
              value={mockDataJson}
              onChange={(e) => setMockDataJson(e.target.value)}
              placeholder='{"source_record": {"id": "123", "name": "Test"}}'
              rows={5}
              className="font-mono text-sm"
            />
            <p className="text-xs text-gray-600">
              Provide test data in JSON format
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expected_output">Expected Output (JSON)</Label>
            <Textarea
              id="expected_output"
              value={expectedOutputJson}
              onChange={(e) => setExpectedOutputJson(e.target.value)}
              placeholder='{"trigger_would_execute": true}'
              rows={5}
              className="font-mono text-sm"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={creating || !appId}
              className="bg-gradient-to-r from-purple-600 to-pink-600"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Test'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}