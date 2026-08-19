import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-static";

// ============ Verify Activation Code ============
// Each code:
//   - One-time use only (status: unused → used)
//   - Valid for 30 days from activation
//   - Tied to one device (deviceId)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, device_id, email } = body;

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { valid: false, error: "كود التفعيل مطلوب" },
        { status: 400 }
      );
    }

    const normalizedCode = code.trim().toUpperCase();

    // Look up code in database
    const codeRecord = await prisma.activationCode.findUnique({
      where: { code: normalizedCode },
    });

    // Code doesn't exist in database
    if (!codeRecord) {
      return NextResponse.json(
        {
          valid: false,
          error: "كود التفعيل غير صحيح — لازم تشترك بـ $150 USDT لتحصل على كود تفعيل",
        },
        { status: 401 }
      );
    }

    // Code was already used
    if (codeRecord.status === "used") {
      // Check if same device is reusing it (allowed - just check expiry)
      if (device_id && codeRecord.deviceId === device_id) {
        // Same device - check expiry
        if (codeRecord.expiresAt && new Date() > codeRecord.expiresAt) {
          return NextResponse.json(
            {
              valid: false,
              error: `انتهت صلاحية الكود في ${codeRecord.expiresAt.toLocaleDateString('ar')} — لازم تجيب كود جديد`,
              expired: true,
              expired_at: codeRecord.expiresAt,
            },
            { status: 403 }
          );
        }
        // Same device, not expired - allow access
        return NextResponse.json({
          valid: true,
          code: normalizedCode,
          plan: "pro",
          message: "تم تفعيل الكود من قبل على هذا الجهاز",
          expires_at: codeRecord.expiresAt,
          days_remaining: codeRecord.expiresAt
            ? Math.ceil((codeRecord.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            : 30,
        });
      }

      // Different device trying to use already-used code - BLOCK!
      return NextResponse.json(
        {
          valid: false,
          error: "هذا الكود تم استخدامه على جهاز آخر! كل كود يشتغل على جهاز واحد فقط.",
          already_used: true,
          used_at: codeRecord.activatedAt,
        },
        { status: 403 }
      );
    }

    // Code was revoked
    if (codeRecord.status === "revoked") {
      return NextResponse.json(
        {
          valid: false,
          error: "هذا الكود تم إلغاؤه. تواصل مع الدعم.",
        },
        { status: 403 }
      );
    }

    // Code must be in 'unused' state to activate
    if (codeRecord.status !== "unused") {
      return NextResponse.json(
        {
          valid: false,
          error: `حالة الكود غير صالحة: ${codeRecord.status}`,
        },
        { status: 400 }
      );
    }

    // Check device_id is provided
    if (!device_id) {
      return NextResponse.json(
        {
          valid: false,
          error: "بصمة الجهاز مطلوبة لتفعيل الكود",
        },
        { status: 400 }
      );
    }

    // === ACTIVATE THE CODE ===
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 days

    await prisma.activationCode.update({
      where: { id: codeRecord.id },
      data: {
        status: "used",
        usedBy: email || null,
        deviceId: device_id,
        deviceInfo: body.device_info || null,
        activatedAt: now,
        expiresAt: expiresAt,
      },
    });

    return NextResponse.json({
      valid: true,
      code: normalizedCode,
      plan: "pro",
      message: "تم التفعيل بنجاح! الكود صالح لمدة 30 يوم على هذا الجهاز فقط.",
      activated_at: now,
      expires_at: expiresAt,
      days_remaining: 30,
      device_locked: true,
    });
  } catch (error) {
    console.error("Verify code error:", error);
    return NextResponse.json(
      {
        valid: false,
        error: "خطأ في معالجة الكود",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// GET: Check code status (admin or user checking their code)
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.json(
      { error: "الكود مطلوب" },
      { status: 400 }
    );
  }

  try {
    const codeRecord = await prisma.activationCode.findUnique({
      where: { code: code.trim().toUpperCase() },
    });

    if (!codeRecord) {
      return NextResponse.json({
        exists: false,
        message: "الكود غير موجود",
      });
    }

    return NextResponse.json({
      exists: true,
      code: codeRecord.code,
      status: codeRecord.status,
      used_by: codeRecord.usedBy,
      device_id: codeRecord.deviceId?.slice(0, 12) + "..." || null,
      activated_at: codeRecord.activatedAt,
      expires_at: codeRecord.expiresAt,
      days_remaining: codeRecord.expiresAt
        ? Math.max(0, Math.ceil((codeRecord.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "خطأ في الاتصال بقاعدة البيانات" },
      { status: 500 }
    );
  }
}
