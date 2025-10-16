import React, { useState } from "react";
import { Monitor, MapPin, Clock, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { backend } from "@/api/backendClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function SessionManagement({ appId }) {
  const [terminateSessionId, setTerminateSessionId] = useState(null);
  const queryClient = useQueryClient();

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['user-sessions', appId],
    queryFn: async () => {
      if (!appId) return [];
      return await backend.entities.UserSession.filter({ app_id: appId, is_active: true }, '-last_activity');
    },
    enabled: !!appId,
  });

  const terminateSessionMutation = useMutation({
    mutationFn: async (sessionId) => {
      await backend.entities.UserSession.update(sessionId, {
        is_active: false
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-sessions', appId] });
      setTerminateSessionId(null);
    },
  });

  const getDeviceIcon = (userAgent) => {
    if (!userAgent) return "💻";
    if (userAgent.includes('Mobile') || userAgent.includes('Android')) return "📱";
    if (userAgent.includes('Tablet') || userAgent.includes('iPad')) return "📱";
    return "💻";
  };

  const getBrowserName = (userAgent) => {
    if (!userAgent) return "Unknown Browser";
    if (userAgent.includes('Chrome')) return "Chrome";
    if (userAgent.includes('Firefox')) return "Firefox";
    if (userAgent.includes('Safari')) return "Safari";
    if (userAgent.includes('Edge')) return "Edge";
    return "Unknown Browser";
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="backdrop-blur-sm bg-white/20 border border-white/30 rounded-xl p-4 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-white/20 rounded w-1/3" />
                <div className="h-3 bg-white/20 rounded w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="backdrop-blur-sm bg-white/20 border border-white/30 rounded-xl p-12 text-center">
        <Monitor className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">No Active Sessions</h3>
        <p className="text-gray-700">There are no active user sessions at the moment</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {sessions.map((session) => (
          <div
            key={session.id}
            className="backdrop-blur-sm bg-white/20 border border-white/30 rounded-xl p-4 hover:bg-white/30 transition-all"
          >
            <div className="flex items-start gap-4">
              <div className="text-4xl">{getDeviceIcon(session.user_agent)}</div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-semibold text-gray-900">{session.user_email}</h4>
                  <Badge className="backdrop-blur-sm bg-green-500/20 border-green-500/40 text-green-900">
                    Active
                  </Badge>
                </div>
                
                <div className="space-y-1 text-sm text-gray-700">
                  <div className="flex items-center gap-2">
                    <Monitor className="w-3 h-3" />
                    <span>{getBrowserName(session.user_agent)}</span>
                  </div>
                  
                  {session.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3 h-3" />
                      <span>{session.location}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    <span>Last active {formatDistanceToNow(new Date(session.last_activity || session.created_date), { addSuffix: true })}</span>
                  </div>
                  
                  <div className="text-xs text-gray-600 mt-1">
                    IP: {session.ip_address || 'Unknown'}
                  </div>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTerminateSessionId(session.id)}
                className="text-red-600 hover:text-red-700 hover:bg-red-500/10"
                title="Terminate session"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <AlertDialog open={!!terminateSessionId} onOpenChange={(open) => !open && setTerminateSessionId(null)}>
        <AlertDialogContent className="backdrop-blur-xl bg-white/95 border-white/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              Terminate Session
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to terminate this session? The user will be logged out immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => terminateSessionMutation.mutate(terminateSessionId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Terminate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}