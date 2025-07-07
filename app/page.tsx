import { redirect } from 'next/navigation'

export default function HomePage() {
  // For now, just redirect to login
  // We'll add proper server-side auth check later
  redirect('/login')
}
