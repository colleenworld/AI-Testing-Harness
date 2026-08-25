import { EvalTask } from '../types'

export class ModelOutput {
  model_name: string
  task_id: string
  category: string
  prompt: string
  raw_output: string
  ground_truth: string
  latency_ms: number

  constructor(model_name: string, task: EvalTask, raw_output: string, latency: number) {
    this.model_name = model_name
    this.task_id = task.task_id
    this.category = task.category
    this.prompt = task.prompt
    this.ground_truth = task.dynamic_ground_truth
    this.raw_output = raw_output
    this.latency_ms = latency
  }
}
