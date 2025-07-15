import { redirect } from 'next/navigation'

export default function HomePage() {
  // Redirect directly to timesheets instead of dashboard
  redirect('/timesheets')
}