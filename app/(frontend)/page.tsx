import { connection } from 'next/server'

import { Landing } from '@/components/Landing'
import { getPublicLanding } from '@/server/content/publicLanding'

export default async function Page() {
  await connection()

  const landing = await getPublicLanding().catch(() => null)

  if (landing) {
    return <Landing initialLanding={landing} />
  }

  return (
    <Landing initialError="This assessment is temporarily unavailable. Please try again shortly." />
  )
}
