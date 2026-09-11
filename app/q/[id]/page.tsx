import { Assessment } from '@/components/Assessment'
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ scenario?: string }>
}) {
  const { id } = await params
  const { scenario } = await searchParams

  return <Assessment questionnaireId={id} initialScenario={scenario} />
}
