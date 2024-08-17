import { encodeJwt } from '@/utils/Jwt';

describe('JWT', () => {
    it('should encode JWTs with a body and secret', async () => {
        const jwtReceived = encodeJwt(JSON.stringify({ text: 'blah' }), 'asdf');
        const jwtExpected = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0ZXh0IjoiYmxhaCJ9.0nRqiVV4_-MEG6S7jcQgfU7UEJosJ8gO_cgwmWYV56Q';

        expect(jwtReceived).toBe(jwtExpected);
    });
});
