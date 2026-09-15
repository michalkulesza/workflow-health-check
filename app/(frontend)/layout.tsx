import type { Metadata } from 'next'
import Link from 'next/link'

import '../globals.css'

export const metadata: Metadata = {
  title: { default: 'Workflow Check', template: '%s · Workflow Check' },
  description: 'A short assessment for spotting friction in creative work.',
}

const RootLayout = ({ children }: Readonly<{ children: React.ReactNode }>) => (
  <html lang="en" data-scroll-behavior="smooth">
    <body>
      <header className="site-header">
        <Link href="/" className="brand" aria-label="Workflow Check home">
          WORKFLOW CHECK
        </Link>
        <nav className="site-nav" aria-label="Main navigation">
          <Link href="/#about">About</Link>
          <Link href="/#how-it-works">How it works</Link>
          <Link href="/#faq">FAQ</Link>
        </nav>
        <Link
          className="marketing-button marketing-button--compact"
          href="/#assessment"
        >
          Start the assessment <span aria-hidden="true">→</span>
        </Link>
      </header>
      {children}
      <footer className="site-footer">
        <div className="site-footer__inner">
          <Link href="/" className="brand">
            WORKFLOW CHECK
          </Link>
          <p>A practical assessment for creative professionals.</p>
          <nav aria-label="Footer navigation">
            <Link href="/#about">About</Link>
            <Link href="/#how-it-works">How it works</Link>
            <Link href="/#faq">FAQ</Link>
          </nav>
        </div>
      </footer>
    </body>
  </html>
)

export default RootLayout
