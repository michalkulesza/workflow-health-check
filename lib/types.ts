export type Scenario =
  | 'happy'
  | 'one'
  | 'healthy'
  | 'clarification'
  | 'insufficient'
  | 'save-failure'
  | 'resume'
  | 'ai-failure'
  | 'notification-error'
  | 'contact-error'
export type InputType = 'single' | 'multi' | 'text'
export type Strategy =
  | 'none'
  | 'single_choice_value'
  | 'multi_select_count'
  | 'multi_select_weighted'
  | 'multi_select_quality_quantity'
  | 'ai_rubric'
export interface Option {
  id: string
  label: string
  value?: number
  exclusive?: boolean
  requiresText?: boolean
  notApplicable?: boolean
}
export interface Question {
  id: string
  number: number
  categoryId: string
  prompt: string
  type: InputType
  required: boolean
  instructions?: string
  maxSelections?: number
  options?: Option[]
  strategy: Strategy
}
export interface Category {
  id: string
  name: string
  scored: boolean
  maxPoints: number
  attentionThreshold: number
}
export type Answer = {
  selected?: string[]
  text?: string
  otherText?: Record<string, string>
}
export type Answers = Record<string, Answer>
export interface Priority {
  categoryId: string
  categoryName: string
  score: number
  maxPoints: number
  explanation: string
  firstStep: string
}
export interface ReportResult {
  kind: 'complete' | 'insufficient' | 'pending'
  priorities: Priority[]
  summary: string
  pendingCategories?: string[]
}
export interface Progress {
  version: string
  answers: Answers
  step: number
  status: 'in-progress' | 'review' | 'complete'
  updatedAt: string
}
