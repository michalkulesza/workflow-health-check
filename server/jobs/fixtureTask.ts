import type { TaskConfig } from 'payload'

export const fixtureTask: TaskConfig<{
  input: { marker: string }
  output: { marker: string; workerPid: number }
}> = {
  slug: 'fixture',
  inputSchema: [{ name: 'marker', type: 'text', required: true }],
  outputSchema: [
    { name: 'marker', type: 'text', required: true },
    { name: 'workerPid', type: 'number', required: true },
  ],
  retries: 0,
  handler: ({ input }) => ({
    output: { marker: input.marker, workerPid: process.pid },
  }),
}
