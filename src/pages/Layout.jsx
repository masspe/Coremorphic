
import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Home, LayoutDashboard, Code, Sparkles, LogOut } from "lucide-react";
import { backend } from "@/api/backendClient";

export default function Layout({ children, currentPageName, pageNames = [] }) {
  const [user, setUser] = React.useState(null);

  React.useEffect(() => {
    backend.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const navigationItems = React.useMemo(() => ([
    { title: "Home", url: createPageUrl("Home"), icon: Home },
    { title: "Dashboard", url: createPageUrl("Dashboard"), icon: LayoutDashboard },
    { title: "Builder", url: createPageUrl("Builder"), icon: Code }
  ]), []);

  React.useEffect(() => {
    const mismatchedLinks = navigationItems.filter((item) => !pageNames.includes(item.title));

    if (mismatchedLinks.length > 0) {
      const mismatchedTitles = mismatchedLinks.map((item) => `"${item.title}"`).join(", ");
      throw new Error(`Navigation link titles must exactly match page names (case sensitive): ${mismatchedTitles}`);
    }
  }, [navigationItems, pageNames]);

  const handleLogout = () => {
    backend.auth.logout();
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-pink-500 to-cyan-500 opacity-90" />
        <div className="absolute inset-0 bg-gradient-to-tl from-blue-600 via-purple-600 to-pink-500 opacity-80 animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute top-0 -left-40 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob" />
        <div className="absolute top-0 -right-40 w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000" />
        <div className="absolute -bottom-40 left-20 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000" />
      </div>

      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 10s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>

      {/* Glassmorphic Navigation */}
      <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-7xl">
        <div className="bg-white/10 text-slate-900 px-6 py-4 rounded-2xl border-white/20 shadow-2xl backdrop-blur-xl border">
          <div className="flex items-center justify-between">
            <Link to={createPageUrl("Home")} className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center backdrop-blur-sm border border-white/30 shadow-lg group-hover:shadow-purple-500/50 transition-all duration-300">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-purple-100 via-purple-700 to-pink-100 bg-clip-text text-transparent">Coremorphic
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-2">
              {navigationItems.map((item) => {
                const isActive = currentPageName === item.title;
                return (
                  <Link
                    key={item.title}
                    to={item.url}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 backdrop-blur-sm border border-white/30 shadow-lg ${isActive
                      ? "bg-white text-slate-900"
                      : "bg-white/20 text-slate-900/80 hover:bg-white/30 hover:text-slate-900"
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span className="font-medium">{item.title}</span>
                  </Link>
                );
              })}
            </div>

            {user &&
              <div className="flex items-center gap-3">
                <div className="backdrop-blur-sm bg-white/10 border border-white/20 rounded-xl px-4 py-2 hidden md:block">
                  <span className="text-white text-sm font-medium">{user.full_name}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="backdrop-blur-sm bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl p-2 text-white transition-all duration-300">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            }
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-28 px-4 min-h-screen">
        {children}
      </main>
    </div>
  );
}
