import { NextRequest, NextResponse } from "next/server";

// Valid activation codes (in production, this would be a database)
const VALID_CODES = new Set([
  "ALFA-DEMO-2024",
  "ALFA-PRO-2024",
  "ALFA-VIP-2024",
  "ALFA-TEST-1234",
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
        plan: normalizedCode.includes("VIP") ? "vip" : normalizedCode.includes("PRO") ? "pro" : "standard",
        message: "تم التفعيل بنجاح!",
      });
    }

    // Accept any code starting with "ALFA-" and length >= 8 (for demo/flexible codes)
    if (normalizedCode.startsWith("ALFA-") && normalizedCode.length >= 8) {
      return NextResponse.json({
        valid: true,
        code: normalizedCode,
        plan: "standard",
        message: "تم التفعيل بنجاح!",
      });
    }

    // Invalid code
    return NextResponse.json(
      { valid: false, error: "كود التفعيل غير صحيح" },
      { status: 401 }
    );
  } catch {
    return NextResponse.json(
      { valid: false, error: "خطأ في معالجة الكود" },
      { status: 500 }
    );
  }
}
