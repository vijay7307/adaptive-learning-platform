import { Target } from 'lucide-react'
import { PlaceholderPage } from '../components/ui/PlaceholderPage'

export function TargetsPage() {
  return (
    <PlaceholderPage
      icon={Target}
      title="Daily Targets"
      description="Your AI-curated daily study checklist. Track reading tasks, practice sets, and revision sessions. Mark items complete as you go."
      features={[
        'AI-generated daily task list based on your curriculum and weak areas',
        'One-click task completion with time tracking',
        'Prioritized tasks: urgent topics highlighted automatically',
        'Estimated time per task so you can plan your day',
        'Daily completion streak and XP rewards system',
      ]}
    />
  )
}
