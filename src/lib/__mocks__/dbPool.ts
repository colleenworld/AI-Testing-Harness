import { jest } from '@jest/globals';

export const mockQuery = jest.fn().mockImplementation(() => {
    return Promise.resolve({ rows: [] });
});

const poolMock = {
    query: mockQuery
};

export default poolMock;
