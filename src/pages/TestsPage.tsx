import { GraduationCap } from 'lucide-react'
import { PlaceholderPage } from '../components/ui/PlaceholderPage'

export function TestsPage() {
  return (
    <PlaceholderPage
      icon={GraduationCap}
      title="Test Center"
      description="Take full-length mock tests and topic-specific mini-tests crafted by AI to simulate your real exam. Get instant results with detailed analysis."
      features={[
        'Full-length mock tests matching your exam pattern',
        'Topic-wise quick tests (15–30 questions) for focused practice',
        'Timed test environment with countdown and auto-submission',
        'Post-test analytics: time per question, accuracy by topic',
        'Comparison with top-performing peers on the leaderboard',
      ]}
    />
  )
}
