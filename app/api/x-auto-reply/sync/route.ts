import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

const MY_USER_ID = "2084661197438435328";

export async function GET() {
  try {
    const url =
      `https://api.x.com/2/users/${MY_USER_ID}/followers?` +
      new URLSearchParams({
        max_results: "1000",
      }).toString();

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${process.env.X_Bearer_Token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "フォロワー同期に失敗しました",
          detail: data,
        },
        { status: response.status }
      );
    }

    const followers = (data.data ?? []).map(
      (user: { id: string; username?: string; name?: string }) => ({
        id: user.id,
        username: user.username ?? "",
        name: user.name ?? "",
      })
    );

    const blob = await put(
      "x-auto-reply/followers.json",
      JSON.stringify(followers),
      {
        access: "public",
        addRandomSuffix: false,
        contentType: "application/json",
        allowOverwrite: true,
      }
    );

    return NextResponse.json({
      mode: "X_FOLLOWER_SYNC",
      followerCount: followers.length,
      cacheUrl: blob.url,
    });
  } catch (error) {
    console.error("Xフォロワー同期エラー:", error);

    return NextResponse.json(
      { error: "Xフォロワー同期に失敗しました" },
      { status: 500 }
    );
  }
}
