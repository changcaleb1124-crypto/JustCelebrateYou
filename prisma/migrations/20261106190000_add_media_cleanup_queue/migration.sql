-- CreateTable: MediaCleanupQueue for durable transaction-first storage deletion and retry
CREATE TABLE IF NOT EXISTS "MediaCleanupQueue" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "mediaType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "nextRetryAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastError" TEXT,
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaCleanupQueue_pkey" PRIMARY KEY ("id")
);

-- CreateTable: UploadAuthorization for server-issued upload receipts and concurrency defense
CREATE TABLE IF NOT EXISTS "UploadAuthorization" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "uploadToken" TEXT NOT NULL,
    "scopedPath" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "consumedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UploadAuthorization_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MediaCleanupQueue_status_nextRetryAt_idx" ON "MediaCleanupQueue"("status", "nextRetryAt");
CREATE INDEX IF NOT EXISTS "MediaCleanupQueue_eventId_idx" ON "MediaCleanupQueue"("eventId");

CREATE UNIQUE INDEX IF NOT EXISTS "UploadAuthorization_uploadToken_key" ON "UploadAuthorization"("uploadToken");
CREATE UNIQUE INDEX IF NOT EXISTS "UploadAuthorization_scopedPath_key" ON "UploadAuthorization"("scopedPath");
CREATE INDEX IF NOT EXISTS "UploadAuthorization_eventId_idx" ON "UploadAuthorization"("eventId");
CREATE INDEX IF NOT EXISTS "UploadAuthorization_status_expiresAt_idx" ON "UploadAuthorization"("status", "expiresAt");

-- AlterTable: Reconcile VideoMessage metadata columns
ALTER TABLE "VideoMessage" ADD COLUMN IF NOT EXISTS "fileName" TEXT;
ALTER TABLE "VideoMessage" ADD COLUMN IF NOT EXISTS "fileSize" INTEGER;
ALTER TABLE "VideoMessage" ADD COLUMN IF NOT EXISTS "mimeType" TEXT;
ALTER TABLE "VideoMessage" ADD COLUMN IF NOT EXISTS "storageProvider" TEXT;

