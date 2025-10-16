import React from "react";
import { Textarea } from "@/components/ui/textarea";

export default function YAMLEditor({ value, onChange, height = "400px", readOnly = false }) {
  return (
    <Textarea
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      readOnly={readOnly}
      className="font-mono text-sm bg-gray-900 text-green-300 border-gray-700 focus:border-purple-500 resize-none"
      style={{ 
        height, 
        minHeight: height,
        tabSize: 2,
        whiteSpace: 'pre',
        overflowWrap: 'normal',
        overflowX: 'auto'
      }}
      placeholder="# Enter YAML configuration here
name: My Workflow
on: push
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3"
    />
  );
}