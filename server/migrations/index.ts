import * as migration_20260911_215910_initial_assessment_foundation from './20260911_215910_initial_assessment_foundation'
import * as migration_20260913_110626_cms_publication_service from './20260913_110626_cms_publication_service'
import * as migration_20260913_123420_anonymous_sessions_save_resume from './20260913_123420_anonymous_sessions_save_resume'
import * as migration_20260913_132151_add_scoring_configuration from './20260913_132151_add_scoring_configuration'
import * as migration_20260913_150000_submit_outbox_worker from './20260913_150000_submit_outbox_worker'
import * as migration_20260913_150100_payload_lock_relations from './20260913_150100_payload_lock_relations'
import * as migration_20260913_160000_ai_evaluations from './20260913_160000_ai_evaluations'
import * as migration_20260913_170000_reports from './20260913_170000_reports'
import * as migration_20260913_180000_report_notifications from './20260913_180000_report_notifications'

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
  {
    up: migration_20260913_123420_anonymous_sessions_save_resume.up,
    down: migration_20260913_123420_anonymous_sessions_save_resume.down,
    name: '20260913_123420_anonymous_sessions_save_resume',
  },
  {
    up: migration_20260913_132151_add_scoring_configuration.up,
    down: migration_20260913_132151_add_scoring_configuration.down,
    name: '20260913_132151_add_scoring_configuration',
  },
  {
    up: migration_20260913_150000_submit_outbox_worker.up,
    down: migration_20260913_150000_submit_outbox_worker.down,
    name: '20260913_150000_submit_outbox_worker',
  },
  {
    up: migration_20260913_150100_payload_lock_relations.up,
    down: migration_20260913_150100_payload_lock_relations.down,
    name: '20260913_150100_payload_lock_relations',
  },
  {
    up: migration_20260913_160000_ai_evaluations.up,
    down: migration_20260913_160000_ai_evaluations.down,
    name: '20260913_160000_ai_evaluations',
  },
  {
    up: migration_20260913_170000_reports.up,
    down: migration_20260913_170000_reports.down,
    name: '20260913_170000_reports',
  },
  {
    up: migration_20260913_180000_report_notifications.up,
    down: migration_20260913_180000_report_notifications.down,
    name: '20260913_180000_report_notifications',
  },
]
