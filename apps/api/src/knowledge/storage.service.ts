import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const BUCKET = process.env.S3_BUCKET || 'verana-studio';
const TTL_SECONDS = 7 * 24 * 60 * 60; // 7 días

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private s3: S3Client;

  onModuleInit() {
    this.s3 = new S3Client({
      endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
      region: process.env.S3_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY || 'minioadmin',
        secretAccessKey: process.env.S3_SECRET_KEY || 'minioadmin',
      },
      forcePathStyle: true, // requerido para MinIO
    });
    this.logger.log('S3/MinIO client initialized');
  }

  async upload(
    key: string,
    buffer: Buffer,
    mimetype: string,
  ): Promise<void> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: buffer,
        ContentType: mimetype,
      }),
    );
    this.logger.log(`Uploaded: ${key}`);
  }

  async delete(key: string): Promise<void> {
    await this.s3.send(
      new DeleteObjectCommand({ Bucket: BUCKET, Key: key }),
    );
    this.logger.log(`Deleted: ${key}`);
  }

  async getSignedUrl(key: string, ttlSeconds = TTL_SECONDS): Promise<string> {
    const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
    return getSignedUrl(this.s3, command, { expiresIn: ttlSeconds });
  }

  buildKey(agentId: string, docId: string, filename: string): string {
    return `agents/${agentId}/docs/${docId}/${filename}`;
  }
}
