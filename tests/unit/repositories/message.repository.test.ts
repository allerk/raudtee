import { afterEach, beforeEach, describe, expect, it, type Mocked, vi } from 'vitest';
import type { D1Database, D1PreparedStatement } from '@cloudflare/workers-types';
import type { RecipientDto } from '$lib/server/domain/dto/recipient.dto';
import { MessageRepository } from '$lib/server/repositories/message.repository';
import type { AttachmentRepository } from '$lib/server/repositories/attachment.repository';
import type { RecipientRepository } from '$lib/server/repositories/recipient.repository';
import type { BatchResponse } from '$lib/server/domain/shared/batch-response.interface';
import type { AttachmentDto } from '$lib/server/domain/dto/attachment.dto';
import type { MessageDto } from '$lib/server/domain/dto/message.dto';

describe('MessageRepository', () => {
	let repository: MessageRepository;
	let mockedAttachmentRepository: Mocked<AttachmentRepository>;
	let mockedRecipientRepository: Mocked<RecipientRepository>;
	let mockedDb: Mocked<D1Database>;

	const mockedStatement = {
		bind: vi.fn().mockReturnThis(),
		run: vi.fn().mockResolvedValue({ success: true }),
	} as unknown as D1PreparedStatement;

	beforeEach(() => {
		mockedDb = {
			prepare: vi.fn().mockReturnValue(mockedStatement),
		} as unknown as Mocked<D1Database>;

		mockedAttachmentRepository = { findAllByMessageId: vi.fn() } as unknown as Mocked<AttachmentRepository>;
		mockedRecipientRepository = { findAllByMessageId: vi.fn() } as unknown as Mocked<RecipientRepository>;

		repository = new MessageRepository(mockedDb, mockedAttachmentRepository, mockedRecipientRepository);
	})

	afterEach(() => {
		vi.resetAllMocks();
	})

	it('should create new message', async () => {
		const messageId = 'message-id-1234-5678';
		const sentAtTimestamp = Date.now();
		const dateString = new Date(sentAtTimestamp).toDateString();

		vi.spyOn(crypto, 'randomUUID').mockReturnValue(messageId as `${string}-${string}-${string}-${string}-${string}`);
		vi.spyOn(Date, 'now').mockReturnValue(sentAtTimestamp);
		vi.spyOn(Date.prototype, 'toDateString').mockReturnValue(dateString);

		const payload: MessageDto = {
			subject: 'Hello',
			content: 'World',
		}

		const expectedStatement = {
			id: messageId,
			run: vi.fn()
		};

		const mockedBind = vi.fn().mockReturnValue(expectedStatement);
		mockedDb.prepare.mockReturnValue({ bind: mockedBind } as unknown as D1PreparedStatement);

		const result: BatchResponse = await repository.createBatch(payload);

		expect(mockedDb.prepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO messages'))

		const prepareCall = vi.mocked(mockedDb.prepare).mock.results[0].value;
		expect(prepareCall.bind).toHaveBeenCalledWith(
			messageId,
			payload.subject,
			payload.content,
			dateString,
		);

		expect(result).toEqual(
			expect.objectContaining({
				id: messageId,
				statement: expectedStatement,
			}))
	})

	it('should return message by id', async () => {
		const messageId = 'message-id-1234-5678';
		const attachmentId1 = 'attachment-id-1234-5678';
		const attachmentId2 = 'attachment-id-4321-8765';
		const recipientId1 = 'recipient-id-1234-5678';
		const recipientId2 = 'recipient-id-4321-8765';

		const attachmentDtos: AttachmentDto[] = [
			{
				id: attachmentId1,
				filename: 'test1.pdf',
				contentType: 'application/pdf',
				size: 1024,
				downloadUrl: `/api/v1.0/attachments/${attachmentId1}/download`
			},
			{
				id: attachmentId2,
				filename: 'test2.pdf',
				contentType: 'application/pdf',
				size: 1024,
				downloadUrl: `/api/v1.0/attachments/${attachmentId2}/download`
			}
		];
		mockedAttachmentRepository.findAllByMessageId.mockResolvedValue(attachmentDtos);

		const recipientDtos: RecipientDto[] = [
			{
				id: recipientId1,
				email: 'test@mail.com',
			},
			{
				id: recipientId2,
				email: 'test2@mail.com',
			}
		]
		mockedRecipientRepository.findAllByMessageId.mockResolvedValue(recipientDtos);

		const sentAtTimestamp = Date.now();
		const dateString = new Date(sentAtTimestamp).toDateString();
		const dbRecord = {
			id: messageId,
			subject: 'Hello',
			content: 'World',
			sentAt: dateString,
		}

		const mockFirst = vi.fn().mockResolvedValue(dbRecord);
		const mockBind = vi.fn().mockReturnValue({ first: mockFirst });

		mockedDb.prepare.mockReturnValue({ bind: mockBind } as unknown as D1PreparedStatement);

		const result: MessageDto = await repository.findOne(messageId) as MessageDto;

		expect(mockedDb.prepare).toHaveBeenCalledWith(
			expect.stringContaining('SELECT * FROM messages WHERE id = ?')
		);
		expect(mockBind).toHaveBeenCalledWith(messageId);

		expect(mockedAttachmentRepository.findAllByMessageId).toHaveBeenCalledWith(messageId);
		expect(mockedRecipientRepository.findAllByMessageId).toHaveBeenCalledWith(messageId);

		expect(mockFirst).toHaveBeenCalledTimes(1);

		expect(result).toEqual({
			id: messageId,
			subject: dbRecord.subject,
			content: dbRecord.content,
			sentAt: expect.anything(),
			attachments: attachmentDtos,
			recipients: recipientDtos,
		});

		expect(new Date(result.sentAt!).getTime()).toBe(new Date(dbRecord.sentAt).getTime());

		expect(result.attachments).toHaveLength(2);
		expect(result.recipients).toHaveLength(2);
	});

	it('should return all messages', async () => {
		const sentAtTimestamp = Date.now();
		const dateString = new Date(sentAtTimestamp).toDateString();

		const dbRecords = [
			{
				id: 'msg-1',
				subject: 'First Mail',
				content: 'Hello world',
				sentAt: dateString,
			},
			{
				id: 'msg-2',
				subject: 'Second Mail',
				content: 'Goodbye world',
				sentAt: dateString,
			}
		];

		const mockAll = vi.fn().mockResolvedValue({
			results: dbRecords,
			success: true
		});

		mockedDb.prepare.mockReturnValue({
			all: mockAll
		} as unknown as D1PreparedStatement);

		const result = await repository.findAll();

		expect(mockedDb.prepare).toHaveBeenCalledWith('SELECT * FROM messages');

		expect(result).toHaveLength(2);

		expect(result[0]).toEqual({
			id: 'msg-1',
			subject: 'First Mail',
			content: 'Hello world',
			sentAt: expect.anything()
		});

		expect(new Date(result[0].sentAt!).toDateString()).toBe(dateString);

		expect(result[0]).not.toHaveProperty('attachments');
		expect(result[0]).not.toHaveProperty('recipients');
	})

	it('should return null if message is not found and NOT fetch relations', async () => {
		const nonExistentId = 'non-existent-id';

		const mockFirst = vi.fn().mockResolvedValue(null);
		const mockBind = vi.fn().mockReturnValue({ first: mockFirst });

		mockedDb.prepare.mockReturnValue({
			bind: mockBind
		} as unknown as D1PreparedStatement);

		const result = await repository.findOne(nonExistentId);

		expect(result).toBeNull();

		expect(mockedDb.prepare).toHaveBeenCalledWith(expect.stringContaining('SELECT * FROM messages WHERE id = ?'));
		expect(mockBind).toHaveBeenCalledWith(nonExistentId);
		expect(mockFirst).toHaveBeenCalledTimes(1);

		expect(mockedAttachmentRepository.findAllByMessageId).not.toHaveBeenCalled();
		expect(mockedRecipientRepository.findAllByMessageId).not.toHaveBeenCalled();
	});
	it('should delete message by id', async () => {
		const messageId = 'message-id-1234-5678';

		const deleteStatement = {
			run: vi.fn().mockResolvedValue({ success: true }),
			bind: vi.fn().mockReturnThis(),
		} as unknown as D1PreparedStatement;

		const mockedBind = vi.fn().mockReturnValue(deleteStatement);
		mockedDb.prepare.mockReturnValue({ bind: mockedBind } as unknown as D1PreparedStatement);

		const result = await repository.delete(messageId);

		expect(mockedDb.prepare).toHaveBeenCalledWith(
			expect.stringContaining('DELETE FROM messages WHERE id = ?')
		);

		expect(mockedBind).toHaveBeenCalledWith(messageId);

		expect(deleteStatement.run).toHaveBeenCalledTimes(1);

		expect(result).toBe(true);
	})
})