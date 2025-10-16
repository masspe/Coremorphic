
import React from "react";
import { Key, Plus, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SecretsSection() {
  const [showSecrets, setShowSecrets] = React.useState({});

  const secrets = [
    { name: "STRIPE_API_KEY", value: "sk_test_••••••••••••••••" },
    { name: "OPENAI_API_KEY", value: "sk_••••••••••••••••••" },
    { name: "DATABASE_URL", value: "postgres://••••••••" },
  ];

  return (
    <div className="space-y-6">
      <div className="backdrop-blur-xl bg-white/20 border border-white/30 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Key className="w-8 h-8" />
              Secrets & Environment Variables
            </h1>
            <p className="text-gray-800 mt-2">Manage sensitive configuration</p>
          </div>
          <Button className="backdrop-blur-sm bg-white/90 hover:bg-white text-purple-600 border border-white/50 shadow-xl">
            <Plus className="w-4 h-4 mr-2" />
            Add Secret
          </Button>
        </div>

        <div className="space-y-3">
          {secrets.map((secret, i) => (
            <div key={i} className="backdrop-blur-sm bg-white/10 border border-white/20 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-900 font-medium">{secret.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSecrets({ ...showSecrets, [i]: !showSecrets[i] })}
                  className="text-gray-800 hover:text-gray-900"
                >
                  {showSecrets[i] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
              <code className="text-purple-700 text-sm font-semibold">
                {showSecrets[i] ? "sk_test_4242424242424242" : secret.value}
              </code>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
