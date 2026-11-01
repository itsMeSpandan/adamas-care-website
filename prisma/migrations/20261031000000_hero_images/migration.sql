-- CreateTable
CREATE TABLE "HeroImage" (
    "id" TEXT NOT NULL,
    "alt" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TEXT,
    "endDate" TEXT,
    "focalX" DOUBLE PRECISION NOT NULL DEFAULT 50.0,
    "focalY" DOUBLE PRECISION NOT NULL DEFAULT 20.0,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "blurDataUrl" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HeroImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HeroImageAsset" (
    "id" TEXT NOT NULL,
    "heroImageId" TEXT NOT NULL,
    "desktopWebp" BYTEA NOT NULL,
    "mobileWebp" BYTEA NOT NULL,

    CONSTRAINT "HeroImageAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HeroImage_enabled_sortOrder_idx" ON "HeroImage"("enabled", "sortOrder");

-- CreateIndex
CREATE INDEX "HeroImage_startDate_endDate_idx" ON "HeroImage"("startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "HeroImageAsset_heroImageId_key" ON "HeroImageAsset"("heroImageId");

-- AddForeignKey
ALTER TABLE "HeroImageAsset" ADD CONSTRAINT "HeroImageAsset_heroImageId_fkey" FOREIGN KEY ("heroImageId") REFERENCES "HeroImage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
