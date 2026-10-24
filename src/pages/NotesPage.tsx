import { BookOpen } from 'lucide-react'
import { PlaceholderPage } from '../components/ui/PlaceholderPage'

export function NotesPage() {
  return (
    <PlaceholderPage
      icon={BookOpen}
      title="Learning Notes"
      description="Comprehensive, AI-generated study notes organized by subject and topic. Read, highlight, and annotate to build your personal knowledge base."
      features={[
        'AI-written detailed notes for every topic in your curriculum',
        'Organized by subject → chapter → sub-topic hierarchy',
        'Highlight important lines and add personal annotations',
        'Smart summaries and key-point extracts at the end of each chapter',
        'Search across all notes with keyword highlighting',
      ]}
    />
  )
}
