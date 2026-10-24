import { MessageSquare } from 'lucide-react'
import { PlaceholderPage } from '../components/ui/PlaceholderPage'

export function FeedbackPage() {
  return (
    <PlaceholderPage
      icon={MessageSquare}
      title="Daily Feedback"
      description="At the end of each day, the AI reviews your study session — what went well, what to improve, and what to prioritize tomorrow."
      features={[
        'End-of-day AI report: strengths, weaknesses, and improvement areas',
        'Compare today vs yesterday to track momentum',
        "Actionable suggestions for tomorrow's study plan",
        'Motivational nudges and consistency analysis',
        'Weekly digest email with key performance highlights',
      ]}
    />
  )
}
