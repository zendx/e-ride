import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors/app-error";

export async function reviewKycDocument(
  tenantId: string,
  reviewerId: string,
  documentId: string,
  decision: "approved" | "rejected",
  rejectionReason?: string
) {
  const doc = await prisma.kycDocument.findFirst({ where: { id: documentId, tenantId } });
  if (!doc) throw new AppError("KYC document not found", 404, "kyc_not_found");

  return prisma.kycDocument.update({
    where: { id: documentId },
    data: {
      status: decision,
      reviewerId,
      reviewedAt: new Date(),
      rejectionReason: decision === "rejected" ? rejectionReason : null
    }
  });
}
