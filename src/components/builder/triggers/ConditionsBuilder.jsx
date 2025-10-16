import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Filter } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { backend } from "@/api/backendClient";
import { useQuery } from "@tanstack/react-query";

const OPERATORS = [
  { value: "equals", label: "Equals (=)", types: ["string", "number", "boolean"] },
  { value: "not_equals", label: "Not Equals (≠)", types: ["string", "number", "boolean"] },
  { value: "contains", label: "Contains", types: ["string"] },
  { value: "starts_with", label: "Starts With", types: ["string"] },
  { value: "ends_with", label: "Ends With", types: ["string"] },
  { value: "greater_than", label: "Greater Than (>)", types: ["number"] },
  { value: "less_than", label: "Less Than (<)", types: ["number"] },
  { value: "greater_or_equal", label: "Greater or Equal (≥)", types: ["number"] },
  { value: "less_or_equal", label: "Less or Equal (≤)", types: ["number"] },
  { value: "is_empty", label: "Is Empty", types: ["string"] },
  { value: "is_not_empty", label: "Is Not Empty", types: ["string"] }
];

export default function ConditionsBuilder({ 
  sourceEntity, 
  initialConditions = {}, 
  onChange,
  appId 
}) {
  const [conditions, setConditions] = useState([]);

  // Fetch source entity schema
  const { data: sourceSchema } = useQuery({
    queryKey: ['entity-schema', appId, sourceEntity],
    queryFn: async () => {
      if (!appId || !sourceEntity) return null;
      const entityFiles = await backend.entities.AppFile.filter({
        app_id: appId,
        type: 'entity',
        name: `${sourceEntity}.json`
      });
      if (entityFiles.length > 0) {
        return JSON.parse(entityFiles[0].content);
      }
      return null;
    },
    enabled: !!appId && !!sourceEntity,
  });

  // Initialize conditions from initial data
  useEffect(() => {
    if (Object.keys(initialConditions).length > 0) {
      const conditionsArray = Object.entries(initialConditions).map(([field, value]) => ({
        id: Math.random().toString(36).substr(2, 9),
        field,
        operator: 'equals',
        value: value
      }));
      setConditions(conditionsArray);
    }
  }, [initialConditions]);

  // Convert conditions array to object and notify parent
  useEffect(() => {
    const conditionsObject = {};
    conditions.forEach(c => {
      if (c.field && c.value !== undefined && c.value !== '') {
        conditionsObject[c.field] = c.value;
      }
    });
    onChange?.(conditionsObject);
  }, [conditions]);

  const addCondition = () => {
    setConditions([...conditions, {
      id: Math.random().toString(36).substr(2, 9),
      field: '',
      operator: 'equals',
      value: ''
    }]);
  };

  const removeCondition = (id) => {
    setConditions(conditions.filter(c => c.id !== id));
  };

  const updateCondition = (id, field, value) => {
    setConditions(conditions.map(c => 
      c.id === id ? { ...c, [field]: value } : c
    ));
  };

  const sourceFields = sourceSchema?.properties ? Object.keys(sourceSchema.properties) : [];

  const getFieldType = (fieldName) => {
    if (!sourceSchema?.properties?.[fieldName]) return 'string';
    return sourceSchema.properties[fieldName].type || 'string';
  };

  const getFieldEnum = (fieldName) => {
    if (!sourceSchema?.properties?.[fieldName]) return null;
    return sourceSchema.properties[fieldName].enum;
  };

  const getAvailableOperators = (fieldType) => {
    return OPERATORS.filter(op => op.types.includes(fieldType));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-semibold">Conditions (Optional)</Label>
          <p className="text-xs text-gray-600 mt-1">Trigger will only execute when these conditions are met</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addCondition}
          className="h-8"
        >
          <Plus className="w-3 h-3 mr-1" />
          Add Condition
        </Button>
      </div>

      {conditions.length === 0 ? (
        <div className="text-center py-6 backdrop-blur-sm bg-white/10 border border-white/20 rounded-xl">
          <Filter className="w-10 h-10 text-gray-500 mx-auto mb-2" />
          <p className="text-sm text-gray-700 mb-1">No conditions defined</p>
          <p className="text-xs text-gray-600 mb-3">Trigger will execute on every event</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addCondition}
          >
            <Plus className="w-3 h-3 mr-1" />
            Add Condition
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {conditions.map((condition, index) => {
            const fieldType = getFieldType(condition.field);
            const fieldEnum = getFieldEnum(condition.field);
            const availableOperators = getAvailableOperators(fieldType);

            return (
              <div 
                key={condition.id}
                className="backdrop-blur-sm bg-white/10 border border-white/20 rounded-xl p-4"
              >
                <div className="flex items-start gap-3">
                  {index > 0 && (
                    <Badge className="mt-2 bg-blue-500/20 border-blue-500/40 text-blue-900">
                      AND
                    </Badge>
                  )}
                  
                  <div className="flex-1 grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs text-gray-700">Field</Label>
                      <Select
                        value={condition.field}
                        onValueChange={(value) => updateCondition(condition.id, 'field', value)}
                      >
                        <SelectTrigger className="bg-white/50">
                          <SelectValue placeholder="Select field..." />
                        </SelectTrigger>
                        <SelectContent>
                          {sourceFields.map(field => (
                            <SelectItem key={field} value={field}>
                              <div className="flex items-center gap-2">
                                <span>{field}</span>
                                <Badge variant="outline" className="text-xs">
                                  {getFieldType(field)}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-gray-700">Operator</Label>
                      <Select
                        value={condition.operator}
                        onValueChange={(value) => updateCondition(condition.id, 'operator', value)}
                        disabled={!condition.field}
                      >
                        <SelectTrigger className="bg-white/50">
                          <SelectValue placeholder="Select operator..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableOperators.map(op => (
                            <SelectItem key={op.value} value={op.value}>
                              {op.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-gray-700">Value</Label>
                      {fieldEnum ? (
                        <Select
                          value={condition.value}
                          onValueChange={(value) => updateCondition(condition.id, 'value', value)}
                          disabled={!condition.field}
                        >
                          <SelectTrigger className="bg-white/50">
                            <SelectValue placeholder="Select value..." />
                          </SelectTrigger>
                          <SelectContent>
                            {fieldEnum.map(val => (
                              <SelectItem key={val} value={val}>
                                {val}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : fieldType === 'boolean' ? (
                        <Select
                          value={condition.value}
                          onValueChange={(value) => updateCondition(condition.id, 'value', value)}
                          disabled={!condition.field}
                        >
                          <SelectTrigger className="bg-white/50">
                            <SelectValue placeholder="Select value..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="true">True</SelectItem>
                            <SelectItem value="false">False</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          type={fieldType === 'number' ? 'number' : 'text'}
                          value={condition.value}
                          onChange={(e) => updateCondition(condition.id, 'value', e.target.value)}
                          placeholder="Enter value..."
                          className="bg-white/50"
                          disabled={!condition.field || ['is_empty', 'is_not_empty'].includes(condition.operator)}
                        />
                      )}
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCondition(condition.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-100 flex-shrink-0 mt-6"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Conditions Summary */}
      {conditions.filter(c => c.field && c.value !== undefined && c.value !== '').length > 0 && (
        <div className="backdrop-blur-sm bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
          <div className="text-sm font-semibold text-blue-900 mb-2">Active Conditions</div>
          <div className="space-y-1">
            {conditions.filter(c => c.field && c.value !== undefined && c.value !== '').map((c, idx) => (
              <div key={c.id} className="text-xs text-blue-800 flex items-center gap-2">
                {idx > 0 && <span className="font-semibold">AND</span>}
                <span className="font-mono">{c.field}</span>
                <span>{OPERATORS.find(op => op.value === c.operator)?.label || c.operator}</span>
                <span className="font-mono font-semibold">{c.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}