export interface MissionRuntimeContext {
  plan: any
  intent: any
  merchant: any
  steps: string[]
  currentStepIdx: number
  currentStepText: string
}

export interface MissionStepResult {
  actionTaken: boolean
  logMessage: string
  terminalStatus?: string
  intentStatus?: string
}

export interface MissionProcessorResult {
  planId: string
  status: string
  log: string
}
