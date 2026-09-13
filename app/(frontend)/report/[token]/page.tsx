import { PrivateReport } from '@/components/PrivateReport'
export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  return <PrivateReport token={token} />
}
