import { expect, test, type Page, type Route } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

type MessageSummary = {
	id: string;
	subject: string;
	content: string;
	sentAt: string;
};

type MessageDetails = MessageSummary & {
	recipients: Array<{ id: string; email: string }>;
	attachments: Array<{ id: string; filename: string }>;
};

const listMessages: MessageSummary[] = [
	{
		id: 'msg-1',
		subject: 'Hello from Playwright Test 1',
		content: 'First message body',
		sentAt: 'Sat, Jan 17 2026'
	},
	{
		id: 'msg-2',
		subject: 'Hello from Playwright Test 2',
		content: 'Second message body',
		sentAt: 'Sat, Jan 17 2026'
	}
];

const detailMessage: MessageDetails = {
	id: 'msg-2',
	subject: 'Something Subject',
	content: 'Please do something',
	sentAt: 'Sat, Jan 17 2026',
	recipients: [{ id: 'rcpt-1', email: 'user1@mail.com' }],
	attachments: [{ id: 'att-1', filename: 'notes.txt' }]
};

async function mockListMessages(page: Page) {
	await page.route('**/api/v1.0/messages', async (route: Route) => {
		if (route.request().method() !== 'GET') return route.fallback();
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ ok: true, result: listMessages })
		});
	});
}

async function mockSendEmail(page: Page) {
	await page.route('**/api/v1.0/send-email', async (route: Route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ ok: true, result: { id: 'msg-3' } })
		});
	});
}

test('renders the mail form and message list', async ({ page }) => {
	await mockListMessages(page);

	await page.goto('/');

	await expect(page.getByRole('heading', { name: 'Mock MS Graph Mail' })).toBeVisible();
	await expect(page.getByPlaceholder('user1@mail.com, user2@mail.com')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Send Email' })).toBeVisible();
	await expect(page.getByText('Hello from Playwright Test 1')).toBeVisible();
	await expect(page.getByText('Hello from Playwright Test 2')).toBeVisible();
});

test('submits a message and clears the form', async ({ page }) => {
	await mockListMessages(page);
	await mockSendEmail(page);

	await page.goto('/');

	await page.getByPlaceholder('user1@mail.com, user2@mail.com').fill('user1@mail.com');
	await page.getByPlaceholder('Enter subject').fill('Playwright subject');
	await page.getByPlaceholder('Type your content here...').fill('Body text');

	await page.getByRole('button', { name: 'Send Email' }).click();

	await expect(page.getByPlaceholder('user1@mail.com, user2@mail.com')).toHaveValue('');
	await expect(page.getByPlaceholder('Enter subject')).toHaveValue('');
	await expect(page.getByPlaceholder('Type your content here...')).toHaveValue('');
});
