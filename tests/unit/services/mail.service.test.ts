import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { D1Database, D1PreparedStatement } from '@cloudflare/workers-types';
import type { Mocked } from 'vitest';
import type { RecipientRepository } from '$lib/server/repositories/recipient.repository';
import { MailService } from '$lib/server/services/mail.service';
import type { MessageRepository } from '$lib/server/repositories/message.repository';
import type { AttachmentRepository } from '$lib/server/repositories/attachment.repository';
import type { MessageDto } from '$lib/server/domain/dto/message.dto';
import { AppError } from '$lib/server/errors/app-error';

describe('Mail Service', () => {
	let service: MailService;

	let mockedMessageRepository: Mocked<MessageRepository>;
	let mockedAttachmentRepository: Mocked<AttachmentRepository>;
	let mockedRecipientRepository: Mocked<RecipientRepository>;
	let mockedDb: Mocked<D1Database>;

	const fakeStatement = { bind: vi.fn().mockReturnThis() } as unknown as D1PreparedStatement;

	beforeEach(() => {
		mockedMessageRepository = {
			createBatch: vi.fn(),
			findAll: vi.fn(),
			findOne: vi.fn()
		} as unknown as Mocked<MessageRepository>;
		mockedAttachmentRepository = { createBatch: vi.fn(), delete: vi.fn() } as unknown as Mocked<AttachmentRepository>;
		mockedRecipientRepository = {
			createBatch: vi.fn(),
			findAll: vi.fn(),
			findOne: vi.fn()
		} as unknown as Mocked<RecipientRepository>;
		mockedDb = {
			batch: vi.fn(async (st) => st.map(() => ({ success: true })))
		} as unknown as Mocked<D1Database>;

		service = new MailService(
			mockedDb,
			mockedMessageRepository,
			mockedAttachmentRepository,
			mockedRecipientRepository,
		);
	});

	const createPayload = (overrides = {}) => ({
		recipients: ['test@mail.com'],
		subject: 'Hello',
		content: 'World',
		id: crypto.randomUUID(),
		...overrides
	});

	describe('success', () => {
		it('should successfully send email', async () => {
			const payload = createPayload({ recipients: ['recipient1@mail.com', 'recipient2@mail.com'] });

			mockedMessageRepository.createBatch.mockResolvedValue({ id: payload.id, statement: fakeStatement });
			mockedRecipientRepository.createBatch.mockResolvedValue({ id: expect.anything(), statement: fakeStatement });

			await service.sendEmail(payload);

			expect(mockedMessageRepository.createBatch).toHaveBeenCalledWith(
				expect.objectContaining({
					subject: payload.subject,
					content: payload.content
				})
			);
			expect(mockedRecipientRepository.createBatch).toHaveBeenCalledTimes(2);

			expect(mockedDb.batch).toHaveBeenCalledTimes(1);
			expect(mockedDb.batch).toHaveBeenCalledWith(expect.arrayContaining([fakeStatement]));
			const batchCalls = mockedDb.batch.mock.calls[0][0];
			expect(batchCalls.length).toBe(3);
		});
		it('should successfully send email with attachments', async () => {
			const file = new File(['Hello World'], 'hello.txt', { type: 'text/plain' });
			const file2 = new File(['Greetings World'], 'greetings.txt', { type: 'text/plain' });
			const payload = createPayload({ attachments: [file, file2] });
			const mockedFileMetaData1 = {
				messageId: payload.id,
				filename: file.name,
				contentType: file.type,
				size: file.size
			}
			const mockedFileMetaData2 = {
				messageId: payload.id,
				filename: file2.name,
				contentType: file2.type,
				size: file2.size
			}

			mockedMessageRepository.createBatch.mockResolvedValue({ id: payload.id, statement: fakeStatement });
			mockedRecipientRepository.createBatch.mockResolvedValue({ id: expect.anything(), statement: fakeStatement });
			mockedAttachmentRepository.createBatch.mockResolvedValue({ id: expect.anything(), statement: fakeStatement });

			await service.sendEmail(payload);

			expect(mockedAttachmentRepository.createBatch).toHaveBeenCalledTimes(2);
			expect(mockedAttachmentRepository.createBatch).toHaveBeenCalledWith(mockedFileMetaData1, expect.any(ReadableStream));
			expect(mockedAttachmentRepository.createBatch).toHaveBeenCalledWith(mockedFileMetaData2, expect.any(ReadableStream));
		});
		it('should deduplicate recipients before processing', async () => {
			const payload = createPayload({
				recipients: ['testDuplicate1@mail.com', 'testDuplicate1@mail.com']
			});

			mockedMessageRepository.createBatch.mockResolvedValue({
				id: 'msg-123',
				statement: fakeStatement
			});
			mockedRecipientRepository.createBatch.mockResolvedValue({
				id: 'rec-123',
				statement: fakeStatement
			});

			await service.sendEmail(payload);

			expect(mockedMessageRepository.createBatch).toHaveBeenCalledTimes(1);
			expect(mockedRecipientRepository.createBatch).toHaveBeenCalledTimes(1);
		});
		it('should return a list of messages', async () => {
			const mockedList: MessageDto[] = [
				{
					id: "1",
					subject: 'Greetings',
					content: 'Hello, World!',
					sentAt: new Date(Date.now()).toDateString(),
				},
				{
					id: "2",
					subject: 'Leave',
					content: 'I have to leave today...',
					sentAt: new Date(Date.now()).toDateString(),
				}
			];

			mockedMessageRepository.findAll.mockResolvedValue(mockedList);

			const response: MessageDto[] = await service.getMails();

			expect(response).toEqual(mockedList);
			expect(response.length).toBe(2);
		});
		it('should get single email details', async () => {
			const mailId = "1";
			const mockedMail: MessageDto = {
				id: mailId,
				subject: 'Leave',
				content: 'I have to leave today...',
				sentAt: new Date(Date.now()).toDateString(),
				attachments: [
					{
						id: "1",
						filename: 'hello.txt',
						contentType: 'text/plain',
						size: 11,
						downloadUrl: '/api/v1.0/attachments/1/download'
					},
					{
						id: "2",
						filename: 'hello2.txt',
						contentType: 'text/plain',
						size: 31,
						downloadUrl: '/api/v1.0/attachments/2/download'
					}
				],
				recipients: [
					{
						id: "1",
						email: 'test1@mail.com'
					},
					{
						id: "2",
						email: 'test2@mail.com'
					}
				]
			};

			mockedMessageRepository.findOne.mockResolvedValue(mockedMail);

			const response: MessageDto = await service.getOneMail(mailId) as MessageDto;

			expect(response).toEqual(mockedMail);
			expect(mockedMessageRepository.findOne).toHaveBeenCalledTimes(1);
		});
	});
	describe('failure', () => {
		it('should cleanup R2 attachments if D1 batches operation fails', async () => {
			const file = new File(['bad luck'], 'fail.txt', { type: 'text/plain' });
			const payload = createPayload({ attachments: [file] });

			const msgStmt = { id: 'm1', statement: fakeStatement };
			const attachStmt = {
				id: 'a1',
				r2Key: 'path/to/fail.txt',
				statement: fakeStatement
			};

			mockedMessageRepository.createBatch.mockResolvedValue(msgStmt);
			mockedRecipientRepository.createBatch.mockResolvedValue({ id: 'r1', statement: fakeStatement });
			mockedAttachmentRepository.createBatch.mockResolvedValue(attachStmt);

			const error = new AppError('D1 Batch Failed: Transaction aborted');
			mockedDb.batch.mockRejectedValue(error);

			await expect(service.sendEmail(payload)).rejects.toThrow(error);

			expect(mockedAttachmentRepository.delete).toHaveBeenCalledWith(attachStmt.r2Key);
		})
		it('should fail sending email with attachment if the fail size more then 4mb', async () => {
			const bigContent = new Uint8Array(4 * 1024 * 1024 + 1); // 4MB + 1 byte
			const bigFile = new File([bigContent], 'big.txt', { type: 'text/plain' });
			const payload = createPayload({ attachments: [bigFile] });

			const error = new AppError('Maximum file size must be 4mb', 413, 'FILE_TOO_LARGE');

			await expect(service.sendEmail(payload)).rejects.toThrow(error);
			expect(mockedDb.batch).not.toHaveBeenCalled();
		});
		it('should fail sending email if there are more than 3 recipients', async () => {
			const payload = createPayload({
				recipients: ['test1@mail.com', 'test2@mail.com', 'test3@mail.com', 'test4@mail.com']
			});

			await expect(service.sendEmail(payload)).rejects.toThrow('Maximum 3 recipients allowed');

			expect(mockedDb.batch).not.toHaveBeenCalled();
		});
	});
});
