import React from "react"
import { Link } from "react-router-dom"
import { createPageUrl } from "@/utils"
import { Home, LayoutDashboard, Code } from "lucide-react"
import { backend } from "@/api/backendClient"
import CoremorphicLogo from "@/components/CoremorphicLogo"

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
      <div className="flex min-h-screen flex-col">
        <header className="relative z-20 border-b border-slate-200 bg-white/80 backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between md:gap-6">
            <Link to={createPageUrl("Home")} className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-md ring-1 ring-slate-200">
                <CoremorphicLogo className="h-8 w-8" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-semibold text-slate-900">Coremorphic</span>
                <span className="text-xs font-medium uppercase tracking-[0.35em] text-slate-400">Experience Suite</span>
              </div>
            </Link>

            <nav className="hidden items-center gap-1 rounded-full bg-white/70 p-1 text-sm font-medium text-slate-600 shadow-sm ring-1 ring-slate-200 md:flex">
              {navigationItems.map((item) => {
                const isActive = currentPageName === item.title
                return (
                  <Link
                    key={item.title}
                    to={item.url}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex items-center gap-2 rounded-full px-4 py-2 transition-colors ${
                      isActive
                        ? "bg-[#7551ff] text-white shadow"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </Link>
                )
              })}
            </nav>

            <div className="flex items-center justify-between gap-4 md:justify-end">
              <nav className="flex flex-1 items-center gap-2 overflow-x-auto text-sm font-medium text-slate-600 md:hidden">
                {navigationItems.map((item) => {
                  const isActive = currentPageName === item.title
                  return (
                    <Link
                      key={item.title}
                      to={item.url}
                      aria-current={isActive ? "page" : undefined}
                      className={`flex items-center gap-2 rounded-full px-4 py-2 transition ${
                        isActive ? "bg-[#7551ff] text-white" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.title}
                    </Link>
                  )
                })}
              </nav>

              {user ? (
                <div className="flex items-center gap-3 rounded-full bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#7551ff] to-[#3311db] text-white">
                    {user.full_name?.slice(0, 1).toUpperCase() || "U"}
                  </div>
                  <div className="hidden text-left leading-tight sm:block">
                    <p className="text-xs font-semibold text-slate-900">{user.full_name}</p>
                    <p className="text-[11px] text-slate-500">Signed in</p>
                  </div>
                </div>
              ) : (
                <div className="hidden items-center gap-2 text-sm font-medium text-slate-500 md:flex">
                  <span>Welcome</span>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 md:px-8 lg:px-10 lg:py-10">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  )
}
