import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import config from '@/payload.config'
import { hasRecentWorkerHeartbeat } from '@/server/operations/heartbeat'

export const dynamic = 'force-dynamic'

export const GET = async () => {
  try {
    const payload = await getPayload({ config })
    await payload.db.pool.query('SELECT 1')
    const workerHealthy = await hasRecentWorkerHeartbeat(payload)

    return NextResponse.json(
      {
        database: 'ok',
        status: workerHealthy ? 'ok' : 'degraded',
        workerHealthy,
      },
      {
        headers: { 'Cache-Control': 'no-store' },
        status: workerHealthy ? 200 : 503,
      }
    )
  } catch {
    return NextResponse.json(
      { status: 'unavailable' },
      { headers: { 'Cache-Control': 'no-store' }, status: 503 }
    )
  }
}
