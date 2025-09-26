import { resultsApi } from './api'

export type WellPrediction = { id: string; confidence: number; label: 'positive' | 'negative' }
export type LastRun = {
  statistics: {
    totalDetections: number
    positiveCount: number
    negativeCount: number
    averageConfidence: number
  }
  wellPredictions: WellPrediction[]
  status: string
  predictAt: string
}

export type SampleResult = {
  sampleNo: string
  lastRun?: LastRun
}

export const resultsService = {
  getSample(sampleNo: string) {
    return resultsApi.get<SampleResult>(`/api/v1/results/samples/${encodeURIComponent(sampleNo)}`)
  },
}


