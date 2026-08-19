import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-static";

// Valid activation codes - ONLY real purchased codes (no free/demo codes)
const VALID_CODES = new Set([
  "ALFA-PRO-2024",
  "ALFA-VIP-2024",
]);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code } = body;

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { valid: false, error: "كود التفعيل مطلوب" },
        { status: 400 }
      );
    }

    const normalizedCode = code.trim().toUpperCase();

    // Check if it's a valid pre-defined code
    if (VALID_CODES.has(normalizedCode)) {
      return NextResponse.json({
        valid: true,
        code: normalizedCode,
        plan: normalizedCode.includes("VIP") ? "vip" : "pro",
        message: "تم التفعيل بنجاح!",
      });
    }

    // Invalid code - NO free/flexible codes accepted
    return NextResponse.json(
      { valid: false, error: "كود التفعيل غير صحيح — لازم تشترك بـ $150 USDT لتحصل على كود تفعيل" },
      { status: 401 }
    );
  } catch {
    return NextResponse.json(
      { valid: false, error: "خطأ في معالجة الكود" },
      { status: 500 }
    );
  }
}
