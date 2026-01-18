import { afterEach, beforeEach, describe, expect, type Mocked, vi, it } from 'vitest';
import type { D1Database, R2Bucket, D1PreparedStatement, R2ObjectBody, ReadableStream as CFStream } from '@cloudflare/workers-types';
import type { BatchResponse } from '$lib/server/domain/shared/batch-response.interface';
import type { AttachmentDto } from '$lib/server/domain/dto/attachment.dto';
import type { AttachmentDownloadDto } from '$lib/server/domain/dto/attachment_download.dto';
import { AttachmentRepository } from '$lib/server/repositories/attachment.repository';

describe('AttachmentRepository', () => {
	let repository: AttachmentRepository;
	let mockedDb: Mocked<D1Database>;
	let mockedR2: Mocked<R2Bucket>;

	const mockedStatement = {
		bind: vi.fn().mockReturnThis(),
		run: vi.fn().mockResolvedValue({ success: true }),
	} as unknown as D1PreparedStatement;

	beforeEach(() => {
		mockedDb = {
			prepare: vi.fn().mockReturnValue(mockedStatement),
		} as unknown as Mocked<D1Database>;

		mockedR2 = {
			put: vi.fn().mockResolvedValue(undefined),
			get: vi.fn().mockResolvedValue(undefined),
			delete: vi.fn().mockResolvedValue(undefined),
		} as unknown as Mocked<R2Bucket>;

		repository = new AttachmentRepository(mockedDb, mockedR2);
	})

	afterEach(() => {
		vi.resetAllMocks();
	})

	it('should upload file to R2 and save metadata to D1', async () => {
		const messageId = 'message-id-1234-5678';
		const attachmentId = 'attachment-id-1234-5678';

		vi.spyOn(crypto, 'randomUUID').mockReturnValue(attachmentId as `${string}-${string}-${string}-${string}-${string}`);

		const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
		const mockedStream = new ReadableStream() as unknown as CFStream;

		const expectedR2Key = `attachments/messages/${messageId}/${attachmentId}_test.txt`;

		const mockedFileMetaData = {
			messageId: messageId,
			filename: file.name,
			contentType: file.type,
			size: file.size
		}

		const expectedStatement = {
			id: attachmentId,
			r2Key: expectedR2Key,
			run: vi.fn()
		};

		const mockedBind = vi.fn().mockReturnValue(expectedStatement);
		mockedDb.prepare.mockReturnValue({ bind: mockedBind } as unknown as D1PreparedStatement);

		// BatchResponse = { statement: D1PreparedStatement, id: string, r2Key: string }
		const result: BatchResponse = await repository.createBatch(mockedFileMetaData, mockedStream);

		expect(mockedR2.put).toHaveBeenCalledWith(
			expectedR2Key,
			mockedStream,
			expect.objectContaining({
				httpMetadata: { contentType: mockedFileMetaData.contentType },
				customMetadata: expect.objectContaining({
					attachmentId: attachmentId,
					messageId: mockedFileMetaData.messageId,
					originalFilename: mockedFileMetaData.filename,
					uploadedAt: expect.anything()
				})
			})
		)

		expect(mockedDb.prepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO attachments'))

		const prepareCall = vi.mocked(mockedDb.prepare).mock.results[0].value;
		expect(prepareCall.bind).toHaveBeenCalledWith(
			attachmentId,
			mockedFileMetaData.messageId,
			mockedFileMetaData.filename,
			mockedFileMetaData.contentType,
			mockedFileMetaData.size,
			expectedR2Key,
			expect.anything()
		);

		expect(result).toEqual(
			expect.objectContaining({
				id: attachmentId,
				statement: expectedStatement,
				r2Key: expectedR2Key,
			})
		)
	})

	it('should return attachment metadata with downloading url', async () => {
		const messageId = 'message-id-1234-5678';
		const attachmentId1 = 'attachment-id-1234-5678';
		const attachmentId2 = 'attachment-id-4321-8765';
		const r2Key1 = `attachments/messages/${messageId}/${attachmentId1}_test1.pdf`;
		const r2Key2 = `attachments/messages/${messageId}/${attachmentId2}_test2.pdf`;

		const dbRecords = [
			{
				id: attachmentId1,
				messageId: messageId,
				filename: 'test1.pdf',
				contentType: 'application/pdf',
				size: 1024,
				r2Key: r2Key1,
			},
			{
				id: attachmentId2,
				messageId: messageId,
				filename: 'test2.pdf',
				contentType: 'application/pdf',
				size: 1024,
				r2Key: r2Key2,
			}
		];

		const mockAll = vi.fn().mockResolvedValue({
			results: dbRecords,
			success: true
		});
		const mockBind = vi.fn().mockReturnValue({ all: mockAll });
		mockedDb.prepare.mockReturnValue({ bind: mockBind } as unknown as D1PreparedStatement);

		const result: AttachmentDto[] = await repository.findAllByMessageId(messageId);

		expect(mockedDb.prepare).toHaveBeenCalledWith(
			expect.stringContaining('SELECT * FROM attachments WHERE messageId = ?')
		);
		expect(mockBind).toHaveBeenCalledWith(messageId);

		expect(result).toHaveLength(2);

		expect(result[0]).toEqual({
			id: attachmentId1,
			filename: 'test1.pdf',
			contentType: 'application/pdf',
			size: 1024,
			downloadUrl: `/api/v1.0/attachments/${attachmentId1}/download`
		});

		expect(result[1].id).toBe(attachmentId2);
		expect(result[1].downloadUrl).toContain(attachmentId2);
	})

	it('should delete file from R2', async () => {
		const messageId = 'message-id-1234-5678';
		const attachmentId = 'attachment-id-1234-5678';
		const expectedR2Key = `attachments/messages/${messageId}/${attachmentId}_test.txt`;

		await repository.delete(expectedR2Key);

		expect(mockedR2.delete).toHaveBeenCalledWith(expectedR2Key);
		expect(mockedR2.delete).toHaveBeenCalledTimes(1);
	})

	it('should return attachments` file', async () => {
		const messageId = 'message-id-1234-5678';
		const attachmentId = 'attachment-id-1234-5678';
		const r2Key = `attachments/messages/${messageId}/${attachmentId}_test.pdf`;

		const mockMetadata = {
			id: attachmentId,
			messageId: messageId,
			filename: 'test.pdf',
			content_type: 'application/pdf',
			size: 1024,
			r2Key: r2Key,
			createdAt: Date.now()
		};

		const mockFileBody = {
			body: new ReadableStream(),
			key: r2Key,
			size: 1024,
		} as unknown as R2ObjectBody;

		const mockFirst = vi.fn().mockResolvedValue(mockMetadata);
		const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
		mockedDb.prepare.mockReturnValue({ bind: mockBind } as unknown as D1PreparedStatement);

		mockedR2.get.mockResolvedValue(mockFileBody);

		const result: AttachmentDownloadDto = await repository.getFile(attachmentId) as AttachmentDownloadDto;

		expect(mockedDb.prepare).toHaveBeenCalledWith(expect.stringContaining('SELECT * FROM attachments'));
		expect(mockBind).toHaveBeenCalledWith(attachmentId);

		expect(mockedR2.get).toHaveBeenCalledWith(r2Key);

		expect(result).not.toBeNull();
		expect(result?.filename).toEqual(mockMetadata.filename);
		expect(result?.file).toBe(mockFileBody);
	})
})