import React, { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Clock, Calendar, Info } from "lucide-react";
import { addMinutes, addHours, addDays, addWeeks, addMonths } from "date-fns";

const QUICK_OPTIONS = [
  { label: "Every Minute", value: "* * * * *", next: () => addMinutes(new Date(), 1) },
  { label: "Every 5 Minutes", value: "*/5 * * * *", next: () => addMinutes(new Date(), 5) },
  { label: "Every 15 Minutes", value: "*/15 * * * *", next: () => addMinutes(new Date(), 15) },
  { label: "Every 30 Minutes", value: "*/30 * * * *", next: () => addMinutes(new Date(), 30) },
  { label: "Every Hour", value: "0 * * * *", next: () => addHours(new Date(), 1) },
  { label: "Every Day at Midnight", value: "0 0 * * *", next: () => addDays(new Date(), 1) },
  { label: "Every Monday at 9 AM", value: "0 9 * * 1", next: () => addWeeks(new Date(), 1) },
  { label: "First Day of Month", value: "0 0 1 * *", next: () => addMonths(new Date(), 1) },
];

export default function CronExpressionHelper({ value, onChange }) {
  const [mode, setMode] = useState("quick"); // "quick" or "custom"
  const [quickOption, setQuickOption] = useState("");
  const [customExpression, setCustomExpression] = useState(value || "0 0 * * *");

  useEffect(() => {
    if (value) {
      const found = QUICK_OPTIONS.find(opt => opt.value === value);
      if (found) {
        setMode("quick");
        setQuickOption(value);
      } else {
        setMode("custom");
        setCustomExpression(value);
      }
    }
  }, [value]);

  const handleQuickChange = (selectedValue) => {
    setQuickOption(selectedValue);
    onChange?.(selectedValue);
  };

  const handleCustomChange = (expression) => {
    setCustomExpression(expression);
    onChange?.(expression);
  };

  const getNextRun = () => {
    if (mode === "quick" && quickOption) {
      const option = QUICK_OPTIONS.find(opt => opt.value === quickOption);
      if (option) {
        return option.next();
      }
    }
    // For custom expressions, we'd need a cron parser library
    return null;
  };

  const nextRun = getNextRun();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => setMode("quick")}
          className={`flex-1 py-2 px-4 rounded-lg border transition-all ${
            mode === "quick"
              ? "bg-purple-500/20 border-purple-500/40 text-purple-900 font-semibold"
              : "bg-white/20 border-white/30 text-gray-700"
          }`}
        >
          <Clock className="w-4 h-4 inline mr-2" />
          Quick Options
        </button>
        <button
          type="button"
          onClick={() => setMode("custom")}
          className={`flex-1 py-2 px-4 rounded-lg border transition-all ${
            mode === "custom"
              ? "bg-purple-500/20 border-purple-500/40 text-purple-900 font-semibold"
              : "bg-white/20 border-white/30 text-gray-700"
          }`}
        >
          <Calendar className="w-4 h-4 inline mr-2" />
          Custom Expression
        </button>
      </div>

      {mode === "quick" ? (
        <div className="space-y-3">
          <Label>Select Schedule</Label>
          <Select value={quickOption} onValueChange={handleQuickChange}>
            <SelectTrigger className="bg-white/50">
              <SelectValue placeholder="Choose a schedule..." />
            </SelectTrigger>
            <SelectContent>
              {QUICK_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center justify-between w-full gap-4">
                    <span>{option.label}</span>
                    <code className="text-xs text-gray-600 font-mono">{option.value}</code>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div className="space-y-3">
          <Label>Cron Expression</Label>
          <Input
            value={customExpression}
            onChange={(e) => handleCustomChange(e.target.value)}
            placeholder="* * * * *"
            className="font-mono bg-white/50"
          />
          <div className="backdrop-blur-sm bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
            <div className="flex items-start gap-2 text-xs text-blue-900">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold mb-1">Cron Format: minute hour day month weekday</div>
                <div className="space-y-0.5 text-blue-800">
                  <div>• <code>*</code> = any value</div>
                  <div>• <code>*/5</code> = every 5 units</div>
                  <div>• <code>1-5</code> = range from 1 to 5</div>
                  <div>• <code>1,3,5</code> = specific values</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {nextRun && (
        <div className="backdrop-blur-sm bg-green-500/10 border border-green-500/30 rounded-lg p-3">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-green-700" />
            <span className="text-green-900 font-semibold">Next run:</span>
            <Badge className="bg-green-500/20 border-green-500/40 text-green-900">
              {nextRun.toLocaleString()}
            </Badge>
          </div>
        </div>
      )}

      {(mode === "quick" && quickOption) || (mode === "custom" && customExpression) && (
        <div className="backdrop-blur-sm bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
          <div className="text-xs text-purple-900">
            <span className="font-semibold">Current Expression:</span>
            <code className="ml-2 font-mono">{mode === "quick" ? quickOption : customExpression}</code>
          </div>
        </div>
      )}
    </div>
  );
}