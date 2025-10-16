import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Check, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function RecordFormDialog({ open, onOpenChange, entity, record, onSuccess }) {
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (entity && record) {
      // Populate form with record data (excluding built-in fields)
      const data = {};
      Object.keys(entity.schema?.properties || {}).forEach(key => {
        if (!['id', 'created_date', 'updated_date', 'created_by'].includes(key)) {
          data[key] = record[key] || '';
        }
      });
      setFormData(data);
    } else if (entity) {
      // Initialize empty form
      const data = {};
      Object.keys(entity.schema?.properties || {}).forEach(key => {
        if (!['id', 'created_date', 'updated_date', 'created_by'].includes(key)) {
          data[key] = '';
        }
      });
      setFormData(data);
    }
  }, [entity, record]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setStatus(null);

      const EntityClass = base44.entities[entity.name];
      
      if (record) {
        // Update existing record
        await EntityClass.update(record.id, formData);
        setStatus({ type: 'success', message: 'Record updated successfully!' });
      } else {
        // Create new record
        await EntityClass.create(formData);
        setStatus({ type: 'success', message: 'Record created successfully!' });
      }
      
      setTimeout(() => {
        setStatus(null);
        onOpenChange(false);
        if (onSuccess) onSuccess();
      }, 1500);
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Failed to save record' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const renderField = (key, property) => {
    const type = property.type;
    const isRequired = entity.schema?.required?.includes(key);

    if (property.enum) {
      return (
        <Select
          value={formData[key] || ''}
          onValueChange={(value) => handleChange(key, value)}
          disabled={loading}
        >
          <SelectTrigger className="backdrop-blur-sm bg-white/50 border-white/50 text-gray-900">
            <SelectValue placeholder={`Select ${key}`} />
          </SelectTrigger>
          <SelectContent>
            {property.enum.map(option => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (type === 'string' && property.format === 'date') {
      return (
        <Input
          type="date"
          value={formData[key] || ''}
          onChange={(e) => handleChange(key, e.target.value)}
          className="backdrop-blur-sm bg-white/50 border-white/50 text-gray-900"
          disabled={loading}
          required={isRequired}
        />
      );
    }

    if (type === 'number' || type === 'integer') {
      return (
        <Input
          type="number"
          value={formData[key] || ''}
          onChange={(e) => handleChange(key, e.target.value)}
          className="backdrop-blur-sm bg-white/50 border-white/50 text-gray-900"
          disabled={loading}
          required={isRequired}
        />
      );
    }

    if (type === 'boolean') {
      return (
        <Select
          value={formData[key] === true ? 'true' : formData[key] === false ? 'false' : ''}
          onValueChange={(value) => handleChange(key, value === 'true')}
          disabled={loading}
        >
          <SelectTrigger className="backdrop-blur-sm bg-white/50 border-white/50 text-gray-900">
            <SelectValue placeholder="Select value" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">True</SelectItem>
            <SelectItem value="false">False</SelectItem>
          </SelectContent>
        </Select>
      );
    }

    // Default to textarea for long text, input for short
    if (property.description && property.description.length > 50) {
      return (
        <Textarea
          value={formData[key] || ''}
          onChange={(e) => handleChange(key, e.target.value)}
          className="backdrop-blur-sm bg-white/50 border-white/50 text-gray-900 h-24"
          disabled={loading}
          required={isRequired}
        />
      );
    }

    return (
      <Input
        type="text"
        value={formData[key] || ''}
        onChange={(e) => handleChange(key, e.target.value)}
        className="backdrop-blur-sm bg-white/50 border-white/50 text-gray-900"
        disabled={loading}
        required={isRequired}
      />
    );
  };

  if (!entity) return null;

  const properties = entity.schema?.properties || {};
  const propertyKeys = Object.keys(properties).filter(key => 
    !['id', 'created_date', 'updated_date', 'created_by'].includes(key)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="backdrop-blur-xl bg-white/95 border border-white/50 shadow-2xl max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900">
            {record ? 'Edit' : 'Add'} {entity.name} Record
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {propertyKeys.map(key => {
            const property = properties[key];
            const isRequired = entity.schema?.required?.includes(key);
            
            return (
              <div key={key} className="space-y-2">
                <Label htmlFor={key} className="text-gray-900 font-medium">
                  {key} {isRequired && <span className="text-red-600">*</span>}
                </Label>
                {renderField(key, property)}
                {property.description && (
                  <p className="text-xs text-gray-600">{property.description}</p>
                )}
              </div>
            );
          })}

          {status && (
            <div className={`p-3 rounded-xl border flex items-center gap-2 text-sm font-medium ${
              status.type === 'success'
                ? 'bg-green-500/20 border-green-500/40 text-green-900'
                : 'bg-red-500/20 border-red-500/40 text-red-900'
            }`}>
              {status.type === 'success' ? (
                <Check className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              {status.message}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="backdrop-blur-sm bg-white/50 border-white/50 text-gray-900"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="backdrop-blur-sm bg-white/90 hover:bg-white text-purple-600 border border-white/50 shadow-xl"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                record ? 'Update Record' : 'Create Record'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}