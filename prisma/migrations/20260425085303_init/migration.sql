-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'PENDING', 'REJECTED');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'FULLY_APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('UNDER_REVIEW', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "enrollmentNo" TEXT,
    "name" TEXT NOT NULL,
    "department" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" TEXT NOT NULL DEFAULT 'STUDENT',
    "fatherName" TEXT,
    "passOutYear" INTEGER,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "signatureUrl" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "applicationNo" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "fullName" TEXT NOT NULL,
    "fatherName" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "passOutYear" INTEGER NOT NULL,
    "course" TEXT NOT NULL,
    "cgpa" DOUBLE PRECISION NOT NULL,
    "isHostelResident" BOOLEAN NOT NULL DEFAULT false,
    "hostelName" TEXT,
    "roomNumber" TEXT,
    "cautionMoneyRefund" BOOLEAN NOT NULL DEFAULT false,
    "receiptNumber" TEXT,
    "feeReceipts" TEXT[],
    "marksheet" TEXT,
    "bankDetails" TEXT,
    "collegeId" TEXT,
    "currentStage" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "dynamicData" JSONB DEFAULT '{}',

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Approval" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "stage" INTEGER NOT NULL,
    "department" TEXT NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'UNDER_REVIEW',
    "remarks" TEXT,
    "actionDate" TIMESTAMP(3),
    "approvedBy" TEXT,

    CONSTRAINT "Approval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemDepartment" (
    "id" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemDepartment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemRole" (
    "id" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "isUniversal" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormTemplate" (
    "id" TEXT NOT NULL,
    "formType" TEXT NOT NULL,
    "schema" JSONB NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NocApplication" (
    "id" TEXT NOT NULL,
    "applicationNo" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "enrollmentNo" TEXT,
    "studentName" TEXT,
    "currentYear" TEXT,
    "companyName" TEXT,
    "companyLocation" TEXT,
    "companyAddress" TEXT,
    "companyWebsite" TEXT,
    "durationInDays" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "recipientName" TEXT,
    "recipientDesignation" TEXT,
    "applyingThrough" TEXT,
    "stipend" TEXT,
    "offerLetterUrl" TEXT,
    "hodApprovalStatus" "ApprovalStatus" NOT NULL DEFAULT 'UNDER_REVIEW',
    "hodRemarks" TEXT,
    "tpcApprovalStatus" "ApprovalStatus" NOT NULL DEFAULT 'UNDER_REVIEW',
    "tpcRemarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "dynamicData" JSONB DEFAULT '{}',

    CONSTRAINT "NocApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BonafideApplication" (
    "id" TEXT NOT NULL,
    "applicationNo" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "studentName" TEXT,
    "enrollmentNo" TEXT,
    "fatherName" TEXT,
    "currentYear" TEXT,
    "semester" TEXT,
    "emailAddress" TEXT,
    "session" TEXT,
    "hodApprovalStatus" "ApprovalStatus" NOT NULL DEFAULT 'UNDER_REVIEW',
    "hodRemarks" TEXT,
    "dynamicData" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "hodId" TEXT,

    CONSTRAINT "BonafideApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_enrollmentNo_key" ON "User"("enrollmentNo");

-- CreateIndex
CREATE UNIQUE INDEX "Application_applicationNo_key" ON "Application"("applicationNo");

-- CreateIndex
CREATE INDEX "Application_studentId_idx" ON "Application"("studentId");

-- CreateIndex
CREATE INDEX "Approval_applicationId_idx" ON "Approval"("applicationId");

-- CreateIndex
CREATE INDEX "Approval_department_stage_status_idx" ON "Approval"("department", "stage", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SystemDepartment_value_key" ON "SystemDepartment"("value");

-- CreateIndex
CREATE UNIQUE INDEX "SystemRole_value_key" ON "SystemRole"("value");

-- CreateIndex
CREATE UNIQUE INDEX "FormTemplate_formType_key" ON "FormTemplate"("formType");

-- CreateIndex
CREATE UNIQUE INDEX "NocApplication_applicationNo_key" ON "NocApplication"("applicationNo");

-- CreateIndex
CREATE INDEX "NocApplication_studentId_idx" ON "NocApplication"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "BonafideApplication_applicationNo_key" ON "BonafideApplication"("applicationNo");

-- CreateIndex
CREATE INDEX "BonafideApplication_studentId_idx" ON "BonafideApplication"("studentId");

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NocApplication" ADD CONSTRAINT "NocApplication_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BonafideApplication" ADD CONSTRAINT "BonafideApplication_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BonafideApplication" ADD CONSTRAINT "BonafideApplication_hodId_fkey" FOREIGN KEY ("hodId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
