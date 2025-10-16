import React, { useState, useEffect } from "react";
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
import { Loader2 } from "lucide-react";

export default function EditTestDialog({ open, onOpenChange, test, onSuccess }) {
  const [updating, setUpdating] = useState(false);
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

  // Load test data when dialog opens or test changes
  useEffect(() => {
    if (test) {
      setFormData({
        name: test.name || "",
        description: test.description || "",
        test_type: test.test_type || "trigger",
        target_id: test.target_id || "",
        target_name: test.target_name || "",
        mock_data: test.mock_data || {},
        expected_output: test.expected_output || {},
        assertions: test.assertions || [],
        is_active: test.is_active !== undefined ? test.is_active : true
      });
      setMockDataJson(JSON.stringify(test.mock_data || {}, null, 2));
      setExpectedOutputJson(JSON.stringify(test.expected_output || {}, null, 2));
    }
  }, [test]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!test) return;

    setUpdating(true);

    try {
      // Parse JSON fields
      const mockData = JSON.parse(mockDataJson);
      const expectedOutput = JSON.parse(expectedOutputJson);

      await base44.entities.TestCase.update(test.id, {
        ...formData,
        mock_data: mockData,
        expected_output: expectedOutput
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating test:', error);
      alert('Failed to update test: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="backdrop-blur-xl bg-white/95 border-white/30 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Test Case</DialogTitle>
          <DialogDescription>
            Update test case configuration
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="test_type">Test Type</Label>
              <Input
                id="test_type"
                value={formData.test_type}
                disabled
                className="bg-gray-100"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="target_name">Target Name</Label>
              <Input
                id="target_name"
                value={formData.target_name}
                disabled
                className="bg-gray-100"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mock_data">Mock Input Data (JSON)</Label>
            <Textarea
              id="mock_data"
              value={mockDataJson}
              onChange={(e) => setMockDataJson(e.target.value)}
              placeholder='{"source_record": {"id": "123", "name": "Test"}}'
              rows={6}
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expected_output">Expected Output (JSON)</Label>
            <Textarea
              id="expected_output"
              value={expectedOutputJson}
              onChange={(e) => setExpectedOutputJson(e.target.value)}
              placeholder='{"should_execute": true}'
              rows={6}
              className="font-mono text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="rounded"
            />
            <Label htmlFor="is_active" className="cursor-pointer">
              Active (test will run when triggered)
            </Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updating}
              className="bg-gradient-to-r from-purple-600 to-pink-600"
            >
              {updating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Test'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}