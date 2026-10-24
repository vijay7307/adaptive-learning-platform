import { Settings } from 'lucide-react'
import { PlaceholderPage } from '../components/ui/PlaceholderPage'

export function SettingsPage() {
  return (
    <PlaceholderPage
      icon={Settings}
      title="Settings"
      description="Customize your learning experience: update your profile, set daily study hour goals, notification preferences, and manage your AI configuration."
      features={[
        'Update your profile: name, exam goal, and target date',
        'Set daily study hour targets and reminder notifications',
        'Choose preferred subjects and difficulty levels',
        'Theme selection: light, dark, and system default',
        'Manage data export and account preferences',
      ]}
    />
  )
}
