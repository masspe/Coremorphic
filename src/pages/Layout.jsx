import React from "react"
import { Link } from "react-router-dom"
import { createPageUrl } from "@/utils"
import { Home, LayoutDashboard, Code, Sparkles, ChevronRight } from "lucide-react"
import { backend } from "@/api/backendClient"

const navigationItems = [
  { title: "Home", url: createPageUrl("Home"), icon: Home },
  { title: "Dashboard", url: createPageUrl("Dashboard"), icon: LayoutDashboard },
  { title: "Builder", url: createPageUrl("Builder"), icon: Code },
]

export default function Layout({ children, currentPageName, pageNames = [] }) {
  const [user, setUser] = React.useState(null)

  React.useEffect(() => {
    backend.auth
      .me()
      .then(setUser)
      .catch(() => setUser(null))
  }, [])

  React.useEffect(() => {
    const mismatchedLinks = navigationItems.filter((item) => !pageNames.includes(item.title))

    if (mismatchedLinks.length > 0) {
      const mismatchedTitles = mismatchedLinks.map((item) => `"${item.title}"`).join(", ")
      throw new Error(`Navigation link titles must exactly match page names (case sensitive): ${mismatchedTitles}`)
    }
  }, [pageNames])

  return (
    <div className="min-h-screen bg-[#f2f6ff] text-slate-700">
      <div className="flex min-h-screen">
        <aside className="relative hidden w-72 shrink-0 border-r border-slate-200 bg-white/90 backdrop-blur lg:flex lg:flex-col">
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-br from-[#7551ff]/20 via-[#7551ff]/10 to-transparent" />

          <div className="relative flex flex-col gap-8 p-6">
            <Link to={createPageUrl("Home")} className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#7551ff] to-[#3311db] text-white shadow-lg">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-semibold text-slate-900">HORIZON FREE</span>
                <span className="text-xs font-medium uppercase tracking-widest text-slate-400">Dashboard Kit</span>
              </div>
            </Link>

            <nav className="flex flex-col gap-2">
              {navigationItems.map((item) => {
                const isActive = currentPageName === item.title
                return (
                  <Link
                    key={item.title}
                    to={item.url}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                      isActive
                        ? "bg-[#7551ff] text-white shadow-lg shadow-[#7551ff]/30"
                        : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </Link>
                )
              })}
            </nav>
          </div>

          <div className="relative mt-auto p-6">
            <div className="rounded-2xl bg-gradient-to-br from-[#7551ff] via-[#3311db] to-[#0d1b9f] p-6 text-white shadow-xl">
              <h3 className="text-lg font-semibold">Upgrade to PRO</h3>
              <p className="mt-2 text-sm text-white/70">
                Improve your development process and start with Horizon UI PRO.
              </p>
              <Link
                to={createPageUrl("Builder")}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/20 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/30"
              >
                Upgrade Now
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            {user && (
              <div className="mt-6 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#7551ff] to-[#3311db] text-white">
                  {user.full_name?.slice(0, 1).toUpperCase() || "U"}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{user.full_name}</p>
                  <p className="text-xs text-slate-500">Logged in</p>
                </div>
              </div>
            )}
          </div>
        </aside>

        <div className="flex flex-1 flex-col">
          <div className="border-b border-slate-200 bg-white/80 px-4 py-4 backdrop-blur lg:hidden">
            <div className="flex items-center justify-between">
              <Link to={createPageUrl("Home")} className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#7551ff] to-[#3311db] text-white">
                  <Sparkles className="h-4 w-4" />
                </div>
                <span className="text-sm font-semibold text-slate-900">Horizon Free</span>
              </Link>
            </div>
            <div className="mt-4 flex items-center gap-2 overflow-x-auto">
              {navigationItems.map((item) => {
                const isActive = currentPageName === item.title
                return (
                  <Link
                    key={item.title}
                    to={item.url}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                      isActive ? "bg-[#7551ff] text-white" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.title}
                  </Link>
                )
              })}
            </div>
          </div>

          <main className="flex-1 px-4 py-6 md:px-8 lg:px-10 lg:py-10">{children}</main>
        </div>
      </div>
    </div>
  )
}
