-- CreateTable
CREATE TABLE `SharedLayout` (
    `id` VARCHAR(16) NOT NULL,
    `payload` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NOT NULL,
    `hitCount` INTEGER NOT NULL DEFAULT 0,
    `createdIpHash` VARCHAR(64) NULL,

    INDEX `SharedLayout_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
