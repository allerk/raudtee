import { afterEach, beforeEach, describe, expect, it, type Mocked, vi } from 'vitest';
import type { D1Database, D1PreparedStatement } from '@cloudflare/workers-types';

describe('RecipientRepository', () => {
	let repository: RecipientRepository;
	let mockedDb: Mocked<D1Database>;

	const mockedStatement = {
		bind: vi.fn().mockReturnThis(),
		run: vi.fn().mockResolvedValue({ success: true }),
	} as unknown as D1PreparedStatement;

	beforeEach(() => {
		mockedDb = {
			prepare: vi.fn().mockReturnValue(mockedStatement),
		} as unknown as Mocked<D1Database>;

		repository = new RecipientRepository(mockedDb);
	})

	afterEach(() => {
		vi.resetAllMocks();
	})

	it('should create new recipient', async () => {
		const messageId = 'message-id-1234-5678';
		const recipientId = 'recipient-id-1234-5678';
		const email = 'test1@mail.com';

		vi.spyOn(crypto, 'randomUUID').mockReturnValue(recipientId as `${string}-${string}-${string}-${string}-${string}`);

		const payload = {
			messageId: messageId,
			email: email,
		}

		const expectedStatement = {
			id: recipientId,
			run: vi.fn()
		};

		const mockedBind = vi.fn().mockReturnValue(expectedStatement);
		mockedDb.prepare.mockReturnValue({ bind: mockedBind } as unknown as D1PreparedStatement);

		const result: BatchResponse = await repository.createBatch(payload);

		expect(mockedDb.prepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO recipients'))

		const prepareCall = vi.mocked(mockedDb.prepare).mock.results[0].value;
		expect(prepareCall.bind).toHaveBeenCalledWith(
			recipientId,
			payload.messageId,
			payload.email,
		);

		expect(result).toEqual(
			expect.objectContaining({
				id: recipientId,
				statement: expectedStatement,
			}))
	})

	it('should return recipients by message id', async () => {
		const messageId = 'message-id-1234-5678';
		const recipientId1 = 'recipient-id-1234-5678';
		const recipientId2 = 'recipient2-id-4321-8765';

		const dbRecords = [
			{
				id: recipientId1,
				messageId: messageId,
				email: 'test1@mail.com',
			},
			{
				id: recipientId2,
				messageId: messageId,
				email: 'test2@mail.com',
			}
		];

		const mockAll = vi.fn().mockResolvedValue({
			results: dbRecords,
			success: true
		});
		const mockBind = vi.fn().mockReturnValue({ all: mockAll });
		mockedDb.prepare.mockReturnValue({ bind: mockBind } as unknown as D1PreparedStatement);

		const result: RecipientDto[] = await repository.findAllByMessageId(messageId);

		expect(mockedDb.prepare).toHaveBeenCalledWith(
			expect.stringContaining('SELECT * FROM recipients WHERE messageId = ?')
		);
		expect(mockBind).toHaveBeenCalledWith(messageId);

		expect(result).toHaveLength(2);

		expect(result[0]).toEqual({
			id: recipientId1,
			email: dbRecords[0].email,
		});

		expect(result[1].id).toBe(recipientId2);
		expect(result[1].email).toContain(dbRecords[1].email);
	})
})