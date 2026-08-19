import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-static";

interface DeviceBinding {
  email: string;
  deviceId: string;
  boundAt: number;
  lastSeen: number;
}

const deviceBindings = new Map<string, DeviceBinding>();
const MAX_BINDINGS = 10000;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, device_id, action } = body;

    if (!email || !device_id) {
      return NextResponse.json(
        { error: "الإيميل وبصمة الجهاز مطلوبين" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!action || action === "bind") {
      const existing = deviceBindings.get(normalizedEmail);

      if (existing) {
        if (existing.deviceId === device_id) {
          existing.lastSeen = Date.now();
          return NextResponse.json({
            bound: true,
            message: "الجهاز مصرح",
            device_info: existing.deviceId,
          });
        }

        return NextResponse.json(
          {
            bound: false,
            error: "هذا الحساب مربوط بجهاز آخر! كل حساب يشتغل على جهاز واحد فقط.",
            bound_device: existing.deviceId.slice(0, 12) + "...",
            bound_at: existing.boundAt,
          },
          { status: 403 }
        );
      }

      if (deviceBindings.size >= MAX_BINDINGS) {
        const oldest = [...deviceBindings.entries()].sort(
          (a, b) => a[1].lastSeen - b[1].lastSeen
        )[0];
        if (oldest) deviceBindings.delete(oldest[0]);
      }

      deviceBindings.set(normalizedEmail, {
        email: normalizedEmail,
        deviceId: device_id,
        boundAt: Date.now(),
        lastSeen: Date.now(),
      });

      return NextResponse.json({
        bound: true,
        message: "تم ربط الحساب بالجهاز بنجاح",
      });
    }

    if (action === "check") {
      const existing = deviceBindings.get(normalizedEmail);

      if (!existing) {
        return NextResponse.json({
          authorized: true,
          message: "مفيش ربط بعد — أول مرة",
        });
      }

      if (existing.deviceId === device_id) {
        existing.lastSeen = Date.now();
        return NextResponse.json({
          authorized: true,
          message: "الجهاز مصرح",
        });
      }

      return NextResponse.json(
        {
          authorized: false,
          error: "هذا الحساب مربوط بجهاز آخر",
        },
        { status: 403 }
      );
    }

    if (action === "unbind") {
      deviceBindings.delete(normalizedEmail);
      return NextResponse.json({
        unbound: true,
        message: "تم فك الربط",
      });
    }

    return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });
  } catch {
    return NextResponse.json(
      { error: "خطأ في معالجة الطلب" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email");

  if (!email) {
    return NextResponse.json({ error: "الإيميل مطلوب" }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = deviceBindings.get(normalizedEmail);

  if (!existing) {
    return NextResponse.json({
      bound: false,
      message: "مفيش ربط",
    });
  }

  return NextResponse.json({
    bound: true,
    device_id: existing.deviceId.slice(0, 12) + "...",
    bound_at: existing.boundAt,
    last_seen: existing.lastSeen,
  });
}
