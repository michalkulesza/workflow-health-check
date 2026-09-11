import type {
  Category,
  Option,
  Question,
  ReportResult,
  Scenario,
} from './types'
export const QUESTIONNAIRE_ID = '5dc13945-9cb8-4e6b-b504-187c885e0e34'
export const VERSION = 'creative-workflow-v1'
export const landingContent = {
  pageTitle: 'Workflow Check',
  metaDescription: 'Find the friction in your creative workflow.',
  headline: 'Find the friction slowing your work down.',
  supporting:
    'Answer a short set of questions and get a focused view of where avoidable admin, chasing, and scattered information may be costing you energy.',
  audienceTitle: 'Built for creative work',
  audience:
    'For producers, artists, musicians, DJs, songwriters, managers, and other creative professionals juggling projects and people.',
  steps: [
    { title: 'Answer', text: 'Work through 16 practical questions.' },
    { title: 'See priorities', text: 'Get up to two areas worth attention.' },
    {
      title: 'Get help',
      text: 'Choose whether you want support taking action.',
    },
  ],
  buttonLabel: 'Check your workflow',
  questionnaireId: QUESTIONNAIRE_ID,
}
export const categories: Category[] = [
  {
    id: 'work',
    name: 'Your work',
    scored: false,
    maxPoints: 20,
    attentionThreshold: 0.6,
  },
  {
    id: 'project',
    name: 'Following a project',
    scored: true,
    maxPoints: 20,
    attentionThreshold: 0.6,
  },
  {
    id: 'people',
    name: 'Other people',
    scored: true,
    maxPoints: 20,
    attentionThreshold: 0.6,
  },
  {
    id: 'admin',
    name: 'The admin layer',
    scored: true,
    maxPoints: 20,
    attentionThreshold: 0.6,
  },
  {
    id: 'friction',
    name: 'Your own friction',
    scored: true,
    maxPoints: 20,
    attentionThreshold: 0.6,
  },
  {
    id: 'magic',
    name: 'The magic question',
    scored: false,
    maxPoints: 20,
    attentionThreshold: 0.6,
  },
]

const o = (
  id: string,
  label: string,
  value?: number,
  extra: Partial<{
    exclusive: boolean
    requiresText: boolean
    notApplicable: boolean
  }> = {}
): Option => ({ id, label, value, ...extra })
export const questions: Question[] = [
  {
    id: 'q1',
    number: 1,
    categoryId: 'work',
    prompt: 'What best describes your work?',
    type: 'single',
    required: true,
    strategy: 'none',
    options: [
      o('producer', 'Producer'),
      o('artist', 'Artist / musician'),
      o('dj', 'DJ'),
      o('songwriter', 'Songwriter'),
      o('manager', 'Manager'),
      o('other-creative', 'Other creative professional'),
      o('something-else', 'Something else'),
    ],
  },
  {
    id: 'q2',
    number: 2,
    categoryId: 'work',
    prompt: 'How many projects are usually active at the same time?',
    type: 'single',
    required: true,
    strategy: 'none',
    options: [
      o('1-2', '1–2'),
      o('3-5', '3–5'),
      o('6-10', '6–10'),
      o('10-plus', '10+'),
      o('varies', 'It varies a lot'),
    ],
  },
  {
    id: 'q3',
    number: 3,
    categoryId: 'work',
    prompt:
      'Which parts of your work take up the most time outside the actual creative work?',
    type: 'multi',
    required: true,
    maxSelections: 4,
    instructions: 'Choose up to four.',
    strategy: 'none',
    options: [
      'Finding information/files',
      'Email/messages',
      'Following up with people',
      'Scheduling',
      'Contracts/agreements',
      'Invoicing/payments',
      'Project planning',
      'Repeating admin tasks',
      'Keeping track of deadlines',
      'Other',
    ].map((x, i) => o(`time-${i}`, x)),
  },
  {
    id: 'q4',
    number: 4,
    categoryId: 'project',
    prompt:
      "Imagine someone asks you: “What's happening with Project X?” What would you normally do?",
    type: 'single',
    required: true,
    strategy: 'single_choice_value',
    options: [
      o('immediate', 'I can see it immediately', 1),
      o('one-place', 'I check one place', 0.75),
      o('couple', 'I check a couple of places', 0.5),
      o('search', 'I search through messages/emails/files', 0.25),
      o('reconstruct', "I usually need to reconstruct what's happening", 0),
    ],
  },
  {
    id: 'q5',
    number: 5,
    categoryId: 'project',
    prompt: 'Where does the information for a typical project live?',
    type: 'multi',
    required: true,
    instructions: 'Select every place you regularly use.',
    strategy: 'multi_select_quality_quantity',
    options: [
      o('notion', 'Notion / Airtable', 1),
      o('pm', 'Project management software', 1),
      o('drive', 'Google Drive / Dropbox', 0.8),
      o('sheet', 'Spreadsheet / Google Docs', 0.65),
      o('calendar', 'Calendar', 0.65),
      o('notes', 'Notes', 0.5),
      o('email', 'Email', 0.3),
      o('dm', 'WhatsApp / DMs', 0.15),
      o('elsewhere', 'Somewhere else', 0.5, { requiresText: true }),
      o('head', 'Mostly in my head', 0),
    ],
  },
  {
    id: 'q6',
    number: 6,
    categoryId: 'project',
    prompt:
      'When a project moves forward, how do you usually know what needs to happen next?',
    type: 'single',
    required: true,
    strategy: 'single_choice_value',
    options: [
      o('recorded', 'The next step is clearly recorded', 1),
      o('task', 'I have a task/list/calendar', 0.75),
      o('messages', 'I check messages or emails', 0.5),
      o('remember', 'I usually just know/remember', 0.25),
      o('depends', 'It depends on the project', 0),
    ],
  },
  {
    id: 'q7',
    number: 7,
    categoryId: 'people',
    prompt:
      "When you're waiting for someone else, how do you keep track of it?",
    type: 'single',
    required: true,
    strategy: 'single_choice_value',
    options: [
      o('recorded', "It's recorded somewhere", 1),
      o('reminder', 'Calendar/reminder', 0.75),
      o('remember', 'I remember it', 0.5),
      o('search', 'I search the conversation when I need it', 0.25),
      o('forget', 'I often forget and realise later', 0),
    ],
  },
  {
    id: 'q8',
    number: 8,
    categoryId: 'people',
    prompt: 'Which of these collaboration problems happen to you?',
    type: 'multi',
    required: true,
    strategy: 'multi_select_weighted',
    options: [
      o('unclear', "People don't know what they are supposed to do", 3),
      o('follow-up', 'I forget to follow up', 2),
      o('forget', 'People forget things', 1.5),
      o('lost', 'Information gets lost in messages', 2),
      o('repeat', 'I have to repeat the same information', 1.5),
      o('version', 'Nobody is sure what the latest version is', 2.5),
      o('deadlines', 'Deadlines move without being updated', 2.5),
      o('smooth', 'Collaboration works pretty smoothly', 0, {
        exclusive: true,
      }),
      o('other', 'Something else', 1.5, { requiresText: true }),
    ],
  },
  {
    id: 'q9',
    number: 9,
    categoryId: 'admin',
    prompt: 'Which administrative tasks do you currently manage manually?',
    type: 'multi',
    required: true,
    strategy: 'multi_select_count',
    options: [
      'Contracts / agreements',
      'Invoices',
      'Payment tracking',
      'File organisation',
      'Scheduling',
      'Deliverables',
      'Client/collaborator information',
      'Rights / credits information',
      'Recurring tasks',
    ]
      .map((x, i) => o(`admin-${i}`, x))
      .concat([
        o('none', 'None of these', 1, { exclusive: true }),
        o('other', 'Other', 0, { requiresText: true }),
      ]),
  },
  {
    id: 'q10',
    number: 10,
    categoryId: 'admin',
    prompt: 'When something needs to happen regularly, what usually happens?',
    type: 'single',
    required: true,
    strategy: 'single_choice_value',
    options: [
      o('system', "It's built into a system/process", 1),
      o('reminder', 'I have a recurring reminder', 0.75),
      o('template', 'I use a checklist/template', 0.5),
      o('remember', 'I remember to do it', 0.25),
      o('react', 'I deal with it when it comes up', 0),
      o('na', "I don't really have recurring tasks", undefined, {
        notApplicable: true,
      }),
    ],
  },
  {
    id: 'q11',
    number: 11,
    categoryId: 'friction',
    prompt: 'What is the most frustrating part of running your creative work?',
    type: 'text',
    required: true,
    strategy: 'ai_rubric',
  },
  {
    id: 'q12',
    number: 12,
    categoryId: 'friction',
    prompt:
      'What do you find yourself repeatedly doing that feels unnecessarily manual?',
    type: 'text',
    required: true,
    strategy: 'ai_rubric',
  },
  {
    id: 'q13',
    number: 13,
    categoryId: 'friction',
    prompt:
      'Think about the last time you felt overwhelmed by your workload. What caused it, how did you handle it, and has anything changed since?',
    type: 'text',
    required: true,
    strategy: 'ai_rubric',
  },
  {
    id: 'q14',
    number: 14,
    categoryId: 'magic',
    prompt:
      'If someone could quietly take one annoying part of your work away forever, what would you give them?',
    type: 'text',
    required: false,
    strategy: 'none',
  },
  {
    id: 'q15',
    number: 15,
    categoryId: 'magic',
    prompt: 'Is there anything you currently wish you had a better system for?',
    type: 'text',
    required: false,
    strategy: 'none',
  },
  {
    id: 'q16',
    number: 16,
    categoryId: 'magic',
    prompt:
      'Roughly how much time do you think you lose each week to searching, chasing, repeating or admin?',
    type: 'single',
    required: true,
    strategy: 'none',
    options: [
      'Almost none',
      '<1 hour',
      '1–3 hours',
      '3–5 hours',
      '5+ hours',
      'I have no idea',
    ].map((x, i) => o(`time-${i}`, x)),
  },
]

const project: ReportResult['priorities'][number] = {
  categoryId: 'project',
  categoryName: 'Following a project',
  score: 8.4,
  maxPoints: 20,
  explanation:
    'You said project information lives across email, messages, and files, and that you often reconstruct the current picture. That makes each update take more effort than it should.',
  firstStep:
    'Choose one project and record its current status, next action, owner, and deadline in one place.',
}

const admin: ReportResult['priorities'][number] = {
  categoryId: 'admin',
  categoryName: 'The admin layer',
  score: 9,
  maxPoints: 20,
  explanation:
    'Several recurring admin tasks are handled manually, and your answers suggest they are dealt with as they come up. The repeated switching is a clear source of friction.',
  firstStep:
    'Pick the most frequent admin task and turn its steps into a reusable weekly checklist.',
}
export const reportFixtures: Record<string, ReportResult> = {
  two: {
    kind: 'complete',
    priorities: [project, admin],
    summary: 'Two parts of your workflow look most useful to improve first.',
  },
  one: {
    kind: 'complete',
    priorities: [admin],
    summary: 'One area stands out as the clearest place to reduce friction.',
  },
  healthy: {
    kind: 'complete',
    priorities: [],
    summary:
      'No major issues were identified from the answers in this assessment. Your current practices appear to give you a reliable view of work and commitments.',
  },
  insufficient: {
    kind: 'insufficient',
    priorities: [project],
    summary:
      'We could evaluate your project tracking, but there still wasn’t enough specific evidence to score how you manage your own friction. That unknown result is not a zero—or a clean bill of health.',
  },
  pending: {
    kind: 'pending',
    priorities: [project],
    pendingCategories: ['Your own friction'],
    summary:
      'The rule-based parts of your report are ready. The reflection-based analysis could not finish after several attempts and is still pending.',
  },
}
export const scenarioLabels: Record<Scenario, string> = {
  happy: 'Happy path · two priorities',
  one: 'One priority',
  healthy: 'No major issues',
  clarification: 'Clarification then report',
  insufficient: 'Clarification then limited result',
  'save-failure': 'Save failure and retry',
  resume: 'Resume sample',
  'ai-failure': 'AI fallback + notification',
  'notification-error': 'Notification error',
  'contact-error': 'Contact error',
}
