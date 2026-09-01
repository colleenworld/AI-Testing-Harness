export interface ApiKeysSecret {
  TAVILY_API_KEY: string
  OPENROUTER_API_KEY: string
  GEMINI_API_KEY: string
  OPENAI_API_KEY: string
}

export interface DatabaseSecret {
  username: string;
  password: string;
}

async function getSecret<T>(
  secretArn: string
): Promise<T> {
  const response = await fetch(
    'http://localhost:2773/secretsmanager/get' +
        `?secretId=${encodeURIComponent(secretArn)}`,
    {
      headers: {
        'X-Aws-Parameters-Secrets-Token':
                    process.env.AWS_SESSION_TOKEN ?? ''
      }
    }
  )

  if (!response.ok) {
    const errorBody = await response.text()

    throw new Error(
      'Failed to retrieve secret: ' +
            `${response.status} ${errorBody}`
    )
  }

  const responseBody = await response.json() as {
    SecretString?: string
  }

  if (!responseBody.SecretString) {
    throw new Error('Secret contains no SecretString')
  }

  return JSON.parse(responseBody.SecretString) as T
}

export async function whisper<T>(arn: string): Promise<T> {
  const secretArn = process.env[arn]

  if (!secretArn) {
    throw new Error(`Secret ${arn} is not configured`)
  }

  return getSecret<T>(secretArn)
}