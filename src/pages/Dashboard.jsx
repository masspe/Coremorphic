import React from "react"
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronDown,
  Clock,
  Layers,
  MonitorSmartphone,
  Search,
  Settings,
  ShoppingBag,
} from "lucide-react"

const statCards = [
  {
    title: "Venus DB",
    value: "$7,580",
    change: "+20%",
    subtitle: "than last week",
    accent: "from-[#7551ff] to-[#3311db]",
    trend: "up",
    icon: MonitorSmartphone,
  },
  {
    title: "Venus DS",
    value: "$3,230",
    change: "+12%",
    subtitle: "since last month",
    accent: "from-[#ff72a1] to-[#ff4d8d]",
    trend: "up",
    icon: Layers,
  },
  {
    title: "Venus DR",
    value: "$1,580",
    change: "-3%",
    subtitle: "than yesterday",
    accent: "from-[#21d4fd] to-[#2152ff]",
    trend: "down",
    icon: Activity,
  },
  {
    title: "Marketplace",
    value: "$28,640",
    change: "+6%",
    subtitle: "total earnings",
    accent: "from-[#f7b733] to-[#fc4a1a]",
    trend: "up",
    icon: ShoppingBag,
  },
]

const tableRows = [
  { name: "Marketplace", status: "Approved", date: "24 Jan 2022", amount: "$2,400" },
  { name: "Venus DB PRO", status: "Pending", date: "12 Feb 2022", amount: "$4,200" },
  { name: "Venus DS", status: "Approved", date: "30 Dec 2021", amount: "$1,180" },
  { name: "Venus 3D", status: "Cancelled", date: "04 Jan 2022", amount: "$980" },
]

const tasks = [
  { title: "Landing Page Design", time: "Due in 2 days", done: true },
  { title: "Mobile App Design", time: "Due tomorrow", done: false },
  { title: "Dashboard Redesign", time: "Due in 5 days", done: false },
  { title: "Data Review", time: "Due next week", done: true },
]

const calendarDays = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]
const calendarWeeks = [
  ["", "", "1", "2", "3", "4", "5"],
  ["6", "7", "8", "9", "10", "11", "12"],
  ["13", "14", "15", "16", "17", "18", "19"],
  ["20", "21", "22", "23", "24", "25", "26"],
  ["27", "28", "29", "30", "31", "", ""],
]

export default function Dashboard() {
  return (
    <div className="space-y-6 lg:space-y-8">
      <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">Pages / Main Dashboard</p>
          <h1 className="text-3xl font-semibold text-slate-900">Main Dashboard</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search"
              className="ml-2 w-32 bg-transparent text-sm text-slate-600 outline-none placeholder:text-slate-400 md:w-48"
            />
          </div>
          <button className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:text-[#7551ff]">
            <Bell className="h-4 w-4" />
          </button>
          <button className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:text-[#7551ff]">
            <Settings className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#7551ff] to-[#3311db] text-white text-sm font-semibold">
              JD
            </div>
            <div className="hidden text-left text-sm md:block">
              <p className="font-semibold text-slate-700">Jade Doe</p>
              <p className="text-xs text-slate-400">Product Designer</p>
            </div>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <div key={card.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${card.accent} text-white shadow-lg`}> 
              <card.icon className="h-5 w-5" />
            </div>
            <div className="mt-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{card.title}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{card.value}</p>
              </div>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                  card.trend === "up"
                    ? "bg-emerald-50 text-emerald-500"
                    : "bg-rose-50 text-rose-500"
                }`}
              >
                {card.trend === "up" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {card.change}
              </span>
            </div>
            <p className="mt-3 text-xs font-medium text-slate-400">{card.subtitle}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-6 lg:col-span-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Complex Table</h2>
                <p className="text-sm text-slate-400">Project statistics overview</p>
              </div>
              <button className="text-sm font-semibold text-[#7551ff]">View all</button>
            </div>
            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="text-slate-400">
                  <tr>
                    <th className="pb-3 font-medium">Name</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {tableRows.map((row) => (
                    <tr key={`${row.name}-${row.date}`} className="transition hover:bg-slate-50">
                      <td className="py-4 font-medium text-slate-700">{row.name}</td>
                      <td className="py-4">
                        <span
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                            row.status === "Approved"
                              ? "bg-emerald-50 text-emerald-500"
                              : row.status === "Pending"
                                ? "bg-amber-50 text-amber-500"
                                : "bg-rose-50 text-rose-500"
                          }`}
                        >
                          <span className="h-2 w-2 rounded-full bg-current" />
                          {row.status}
                        </span>
                      </td>
                      <td className="py-4 text-sm">{row.date}</td>
                      <td className="py-4 text-right font-semibold text-slate-900">{row.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Tasks</h2>
              <button className="text-sm font-semibold text-[#7551ff]">See all</button>
            </div>
            <div className="mt-4 space-y-4">
              {tasks.map((task) => (
                <div key={task.title} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-xl text-white shadow ${
                        task.done ? "bg-emerald-500" : "bg-[#7551ff]"
                      }`}
                    >
                      {task.done ? <CheckCircle2 className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">{task.title}</p>
                      <p className="text-xs text-slate-400">{task.time}</p>
                    </div>
                  </div>
                  <button className="text-xs font-semibold text-[#7551ff]">Details</button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Overall</h2>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">63%</p>
            </div>
            <div className="mt-6 flex flex-col items-center justify-center">
              <div className="relative flex h-40 w-40 items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#7551ff] to-[#3311db] opacity-20" />
                <div
                  className="relative flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-[#7551ff] to-[#3311db] text-white shadow-inner"
                  style={{ backgroundImage: "conic-gradient(#7551ff 0deg, #7551ff 226deg, #e2e8f0 226deg, #e2e8f0 360deg)" }}
                >
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white text-3xl font-semibold text-slate-900">
                    63%
                  </div>
                </div>
              </div>
              <p className="mt-4 text-center text-sm text-slate-500">
                Your team performed better this week compared to the last one.
              </p>
              <div className="mt-6 w-full space-y-4">
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                    <span>Projects</span>
                    <span>25%</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-100">
                    <div className="h-2 w-1/4 rounded-full bg-[#7551ff]" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                    <span>Success Rate</span>
                    <span>83%</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-100">
                    <div className="h-2 w-[83%] rounded-full bg-emerald-500" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                    <span>New Clients</span>
                    <span>41%</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-100">
                    <div className="h-2 w-[41%] rounded-full bg-[#21d4fd]" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">October 2025</p>
                <h2 className="text-lg font-semibold text-slate-900">Calendar</h2>
              </div>
              <CalendarIcon className="h-5 w-5 text-[#7551ff]" />
            </div>
            <div className="mt-6 grid grid-cols-7 gap-2 text-center text-xs font-semibold text-slate-400">
              {calendarDays.map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>
            <div className="mt-3 space-y-2 text-center text-sm">
              {calendarWeeks.map((week, weekIndex) => (
                <div key={weekIndex} className="grid grid-cols-7 gap-2">
                  {week.map((day, dayIndex) => {
                    const isActive = day === "23"
                    const isMuted = day === ""
                    return (
                      <div
                        key={`${weekIndex}-${dayIndex}`}
                        className={`flex h-10 items-center justify-center rounded-full ${
                          isMuted
                            ? "text-transparent"
                            : isActive
                              ? "bg-[#7551ff] text-white shadow"
                              : "bg-slate-50 text-slate-500"
                        }`}
                      >
                        {day}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
