// Navigation item definitions shared across the app
import {
  LayoutDashboard,
  Brain,
  Target,
  BookOpen,
  PenLine,
  MessageSquare,
  GraduationCap,
  BarChart3,
  Settings,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  id: string
  label: string
  path: string
  icon: LucideIcon
  description: string
}

export const navItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/',
    icon: LayoutDashboard,
    description: 'Overview of your learning progress',
  },
  {
    id: 'planner',
    label: 'AI Learning Planner',
    path: '/planner',
    icon: Brain,
    description: 'AI-generated curriculum and schedule',
  },
  {
    id: 'targets',
    label: 'Daily Targets',
    path: '/targets',
    icon: Target,
    description: "Today's study tasks and goals",
  },
  {
    id: 'notes',
    label: 'Learning Notes',
    path: '/notes',
    icon: BookOpen,
    description: 'Detailed study notes by topic',
  },
  {
    id: 'practice',
    label: 'Practice & Solutions',
    path: '/practice',
    icon: PenLine,
    description: 'Submit answers and view solutions',
  },
  {
    id: 'feedback',
    label: 'Daily Feedback',
    path: '/feedback',
    icon: MessageSquare,
    description: 'AI feedback on your performance',
  },
  {
    id: 'tests',
    label: 'Test Center',
    path: '/tests',
    icon: GraduationCap,
    description: 'Personalized tests and mock exams',
  },
  {
    id: 'analytics',
    label: 'Progress Analytics',
    path: '/analytics',
    icon: BarChart3,
    description: 'Charts and insights on your progress',
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/settings',
    icon: Settings,
    description: 'Preferences and account settings',
  },
]
