import * as migration_20260911_215910_initial_assessment_foundation from './20260911_215910_initial_assessment_foundation'
import * as migration_20260913_110626_cms_publication_service from './20260913_110626_cms_publication_service'

export const migrations = [
  {
    up: migration_20260911_215910_initial_assessment_foundation.up,
    down: migration_20260911_215910_initial_assessment_foundation.down,
    name: '20260911_215910_initial_assessment_foundation',
  },
  {
    up: migration_20260913_110626_cms_publication_service.up,
    down: migration_20260913_110626_cms_publication_service.down,
    name: '20260913_110626_cms_publication_service',
  },
]
