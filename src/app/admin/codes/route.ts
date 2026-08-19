import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-static";

// GET: List all activation codes (admin only)
export async function GET(request: NextRequest) {
  try {
    const adminKey = request.nextUrl.searchParams.get("key");
    if (adminKey !== "ALFA-ADMIN-2026") {
      return NextResponse.json(
        { error: "غير مصرح - مطلوب مفتاح الأدمن" },
        { status: 401 }
      );
    }

    const codes = await prisma.activationCode.findMany({
      orderBy: { createdAt: "desc" },
      take: 1000,
    });

    const stats = {
      total: codes.length,
      unused: codes.filter(c => c.status === "unused").length,
      used: codes.filter(c => c.status === "used").length,
      expired: codes.filter(c =>
        c.status === "used" &&
        c.expiresAt &&
        new Date() > c.expiresAt
      ).length,
      revoked: codes.filter(c => c.status === "revoked").length,
    };

    return NextResponse.json({
      stats,
      codes: codes.map(c => ({
        code: c.code,
        status: c.status,
        usedBy: c.usedBy,
        deviceId: c.deviceId?.slice(0, 12) + "..." || null,
        deviceInfo: c.deviceInfo,
        activatedAt: c.activatedAt,
        expiresAt: c.expiresAt,
        daysRemaining: c.expiresAt
          ? Math.max(0, Math.ceil((c.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
          : null,
        createdAt: c.createdAt,
      })),
    });
  } catch (error) {
    console.error("List codes error:", error);
    return NextResponse.json(
      { error: "خطأ في الاتصال بقاعدة البيانات" },
      { status: 500 }
    );
  }
}
