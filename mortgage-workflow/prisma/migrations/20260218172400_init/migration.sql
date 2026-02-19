-- CreateEnum
CREATE TYPE "CaseType" AS ENUM ('FTB', 'HomeMover', 'Remortgage', 'BTL', 'ProductSwitch', 'Other');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('Active', 'Closed', 'Completed');

-- CreateEnum
CREATE TYPE "Stage" AS ENUM ('Research', 'ChaseClient', 'DIP', 'PostDIPChase', 'AwaitingNB', 'NBSubmitted', 'Closed', 'Completed');

-- CreateEnum
CREATE TYPE "StageVariant" AS ENUM ('PostDIPChase');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('Illustration', 'Offer', 'Application', 'Other');

-- CreateEnum
CREATE TYPE "IllustrationVariant" AS ENUM ('FeeAdded', 'FeeUpfront', 'None');

-- CreateEnum
CREATE TYPE "ParseStatus" AS ENUM ('Parsed', 'Partial', 'Failed');

-- CreateEnum
CREATE TYPE "FieldType" AS ENUM ('String', 'Number', 'Date', 'Boolean');

-- CreateEnum
CREATE TYPE "FieldSource" AS ENUM ('Extracted', 'Manual');

-- CreateEnum
CREATE TYPE "RepaymentMethod" AS ENUM ('Repayment', 'InterestOnly', 'PartAndPart');

-- CreateEnum
CREATE TYPE "ObjectiveCategory" AS ENUM ('RateSecurity', 'ReducePayment', 'RaiseCapital', 'ShortenTerm', 'DebtConsolidation', 'ProductSwitch', 'Other');

-- CreateEnum
CREATE TYPE "JustificationMode" AS ENUM ('Preset', 'Manual');

-- CreateEnum
CREATE TYPE "CommissionRule" AS ENUM ('DefaultHelen100', 'Shared7030', 'ManualOverride');

-- CreateEnum
CREATE TYPE "AuditEventType" AS ENUM ('StageChanged', 'FieldConfirmed', 'FieldOverridden', 'DateOverridden', 'DraftGenerated', 'DraftRegenerated', 'OfferMismatchAcknowledged', 'CaseClosed', 'CaseReopened', 'CommissionOverridden');

-- CreateTable
CREATE TABLE "Case" (
    "id" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "caseType" "CaseType" NOT NULL DEFAULT 'Remortgage',
    "status" "CaseStatus" NOT NULL DEFAULT 'Active',
    "stage" "Stage" NOT NULL DEFAULT 'Research',
    "stageVariant" "StageVariant",
    "stageStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stageDueAt" TIMESTAMP(3) NOT NULL,
    "lastActionAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "researchCompletedAt" TIMESTAMP(3),
    "dipCompletedAt" TIMESTAMP(3),
    "applicationSubmittedAt" TIMESTAMP(3),
    "nbDueAt" TIMESTAMP(3),
    "nbSubmittedAt" TIMESTAMP(3),
    "rateExpiryAt" TIMESTAMP(3),
    "offerExpiryAt" TIMESTAMP(3),
    "sharedCase" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Case_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "variant" "IllustrationVariant",
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "originalFilename" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "parseStatus" "ParseStatus" NOT NULL DEFAULT 'Parsed',
    "parseVersion" TEXT NOT NULL DEFAULT '1.0',

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExtractedField" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "valueRaw" TEXT NOT NULL,
    "valueNormalized" TEXT NOT NULL,
    "valueType" "FieldType" NOT NULL,
    "source" "FieldSource" NOT NULL DEFAULT 'Extracted',
    "sourcePage" INTEGER,
    "confidence" DOUBLE PRECISION,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "confirmedAt" TIMESTAMP(3),
    "overridden" BOOLEAN NOT NULL DEFAULT false,
    "overrideReason" TEXT,
    "overriddenAt" TIMESTAMP(3),

    CONSTRAINT "ExtractedField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IllustrationSnapshot" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "variant" "IllustrationVariant" NOT NULL DEFAULT 'None',
    "lenderName" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "productCode" TEXT,
    "loanPurpose" TEXT,
    "repaymentMethod" "RepaymentMethod" NOT NULL DEFAULT 'Repayment',
    "loanAmount" DECIMAL(65,30) NOT NULL,
    "termYears" INTEGER NOT NULL,
    "propertyValue" DECIMAL(65,30) NOT NULL,
    "ltvPercent" DECIMAL(65,30),
    "initialRatePercent" DECIMAL(65,30) NOT NULL,
    "initialRateEndDate" TIMESTAMP(3) NOT NULL,
    "reversionRatePercent" DECIMAL(65,30) NOT NULL,
    "monthlyPaymentInitial" DECIMAL(65,30) NOT NULL,
    "monthlyPaymentReversion" DECIMAL(65,30) NOT NULL,
    "aprcPercent" DECIMAL(65,30) NOT NULL,
    "totalAmountRepayable" DECIMAL(65,30) NOT NULL,
    "arrangementFeeAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "arrangementFeeAddedToLoan" BOOLEAN NOT NULL DEFAULT false,
    "brokerFeeAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "procFeeAmount" DECIMAL(65,30),
    "cashbackAmount" DECIMAL(65,30),
    "ercSummaryText" TEXT,
    "portability" BOOLEAN NOT NULL DEFAULT false,
    "overpaymentPercent" DECIMAL(65,30),
    "rateExpiryAt" TIMESTAMP(3),
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IllustrationSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeDisclosureCalculation" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "feeAddedAmount" DECIMAL(65,30) NOT NULL,
    "totalRepayableFeeAdded" DECIMAL(65,30) NOT NULL,
    "totalRepayableFeeUpfront" DECIMAL(65,30) NOT NULL,
    "interestChargedOnFee" DECIMAL(65,30) NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeeDisclosureCalculation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfferSnapshot" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "offerExpiryAt" TIMESTAMP(3),
    "confirmedRatePercent" DECIMAL(65,30) NOT NULL,
    "confirmedLoanAmount" DECIMAL(65,30) NOT NULL,
    "confirmedTermYears" INTEGER NOT NULL,
    "confirmedRepaymentMethod" "RepaymentMethod" NOT NULL,
    "matchesIllustration" BOOLEAN NOT NULL DEFAULT true,
    "mismatchFields" TEXT[],
    "acknowledgedByUser" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfferSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuitabilityDraft" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "templateVersion" TEXT NOT NULL DEFAULT '1.1',
    "objectiveCategory" "ObjectiveCategory" NOT NULL,
    "objectiveNotes" TEXT,
    "justificationMode" "JustificationMode" NOT NULL DEFAULT 'Preset',
    "presetJustificationKey" TEXT,
    "manualJustificationText" TEXT,
    "affordabilitySummary" TEXT NOT NULL,
    "riskSummary" TEXT NOT NULL,
    "includeFeeAddedSection" BOOLEAN NOT NULL DEFAULT false,
    "includeErcSection" BOOLEAN NOT NULL DEFAULT true,
    "includePortabilitySection" BOOLEAN NOT NULL DEFAULT false,
    "includeOverpaymentSection" BOOLEAN NOT NULL DEFAULT false,
    "includeAlternativeProducts" BOOLEAN NOT NULL DEFAULT false,
    "inputHash" TEXT NOT NULL,
    "staleDueToInputChange" BOOLEAN NOT NULL DEFAULT false,
    "approvedByUser" BOOLEAN NOT NULL DEFAULT false,
    "approvedAt" TIMESTAMP(3),
    "generatedDocPath" TEXT,

    CONSTRAINT "SuitabilityDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ASFDraft" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "templateVersion" TEXT NOT NULL DEFAULT '1.0',
    "vulnerableClient" BOOLEAN NOT NULL DEFAULT false,
    "sourceOfBusiness" TEXT,
    "purposeOfLoan" TEXT,
    "borrowerType" TEXT,
    "accountNumber" TEXT,
    "approvedByUser" BOOLEAN NOT NULL DEFAULT false,
    "approvedAt" TIMESTAMP(3),
    "generatedDocPath" TEXT,

    CONSTRAINT "ASFDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Commission" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "grossCommission" DECIMAL(65,30),
    "helenSplitPercent" DECIMAL(65,30) NOT NULL DEFAULT 100,
    "eileenSplitPercent" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "brokerFeeAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "feeWaived" BOOLEAN NOT NULL DEFAULT false,
    "splitRuleApplied" "CommissionRule" NOT NULL DEFAULT 'DefaultHelen100',

    CONSTRAINT "Commission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLogEvent" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "eventType" "AuditEventType" NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "fieldKey" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLogEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IllustrationSnapshot_documentId_key" ON "IllustrationSnapshot"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "FeeDisclosureCalculation_caseId_key" ON "FeeDisclosureCalculation"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "OfferSnapshot_caseId_key" ON "OfferSnapshot"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "OfferSnapshot_documentId_key" ON "OfferSnapshot"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "SuitabilityDraft_caseId_key" ON "SuitabilityDraft"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "ASFDraft_caseId_key" ON "ASFDraft"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "Commission_caseId_key" ON "Commission"("caseId");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtractedField" ADD CONSTRAINT "ExtractedField_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IllustrationSnapshot" ADD CONSTRAINT "IllustrationSnapshot_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferSnapshot" ADD CONSTRAINT "OfferSnapshot_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuitabilityDraft" ADD CONSTRAINT "SuitabilityDraft_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ASFDraft" ADD CONSTRAINT "ASFDraft_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLogEvent" ADD CONSTRAINT "AuditLogEvent_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
