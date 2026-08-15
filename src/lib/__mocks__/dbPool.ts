import { jest } from '@jest/globals'

export const mockDbQuery = jest.fn().mockImplementation(() => {
  return Promise.resolve({ rows: [] })
})

const poolMock = {
  query: mockDbQuery,
  safeQuery: mockDbQuery
}

export default poolMock