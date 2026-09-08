import { test, expect } from '@playwright/test';
// https://restful-booker.herokuapp.com/ping

test('ping request - GET', async ({ request }) => {
    const responseData = await request.get('https://restful-booker.herokuapp.com/ping');
    console.log(responseData);
    expect(responseData.status()).toBe(201);
});