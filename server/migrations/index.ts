import * as migration_20260911_215910_initial_assessment_foundation from './20260911_215910_initial_assessment_foundation'

export const migrations = [
  {
    up: migration_20260911_215910_initial_assessment_foundation.up,
    down: migration_20260911_215910_initial_assessment_foundation.down,
    name: '20260911_215910_initial_assessment_foundation',
  },
]
