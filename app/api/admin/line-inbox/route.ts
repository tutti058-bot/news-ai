import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function GET() {
  const authenticated = await isAdminAuthenticated();

  if (!authenticated) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const items = await prisma.lineInboxItem.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      messageId: true,
      type: true,
      text: true,
      sourceUrl: true,
      imageUrl: true,
      status: true,
      error: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    success: true,
    items,
  });
}
