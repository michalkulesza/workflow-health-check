import { loadPayload } from './payloadRuntime'

const main = async () => {
  const payload = await loadPayload()

  try {
    const email = process.env.BOOTSTRAP_ADMIN_EMAIL
    const password = process.env.BOOTSTRAP_ADMIN_PASSWORD

    if (!email || !password || password.length < 16) {
      throw new Error(
        'Set bootstrap email and a password of at least 16 characters'
      )
    }

    const existing = await payload.count({
      collection: 'admins',
      overrideAccess: true,
    })

    if (existing.totalDocs !== 0) {
      throw new Error(
        'An admin already exists; bootstrap will not overwrite it'
      )
    }

    await payload.create({
      collection: 'admins',
      data: { email, password },
      overrideAccess: true,
      context: { bootstrapAdmin: true },
    })

    console.log(
      'Initial admin created. Remove bootstrap credentials from the environment.'
    )
  } finally {
    await payload.destroy()
  }
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(
      'Admin bootstrap failed. Check credentials, existing admin, and database configuration.'
    )

    if (error instanceof Error) {
      console.error(error.message)
    }

    process.exit(1)
  })
