'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export const QuestionnaireCta = () => {
  const pathname = usePathname()

  if (pathname.startsWith('/q/')) return null

  return (
    <Link
      className="marketing-button marketing-button--compact"
      href="/#assessment"
    >
      Start the assessment <span aria-hidden="true">&rarr;</span>
    </Link>
  )
}
