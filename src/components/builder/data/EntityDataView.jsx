import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, Plus, Pencil, Trash2, X, Loader2 } from "lucide-react";
import { backend } from "@/api/backendClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import RecordFormDialog from "./RecordFormDialog";

export default function EntityDataView({ open, onOpenChange, entity }) {
  const queryClient = useQueryClient();
  const [recordDialogOpen, setRecordDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['entity-records', entity?.name],
    queryFn: async () => {
      if (!entity) return [];
      const EntityClass = backend.entities[entity.name];
      if (!EntityClass) return [];
      return await EntityClass.list();
    },
    enabled: open && !!entity,
  });

  const deleteMutation = useMutation({
    mutationFn: async (recordId) => {
      const EntityClass = backend.entities[entity.name];
      await EntityClass.delete(recordId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entity-records', entity?.name] });
    },
  });

  const handleEdit = (record) => {
    setEditingRecord(record);
    setRecordDialogOpen(true);
  };

  const handleDelete = async (recordId) => {
    if (confirm('Are you sure you want to delete this record?')) {
      deleteMutation.mutate(recordId);
    }
  };

  const handleNewRecord = () => {
    setEditingRecord(null);
    setRecordDialogOpen(true);
  };

  if (!entity) return null;

  // Get schema properties (excluding built-in fields)
  const properties = entity.schema?.properties || {};
  const propertyKeys = Object.keys(properties).filter(key => 
    !['id', 'created_date', 'updated_date', 'created_by'].includes(key)
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="backdrop-blur-xl bg-white/95 border border-white/50 shadow-2xl max-w-6xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Table className="w-6 h-6" />
              {entity.name} Data
            </DialogTitle>
            <DialogDescription className="text-gray-700">
              View and manage records for this entity ({records.length} records)
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="mb-4">
              <Button
                onClick={handleNewRecord}
                className="backdrop-blur-sm bg-white/90 hover:bg-white text-purple-600 border border-white/50 shadow-xl"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Record
              </Button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
              </div>
            ) : records.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 backdrop-blur-sm bg-white/10 border border-white/20 rounded-xl">
                <Table className="w-16 h-16 text-gray-400 mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Records Yet</h3>
                <p className="text-gray-700 mb-4">Add your first record to get started</p>
                <Button
                  onClick={handleNewRecord}
                  className="backdrop-blur-sm bg-white/90 hover:bg-white text-purple-600 border border-white/50"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Record
                </Button>
              </div>
            ) : (
              <div className="flex-1 overflow-auto backdrop-blur-sm bg-white/10 border border-white/20 rounded-xl">
                <table className="w-full">
                  <thead className="sticky top-0 backdrop-blur-sm bg-white/20 border-b border-white/30">
                    <tr>
                      {propertyKeys.map(key => (
                        <th key={key} className="text-left p-3 text-gray-900 font-semibold">
                          {key}
                        </th>
                      ))}
                      <th className="text-right p-3 text-gray-900 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record, idx) => (
                      <tr 
                        key={record.id} 
                        className={`border-b border-white/10 hover:bg-white/10 ${idx % 2 === 0 ? 'bg-white/5' : ''}`}
                      >
                        {propertyKeys.map(key => (
                          <td key={key} className="p-3 text-gray-800">
                            {typeof record[key] === 'object' 
                              ? JSON.stringify(record[key]) 
                              : String(record[key] || '-')}
                          </td>
                        ))}
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(record)}
                              className="text-gray-700 hover:text-gray-900"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(record.id)}
                              disabled={deleteMutation.isLoading}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <RecordFormDialog
        open={recordDialogOpen}
        onOpenChange={setRecordDialogOpen}
        entity={entity}
        record={editingRecord}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['entity-records', entity?.name] });
        }}
      />
    </>
  );
}