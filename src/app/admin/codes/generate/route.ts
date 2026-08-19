import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-static";

// Characters: skip confusing ones (0,O,1,I,L)
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomPart(length = 4): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }
  return result;
}

function generateCode(): string {
  return `ALFA-${randomPart()}-${randomPart()}`;
}

// POST: Generate N activation codes (admin only)
// Body: { count: number, key: "ALFA-ADMIN-2026" }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { count, key } = body;

    if (key !== "ALFA-ADMIN-2026") {
      return NextResponse.json(
        { error: "غير مصرح - مطلوب مفتاح الأدمن" },
        { status: 401 }
      );
    }

    const numCodes = Math.min(Math.max(parseInt(count) || 1, 1), 1000);

    const codes = [];
    let attempts = 0;
    const maxAttempts = numCodes * 5;

    while (codes.length < numCodes && attempts < maxAttempts) {
      attempts++;
      const code = generateCode();

      try {
        const created = await prisma.activationCode.create({
          data: {
            code,
            status: "unused",
          },
        });
        codes.push(created);
      } catch (e: any) {
        // Duplicate code - try again
        if (e.code === "P2002") continue;
        throw e;
      }
    }

    return NextResponse.json({
      success: true,
      generated: codes.length,
      codes: codes.map(c => c.code),
      message: `تم توليد ${codes.length} كود بنجاح`,
    });
  } catch (error) {
    console.error("Generate codes error:", error);
    return NextResponse.json(
      { error: "خطأ في توليد الأكواد" },
      { status: 500 }
    );
  }
}
