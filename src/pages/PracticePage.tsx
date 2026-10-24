import { PenLine } from 'lucide-react'
import { PlaceholderPage } from '../components/ui/PlaceholderPage'

export function PracticePage() {
  return (
    <PlaceholderPage
      icon={PenLine}
      title="Practice & Solutions"
      description="Submit your answers to MCQs and descriptive questions. The AI evaluates your responses, highlights gaps, and provides model answers with explanations."
      features={[
        'Attempt topic-wise MCQ banks with instant scoring',
        'Submit descriptive answers in text or upload images',
        'AI evaluation with detailed feedback and marks breakdown',
        'Step-by-step model solutions for every question',
        'Previous Year Questions (PYQ) archive for all major exams',
      ]}
    />
  )
}
