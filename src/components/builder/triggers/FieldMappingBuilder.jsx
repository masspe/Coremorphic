import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, ArrowRight, Zap, User, Clock, Key } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { backend } from "@/api/backendClient";
import { useQuery } from "@tanstack/react-query";

const SPECIAL_VALUES = [
  { value: "$sourceId", label: "Source Record ID", icon: Key, description: "ID of the source record" },
  { value: "$timestamp", label: "Current Timestamp", icon: Clock, description: "Current date and time" },
  { value: "$userId", label: "Current User Email", icon: User, description: "Email of the user performing the action" },
  { value: "$userName", label: "Current User Name", icon: User, description: "Full name of the user" }
];

export default function FieldMappingBuilder({ 
  sourceEntity, 
  targetEntity, 
  initialMapping = {}, 
  onChange,
  appId 
}) {
  const [mappings, setMappings] = useState([]);

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

  // Fetch target entity schema
  const { data: targetSchema } = useQuery({
    queryKey: ['entity-schema', appId, targetEntity],
    queryFn: async () => {
      if (!appId || !targetEntity) return null;
      const entityFiles = await backend.entities.AppFile.filter({
        app_id: appId,
        type: 'entity',
        name: `${targetEntity}.json`
      });
      if (entityFiles.length > 0) {
        return JSON.parse(entityFiles[0].content);
      }
      return null;
    },
    enabled: !!appId && !!targetEntity,
  });

  // Initialize mappings from initial data
  useEffect(() => {
    if (Object.keys(initialMapping).length > 0) {
      const mappingArray = Object.entries(initialMapping).map(([target, source]) => ({
        id: Math.random().toString(36).substr(2, 9),
        targetField: target,
        sourceField: source,
        isSpecial: source.startsWith('$')
      }));
      setMappings(mappingArray);
    } else if (mappings.length === 0) {
      // Add one empty mapping by default
      setMappings([{
        id: Math.random().toString(36).substr(2, 9),
        targetField: '',
        sourceField: '',
        isSpecial: false
      }]);
    }
  }, [initialMapping]);

  // Convert mappings array to object and notify parent
  useEffect(() => {
    const mappingObject = {};
    mappings.forEach(m => {
      if (m.targetField && m.sourceField) {
        mappingObject[m.targetField] = m.sourceField;
      }
    });
    onChange?.(mappingObject);
  }, [mappings]);

  const addMapping = () => {
    setMappings([...mappings, {
      id: Math.random().toString(36).substr(2, 9),
      targetField: '',
      sourceField: '',
      isSpecial: false
    }]);
  };

  const removeMapping = (id) => {
    setMappings(mappings.filter(m => m.id !== id));
  };

  const updateMapping = (id, field, value) => {
    setMappings(mappings.map(m => 
      m.id === id 
        ? { ...m, [field]: value, isSpecial: field === 'sourceField' && value.startsWith('$') }
        : m
    ));
  };

  const sourceFields = sourceSchema?.properties ? Object.keys(sourceSchema.properties) : [];
  const targetFields = targetSchema?.properties ? Object.keys(targetSchema.properties) : [];

  const getFieldType = (schema, fieldName) => {
    if (!schema?.properties?.[fieldName]) return null;
    return schema.properties[fieldName].type || 'string';
  };

  const getFieldDescription = (schema, fieldName) => {
    if (!schema?.properties?.[fieldName]) return null;
    return schema.properties[fieldName].description;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">Field Mapping</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addMapping}
          className="h-8"
        >
          <Plus className="w-3 h-3 mr-1" />
          Add Mapping
        </Button>
      </div>

      {mappings.length === 0 ? (
        <div className="text-center py-8 backdrop-blur-sm bg-white/10 border border-white/20 rounded-xl">
          <Zap className="w-12 h-12 text-gray-500 mx-auto mb-2" />
          <p className="text-sm text-gray-700">No field mappings defined</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addMapping}
            className="mt-3"
          >
            <Plus className="w-3 h-3 mr-1" />
            Add First Mapping
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {mappings.map((mapping, index) => (
            <div 
              key={mapping.id}
              className="backdrop-blur-sm bg-white/10 border border-white/20 rounded-xl p-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex-1 space-y-2">
                  <Label className="text-xs text-gray-700">Target Field ({targetEntity})</Label>
                  <Select
                    value={mapping.targetField}
                    onValueChange={(value) => updateMapping(mapping.id, 'targetField', value)}
                  >
                    <SelectTrigger className="bg-white/50">
                      <SelectValue placeholder="Select target field..." />
                    </SelectTrigger>
                    <SelectContent>
                      {targetFields.map(field => (
                        <SelectItem key={field} value={field}>
                          <div className="flex items-center gap-2">
                            <span>{field}</span>
                            <Badge variant="outline" className="text-xs">
                              {getFieldType(targetSchema, field)}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {mapping.targetField && getFieldDescription(targetSchema, mapping.targetField) && (
                    <p className="text-xs text-gray-600">
                      {getFieldDescription(targetSchema, mapping.targetField)}
                    </p>
                  )}
                </div>

                <ArrowRight className="w-5 h-5 text-purple-600 flex-shrink-0 mt-6" />

                <div className="flex-1 space-y-2">
                  <Label className="text-xs text-gray-700">Source Field ({sourceEntity})</Label>
                  <Select
                    value={mapping.sourceField}
                    onValueChange={(value) => updateMapping(mapping.id, 'sourceField', value)}
                  >
                    <SelectTrigger className="bg-white/50">
                      <SelectValue placeholder="Select source field..." />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="px-2 py-1.5 text-xs font-semibold text-gray-700">
                        Entity Fields
                      </div>
                      {sourceFields.map(field => (
                        <SelectItem key={field} value={field}>
                          <div className="flex items-center gap-2">
                            <span>{field}</span>
                            <Badge variant="outline" className="text-xs">
                              {getFieldType(sourceSchema, field)}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                      <div className="px-2 py-1.5 text-xs font-semibold text-gray-700 border-t mt-1 pt-2">
                        Special Values
                      </div>
                      {SPECIAL_VALUES.map(special => {
                        const Icon = special.icon;
                        return (
                          <SelectItem key={special.value} value={special.value}>
                            <div className="flex items-center gap-2">
                              <Icon className="w-3 h-3 text-purple-600" />
                              <span>{special.label}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {mapping.isSpecial && SPECIAL_VALUES.find(s => s.value === mapping.sourceField) && (
                    <p className="text-xs text-purple-700 flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      {SPECIAL_VALUES.find(s => s.value === mapping.sourceField).description}
                    </p>
                  )}
                  {!mapping.isSpecial && mapping.sourceField && getFieldDescription(sourceSchema, mapping.sourceField) && (
                    <p className="text-xs text-gray-600">
                      {getFieldDescription(sourceSchema, mapping.sourceField)}
                    </p>
                  )}
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeMapping(mapping.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-100 flex-shrink-0 mt-6"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Field Mapping Summary */}
      {mappings.filter(m => m.targetField && m.sourceField).length > 0 && (
        <div className="backdrop-blur-sm bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
          <div className="text-sm font-semibold text-purple-900 mb-2">Mapping Summary</div>
          <div className="space-y-1">
            {mappings.filter(m => m.targetField && m.sourceField).map(m => (
              <div key={m.id} className="text-xs text-purple-800 flex items-center gap-2">
                <span className="font-mono">{m.targetField}</span>
                <ArrowRight className="w-3 h-3" />
                <span className="font-mono">{m.sourceField}</span>
                {m.isSpecial && <Badge className="bg-purple-500/20 border-purple-500/40 text-purple-900">Special</Badge>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}