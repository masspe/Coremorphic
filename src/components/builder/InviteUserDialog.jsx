import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, UserPlus, Loader2, Check, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function InviteUserDialog({ open, onOpenChange }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("user");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  const handleInvite = async (e) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      setStatus({ type: 'error', message: 'Please enter a valid email address' });
      return;
    }

    try {
      setLoading(true);
      setStatus(null);

      await base44.functions.invoke('inviteUser', {
        email,
        role
      });

      setStatus({ type: 'success', message: 'Invitation sent successfully!' });
      
      // Reset form after success
      setTimeout(() => {
        setEmail("");
        setRole("user");
        setStatus(null);
        onOpenChange(false);
      }, 2000);
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Failed to send invitation' });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setEmail("");
      setRole("user");
      setStatus(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="backdrop-blur-xl bg-white/95 border border-white/50 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <UserPlus className="w-6 h-6" />
            Invite New User
          </DialogTitle>
          <DialogDescription className="text-gray-700">
            Send an invitation to join your app. They'll receive an email with instructions to get started.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleInvite} className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-gray-900 font-medium">
              Email Address
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 backdrop-blur-sm bg-white/50 border-white/50 text-gray-900"
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role" className="text-gray-900 font-medium">
              Role
            </Label>
            <Select value={role} onValueChange={setRole} disabled={loading}>
              <SelectTrigger className="backdrop-blur-sm bg-white/50 border-white/50 text-gray-900">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-600">
              {role === 'admin' 
                ? 'Admins have full access to manage the app and users' 
                : 'Users have standard access to use the app'}
            </p>
          </div>

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
              onClick={handleClose}
              disabled={loading}
              className="backdrop-blur-sm bg-white/50 border-white/50 text-gray-900"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !email}
              className="backdrop-blur-sm bg-white/90 hover:bg-white text-purple-600 border border-white/50 shadow-xl"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Send Invitation
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}