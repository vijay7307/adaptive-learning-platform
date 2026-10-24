import { BarChart3 } from 'lucide-react'
import { PlaceholderPage } from '../components/ui/PlaceholderPage'

export function AnalyticsPage() {
  return (
    <PlaceholderPage
      icon={BarChart3}
      title="Progress Analytics"
      description="Deep-dive charts and insights into your study habits, subject mastery trends, accuracy rates, and time-management patterns."
      features={[
        'Mastery heatmap across all subjects over time',
        'Daily/weekly/monthly study hours trend charts',
        'Accuracy curves by topic and difficulty level',
        'Strengths vs weaknesses radar chart',
        'Predicted exam readiness score based on your performance data',
      ]}
    />
  )
}
