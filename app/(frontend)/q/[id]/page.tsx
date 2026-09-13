import { Assessment } from '@/components/Assessment'
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return <Assessment questionnaireId={id} />
}
