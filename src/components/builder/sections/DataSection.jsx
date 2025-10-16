import React, { useState } from "react";
import { Database, Plus, Table, Pencil, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { backend } from "@/api/backendClient";
import { useQuery } from "@tanstack/react-query";
import NewEntityDialog from "../data/NewEntityDialog";
import EditEntityDialog from "../data/EditEntityDialog";
import EntityDataView from "../data/EntityDataView";

export default function DataSection({ appId }) {
  const [newEntityDialogOpen, setNewEntityDialogOpen] = useState(false);
  const [editEntityDialogOpen, setEditEntityDialogOpen] = useState(false);
  const [dataViewOpen, setDataViewOpen] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState(null);

  const { data: entities = [], isLoading, refetch } = useQuery({
    queryKey: ['app-entities', appId],
    queryFn: async () => {
      if (!appId) return [];
      
      // Get all entity files for this app
      const entityFiles = await backend.entities.AppFile.filter({ 
        app_id: appId,
        type: 'entity'
      });
      
      // Parse each entity file to get schema info
      return entityFiles.map(file => {
        try {
          const schema = JSON.parse(file.content);
          const recordCount = 0; // We'll fetch this later if needed
          
          return {
            name: file.name.replace('.json', ''),
            path: file.path,
            schema,
            recordCount,
            icon: getEntityIcon(file.name)
          };
        } catch (e) {
          return null;
        }
      }).filter(Boolean);
    },
    enabled: !!appId,
  });

  const getEntityIcon = (name) => {
    const icons = {
      'User': '👤',
      'Product': '📦',
      'Order': '🛒',
      'Task': '✓',
      'Post': '📝',
      'Comment': '💬',
      'Category': '🏷️',
      'App': '📱',
      'AppFile': '📄'
    };
    return icons[name.replace('.json', '')] || '📊';
  };

  const handleEditEntity = (entity) => {
    setSelectedEntity(entity);
    setEditEntityDialogOpen(true);
  };

  const handleViewData = (entity) => {
    setSelectedEntity(entity);
    setDataViewOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="backdrop-blur-xl bg-white/20 border border-white/30 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Database className="w-8 h-8" />
              Data Management
            </h1>
            <p className="text-gray-800 mt-2">View and manage your app's data entities</p>
          </div>
          <Button 
            onClick={() => setNewEntityDialogOpen(true)}
            className="backdrop-blur-sm bg-white/90 hover:bg-white text-purple-600 border border-white/50 shadow-xl"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Entity
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="backdrop-blur-sm bg-white/10 border border-white/20 rounded-xl p-6 animate-pulse">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-white/20 rounded-lg" />
                  <div className="w-8 h-8 bg-white/20 rounded" />
                </div>
                <div className="h-6 bg-white/20 rounded w-2/3 mb-2" />
                <div className="h-4 bg-white/20 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : entities.length === 0 ? (
          <div className="backdrop-blur-sm bg-white/10 border border-white/20 rounded-xl p-12 text-center">
            <Database className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Entities Yet</h3>
            <p className="text-gray-700 mb-6">Create your first entity to start managing data</p>
            <Button 
              onClick={() => setNewEntityDialogOpen(true)}
              className="backdrop-blur-sm bg-white/90 hover:bg-white text-purple-600 border border-white/50"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create First Entity
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {entities.map((entity, i) => (
              <div 
                key={i} 
                className="backdrop-blur-sm bg-white/10 border border-white/20 rounded-xl p-6 hover:bg-white/20 transition-all group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="text-4xl">{entity.icon}</div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewData(entity)}
                      className="text-gray-700 hover:text-gray-900"
                      title="View Data"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditEntity(entity)}
                      className="text-gray-700 hover:text-gray-900"
                      title="Edit Schema"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{entity.name}</h3>
                <div className="text-gray-800 flex items-center gap-2">
                  <Table className="w-4 h-4" />
                  {Object.keys(entity.schema?.properties || {}).length} fields
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <NewEntityDialog 
        open={newEntityDialogOpen} 
        onOpenChange={setNewEntityDialogOpen}
        onSuccess={refetch}
      />

      <EditEntityDialog 
        open={editEntityDialogOpen} 
        onOpenChange={setEditEntityDialogOpen}
        entity={selectedEntity}
        onSuccess={refetch}
      />

      <EntityDataView
        open={dataViewOpen}
        onOpenChange={setDataViewOpen}
        entity={selectedEntity}
      />
    </div>
  );
}