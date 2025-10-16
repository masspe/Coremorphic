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
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

const TEST_LEVELS = [
  { value: "unit", label: "Unit Tests", icon: "🔬", description: "Test individual components/functions" },
  { value: "integration", label: "Integration Tests", icon: "🔗", description: "Test interactions between components" },
  { value: "fat", label: "FAT (Factory Acceptance Testing)", icon: "🏭", description: "Test complete system functionality" },
  { value: "uat", label: "UAT (User Acceptance Testing)", icon: "👥", description: "Test from user perspective" },
  { value: "production", label: "Production Tests", icon: "🚀", description: "Test in live production environment" }
];

export default function CreateTestSuiteDialog({ open, onOpenChange, appId, onSuccess }) {
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    test_level: "unit",
    environment: "development",
    is_active: true
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTests, setSelectedTests] = useState(new Set());

  // Fetch available test cases
  const { data: allTests = [] } = useQuery({
    queryKey: ['all-test-cases', appId],
    queryFn: async () => {
      if (!appId) return [];
      return await backend.entities.TestCase.filter({ app_id: appId });
    },
    enabled: !!appId && open,
  });

  const filteredTests = allTests.filter(test => 
    test.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    test.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCreating(true);

    try {
      await backend.entities.TestSuite.create({
        ...formData,
        app_id: appId,
        test_case_ids: Array.from(selectedTests)
      });

      onSuccess?.();
      onOpenChange(false);
      
      // Reset form
      setFormData({
        name: "",
        description: "",
        test_level: "unit",
        environment: "development",
        is_active: true
      });
      setSelectedTests(new Set());
      setSearchQuery("");
    } catch (error) {
      console.error('Error creating test suite:', error);
      alert('Failed to create test suite: ' + error.message);
    } finally {
      setCreating(false);
    }
  };

  const toggleTest = (testId) => {
    const newSelected = new Set(selectedTests);
    if (newSelected.has(testId)) {
      newSelected.delete(testId);
    } else {
      newSelected.add(testId);
    }
    setSelectedTests(newSelected);
  };

  const selectedLevel = TEST_LEVELS.find(l => l.value === formData.test_level);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="backdrop-blur-xl bg-white/95 border-white/30 max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Test Suite</DialogTitle>
          <DialogDescription>
            Group test cases into organized suites by test level
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Suite Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Order Management Unit Tests"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="What does this suite test?"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="test_level">Test Level *</Label>
              <Select
                value={formData.test_level}
                onValueChange={(value) => setFormData({ ...formData, test_level: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEST_LEVELS.map(level => (
                    <SelectItem key={level.value} value={level.value}>
                      <div className="flex items-center gap-2">
                        <span>{level.icon}</span>
                        <span>{level.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedLevel && (
                <p className="text-xs text-gray-600">{selectedLevel.description}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="environment">Environment</Label>
              <Select
                value={formData.environment}
                onValueChange={(value) => setFormData({ ...formData, environment: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="development">Development</SelectItem>
                  <SelectItem value="staging">Staging</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Test Case Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Select Test Cases ({selectedTests.size} selected)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedTests(new Set(filteredTests.map(t => t.id)))}
              >
                Select All Visible
              </Button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input
                placeholder="Search test cases..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Test List */}
            <div className="border border-white/30 rounded-lg max-h-64 overflow-y-auto">
              {filteredTests.length === 0 ? (
                <div className="text-center py-8 text-gray-600">
                  {allTests.length === 0 
                    ? "No test cases available. Create some tests first."
                    : "No test cases match your search."}
                </div>
              ) : (
                <div className="divide-y divide-white/20">
                  {filteredTests.map(test => (
                    <label
                      key={test.id}
                      className="flex items-start gap-3 p-3 hover:bg-white/10 cursor-pointer transition-colors"
                    >
                      <Checkbox
                        checked={selectedTests.has(test.id)}
                        onCheckedChange={() => toggleTest(test.id)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900">{test.name}</span>
                          <Badge variant="outline" className="text-xs capitalize">
                            {test.test_type}
                          </Badge>
                        </div>
                        {test.description && (
                          <p className="text-sm text-gray-600 line-clamp-1">{test.description}</p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {selectedTests.size > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="text-sm font-medium text-blue-900 mb-2">
                {selectedTests.size} test{selectedTests.size !== 1 ? 's' : ''} selected
              </div>
              <div className="flex flex-wrap gap-1">
                {Array.from(selectedTests).slice(0, 5).map(testId => {
                  const test = allTests.find(t => t.id === testId);
                  return test ? (
                    <Badge key={testId} variant="secondary" className="text-xs">
                      {test.name}
                    </Badge>
                  ) : null;
                })}
                {selectedTests.size > 5 && (
                  <Badge variant="secondary" className="text-xs">
                    +{selectedTests.size - 5} more
                  </Badge>
                )}
              </div>
            </div>
          )}

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
              disabled={creating || selectedTests.size === 0}
              className="bg-gradient-to-r from-purple-600 to-pink-600"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Suite'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}