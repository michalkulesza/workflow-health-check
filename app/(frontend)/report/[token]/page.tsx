import Link from 'next/link'
import { ResultsView } from '@/components/ResultsView'
import { reportFixtures } from '@/lib/fixtures'
export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  if (token === 'expired') {
    return (
      <main className="narrow center">
        <p className="eyebrow">Report link</p>
        <h1>This link has expired</h1>
        <p className="lede">
          For privacy, report links only work for a limited time. Return to the
          assessment in the browser where you completed it, or start again.
        </p>
        <Link className="button" href="/">
          Return home
        </Link>
      </main>
    )
  }

  return <ResultsView result={reportFixtures.two} reportLink />
}
