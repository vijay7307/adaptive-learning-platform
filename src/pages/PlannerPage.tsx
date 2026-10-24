import { Brain } from 'lucide-react'
import { PlaceholderPage } from '../components/ui/PlaceholderPage'

export function PlannerPage() {
  return (
    <PlaceholderPage
      icon={Brain}
      title="AI Learning Planner"
      description="Set your goal and timeline. The AI will generate a detailed week-by-week curriculum, allocate topics intelligently, and adapt the plan as you progress."
      features={[
        'Enter your exam goal and target date to generate a personalized curriculum',
        'Week-by-week breakdown with daily time allocation',
        'Smart topic sequencing based on difficulty and dependencies',
        'Automatic plan adjustment based on your test scores and weak areas',
        'Export curriculum as PDF or sync to calendar',
      ]}
    />
  )
}
