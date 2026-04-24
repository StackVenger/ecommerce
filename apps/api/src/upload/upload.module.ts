import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { CloudinaryStorageAdapter } from './adapters/cloudinary-storage.adapter';
import { LocalStorageAdapter } from './adapters/local-storage.adapter';
import { S3StorageAdapter } from './adapters/s3-storage.adapter';
import { ImageProcessingService } from './image-processing.service';
import { STORAGE_ADAPTER } from './interfaces/storage-adapter.interface';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';

@Global()
@Module({
  imports: [
    ConfigModule,
    MulterModule.register({
      storage: memoryStorage(),
    }),
  ],
  controllers: [UploadController],
  providers: [
    UploadService,
    ImageProcessingService,
    LocalStorageAdapter,
    S3StorageAdapter,
    CloudinaryStorageAdapter,
    {
      provide: STORAGE_ADAPTER,
      useFactory: (
        configService: ConfigService,
        localStorage: LocalStorageAdapter,
        s3Storage: S3StorageAdapter,
        cloudinaryStorage: CloudinaryStorageAdapter,
      ) => {
        const storageType = configService.get<string>('STORAGE_TYPE', 'local');

        switch (storageType) {
          case 'cloudinary':
            return cloudinaryStorage;
          case 's3':
            return s3Storage;
          case 'local':
          default:
            return localStorage;
        }
      },
      inject: [ConfigService, LocalStorageAdapter, S3StorageAdapter, CloudinaryStorageAdapter],
    },
  ],
  exports: [UploadService, ImageProcessingService],
})
export class UploadModule {}
