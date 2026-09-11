import type { Metadata } from 'next'
import Link from 'next/link'

import '../globals.css'

export const metadata: Metadata = {
  title: { default: 'Workflow Check', template: '%s · Workflow Check' },
  description: 'A short assessment for spotting friction in creative work.',
}

const RootLayout = ({ children }: Readonly<{ children: React.ReactNode }>) => {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <header className="site-header">
          <Link href="/" className="brand">
            Workflow Check<span>.</span>
          </Link>
          <span className="quiet">A practical workflow assessment</span>
        </header>
        {children}
        <footer>Workflow Check · Prototype for creative professionals</footer>
      </body>
    </html>
  )
}

export default RootLayout
