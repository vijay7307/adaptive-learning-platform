import { NavLink, useLocation } from 'react-router-dom'
import { X, GraduationCap, LogOut } from 'lucide-react'
import { navItems } from '../../config/navigation'
import { mockUser } from '../../data/mockData'
import { useAuth } from '../../context/AuthContext'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return (name.slice(0, 2) || 'U').toUpperCase()
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation()
  const { user, logout } = useAuth()

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={[
          'fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-slate-900 text-white transition-transform duration-300 ease-in-out',
          'lg:relative lg:translate-x-0 lg:flex',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
        aria-label="Sidebar navigation"
      >
        {/* Logo / brand */}
        <div className="flex h-16 items-center justify-between border-b border-slate-700/60 px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500">
              <GraduationCap size={18} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold leading-tight tracking-wide text-white">Adaptive</p>
              <p className="text-xs font-medium leading-tight text-indigo-300">Learning Platform</p>
            </div>
          </div>
          {/* Close button – mobile only */}
          <button
            className="rounded-md p-1 text-slate-400 hover:bg-slate-700 hover:text-white lg:hidden"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1" role="list">
            {navItems.map((item) => {
              const isActive = item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path)
              const Icon = item.icon
              return (
                <li key={item.id}>
                  <NavLink
                    to={item.path}
                    onClick={onClose}
                    title={item.description}
                    className={[
                      'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-300 hover:bg-slate-700/70 hover:text-white',
                    ].join(' ')}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon
                      size={18}
                      className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}
                    />
                    {item.label}
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* User footer */}
        <div className="border-t border-slate-700/60 px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-xs font-bold text-white">
                {user ? getInitials(user.name) : mockUser.avatar}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-semibold text-white">
                  {user ? user.name : mockUser.name}
                </p>
                <p className="truncate text-xs text-slate-400">
                  {user ? user.email : mockUser.goal}
                </p>
              </div>
            </div>
            <button
              onClick={logout}
              title="Sign out"
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-700/70 hover:text-white transition-colors"
              aria-label="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
