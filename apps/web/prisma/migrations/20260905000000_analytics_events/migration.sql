-- CreateTable
CREATE TABLE `GeneratorAnalyticsEvent` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `eventType` VARCHAR(64) NOT NULL,
    `generator` VARCHAR(32) NOT NULL,
    `variantId` VARCHAR(64) NULL,
    `sessionHash` VARCHAR(64) NULL,
    `visitorHash` VARCHAR(64) NULL,
    `ipHash` VARCHAR(64) NULL,
    `userAgent` VARCHAR(255) NULL,
    `details` JSON NULL,

    INDEX `GeneratorAnalyticsEvent_createdAt_idx`(`createdAt`),
    INDEX `GeneratorAnalyticsEvent_eventType_idx`(`eventType`),
    INDEX `GeneratorAnalyticsEvent_generator_idx`(`generator`),
    INDEX `GeneratorAnalyticsEvent_variantId_idx`(`variantId`),
    INDEX `GeneratorAnalyticsEvent_visitorHash_idx`(`visitorHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
