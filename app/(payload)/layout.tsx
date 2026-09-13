import { handleServerFunctions, RootLayout } from '@payloadcms/next/layouts'
import type { ServerFunctionClient } from 'payload'

import '@payloadcms/next/css'

import config from '@/payload.config'

import { importMap } from './admin/importMap.js'

const serverFunction: ServerFunctionClient = async (args) => {
  'use server'

  return handleServerFunctions({ ...args, config, importMap })
}

const PayloadLayout = ({ children }: { children: React.ReactNode }) => (
  <RootLayout
    config={config}
    importMap={importMap}
    serverFunction={serverFunction}
  >
    {children}
  </RootLayout>
)

export default PayloadLayout
