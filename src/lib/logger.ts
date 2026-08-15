import winston from 'winston'

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json() // Forces every log block to output as a single-line stringified JSON object
  ),
  defaultMeta: {
    service: 'evaluation-harness',
    environment: process.env.NODE_ENV || 'local-development'
  },
  transports: [
    new winston.transports.Console() // Streams directly to stdout for Lambda/CloudWatch consumption
  ]
})