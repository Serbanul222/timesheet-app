import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers/Providers'
import { SessionWarning } from '@/components/auth/SessionWarning'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Timesheet Manager',
  description: 'Employee timesheet management application',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {children}
          <SessionWarning />
        </Providers>
      </body>
    </html>
  )
}