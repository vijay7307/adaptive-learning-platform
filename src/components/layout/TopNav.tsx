import { Menu, Bell, Search, LogOut } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { navItems } from '../../config/navigation'
import { useAuth } from '../../context/AuthContext'

interface TopNavProps {
  onMenuClick: () => void
}

export function TopNav({ onMenuClick }: TopNavProps) {
  const location = useLocation()
  const { user, logout } = useAuth()
  const currentPage = navItems.find((item) =>
    item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path),
  )

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-slate-200 bg-white px-4 sm:px-6">
      {/* Mobile menu toggle */}
      <button
        className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 lg:hidden"
        onClick={onMenuClick}
        aria-label="Open sidebar"
      >
        <Menu size={22} />
      </button>

      {/* Page title */}
      <div className="flex-1">
        <h1 className="text-base font-semibold text-slate-800 sm:text-lg">
          {currentPage?.label ?? 'Adaptive Learning'}
        </h1>
        {currentPage?.description && (
          <p className="hidden text-xs text-slate-500 sm:block">{currentPage.description}</p>
        )}
      </div>

      {/* Search */}
      <div className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 sm:flex">
        <Search size={16} className="text-slate-400" />
        <input
          type="search"
          placeholder="Search topics, notes…"
          className="w-48 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
          aria-label="Search"
        />
      </div>

      {/* Notification bell */}
      <button
        className="relative rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        aria-label="Notifications"
      >
        <Bell size={20} />
        <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-indigo-500" aria-hidden="true" />
      </button>

      {/* User profile / Logout */}
      {user && (
        <button
          onClick={logout}
          title="Sign out"
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
          aria-label="Sign out"
        >
          <LogOut size={14} className="text-slate-400" />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      )}
    </header>
  )
}
