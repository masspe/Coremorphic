import React from "react"
import clsx from "clsx"
import { Link } from "react-router-dom"
import { createPageUrl } from "@/utils"
import { Home, LayoutDashboard, Code, Play } from "lucide-react"
import { backend } from "@/api/backendClient"
import CoremorphicLogo from "@/components/CoremorphicLogo"

const navigationItems = [
  { title: "Home", url: createPageUrl("Home"), icon: Home },
  { title: "Dashboard", url: createPageUrl("Dashboard"), icon: LayoutDashboard },
  { title: "Builder", url: createPageUrl("Builder"), icon: Code },
  { title: "Sandbox", url: createPageUrl("Sandbox"), icon: Play },
]

export default function Layout({ children, currentPageName, pageNames = [] }) {
  const [user, setUser] = React.useState(null)

  const isHome = currentPageName === "Home"

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
    <div
      className={clsx(
        "relative min-h-screen",
        isHome ? "bg-slate-950 text-slate-100" : "bg-[#f2f6ff] text-slate-700"
      )}
    >
      {isHome && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 left-1/2 h-[720px] w-[720px] -translate-x-1/2 rounded-full bg-purple-500/30 blur-[180px]" />
          <div className="absolute bottom-0 left-0 h-[520px] w-[520px] -translate-x-1/3 bg-pink-500/25 blur-[160px]" />
          <div className="absolute top-1/3 right-0 h-[440px] w-[440px] translate-x-1/4 bg-cyan-500/25 blur-[180px]" />
        </div>
      )}

      <div className="relative z-10 flex min-h-screen flex-col">
        <header
          className={clsx(
            "relative z-20 border-b backdrop-blur",
            isHome
              ? "border-white/10 bg-white/10 text-white"
              : "border-slate-200 bg-white/80"
          )}
        >
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between md:gap-6">
            <Link to={createPageUrl("Home")} className="flex items-center gap-3">
              <div
                className={clsx(
                  "flex h-12 w-12 items-center justify-center rounded-2xl shadow-md ring-1",
                  isHome
                    ? "bg-white/20 ring-white/20"
                    : "bg-white ring-slate-200"
                )}
              >
                <CoremorphicLogo className="h-8 w-8" />
              </div>
              <div className="flex flex-col">
                <span
                  className={clsx(
                    "text-xl font-semibold",
                    isHome ? "text-white" : "text-slate-900"
                  )}
                >
                  Coremorphic
                </span>
                <span
                  className={clsx(
                    "text-xs font-medium uppercase tracking-[0.35em]",
                    isHome ? "text-white/60" : "text-slate-400"
                  )}
                >
                  Experience Suite
                </span>
              </div>
            </Link>

            <nav
              className={clsx(
                "hidden items-center gap-1 rounded-full p-1 text-sm font-medium shadow-sm ring-1 md:flex",
                isHome
                  ? "bg-white/10 text-white/70 ring-white/15"
                  : "bg-white/70 text-slate-600 ring-slate-200"
              )}
            >
              {navigationItems.map((item) => {
                const isActive = currentPageName === item.title
                return (
                  <Link
                    key={item.title}
                    to={item.url}
                    aria-current={isActive ? "page" : undefined}
                    className={clsx(
                      "flex items-center gap-2 rounded-full px-4 py-2 transition-colors",
                      isHome
                        ? isActive
                          ? "bg-white text-slate-900 shadow"
                          : "text-white/70 hover:bg-white/10 hover:text-white"
                        : isActive
                        ? "bg-[#7551ff] text-white shadow"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </Link>
                )
              })}
            </nav>

            <div className="flex items-center justify-between gap-4 md:justify-end">
              <nav
                className={clsx(
                  "flex flex-1 items-center gap-2 overflow-x-auto text-sm font-medium md:hidden",
                  isHome ? "text-white/70" : "text-slate-600"
                )}
              >
                {navigationItems.map((item) => {
                  const isActive = currentPageName === item.title
                  return (
                    <Link
                      key={item.title}
                      to={item.url}
                      aria-current={isActive ? "page" : undefined}
                      className={clsx(
                        "flex items-center gap-2 rounded-full px-4 py-2 transition",
                        isHome
                          ? isActive
                            ? "bg-white text-slate-900"
                            : "bg-white/10 text-white/80"
                          : isActive
                          ? "bg-[#7551ff] text-white"
                          : "bg-slate-100 text-slate-600"
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.title}
                    </Link>
                  )
                })}
              </nav>

              {user ? (
                <div
                  className={clsx(
                    "flex items-center gap-3 rounded-full px-3 py-2 text-sm font-medium shadow-sm ring-1",
                    isHome
                      ? "bg-white/10 text-white/80 ring-white/15"
                      : "bg-white text-slate-700 ring-slate-200"
                  )}
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#7551ff] to-[#3311db] text-white">
                    {user.full_name?.slice(0, 1).toUpperCase() || "U"}
                  </div>
                  <div className="hidden text-left leading-tight sm:block">
                    <p
                      className={clsx(
                        "text-xs font-semibold",
                        isHome ? "text-white" : "text-slate-900"
                      )}
                    >
                      {user.full_name}
                    </p>
                    <p
                      className={clsx(
                        "text-[11px]",
                        isHome ? "text-white/60" : "text-slate-500"
                      )}
                    >
                      Signed in
                    </p>
                  </div>
                </div>
              ) : (
                <div
                  className={clsx(
                    "hidden items-center gap-2 text-sm font-medium md:flex",
                    isHome ? "text-white/70" : "text-slate-500"
                  )}
                >
                  <span>Welcome</span>
                </div>
              )}
            </div>
          </div>
        </header>

        <main
          className={clsx(
            "flex-1 px-4 py-6 md:px-8 lg:px-10 lg:py-10",
            isHome ? "text-white" : undefined
          )}
        >
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  )
}
