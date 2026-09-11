import { generatePageMetadata, RootPage } from '@payloadcms/next/views'

import config from '@/payload.config'

import { importMap } from '../importMap.js'

type Props = {
  params: Promise<{ segments: string[] }>
  searchParams: Promise<Record<string, string | string[]>>
}

export const generateMetadata = (props: Props) =>
  generatePageMetadata({ ...props, config })

const AdminPage = (props: Props) => RootPage({ ...props, config, importMap })

export default AdminPage
