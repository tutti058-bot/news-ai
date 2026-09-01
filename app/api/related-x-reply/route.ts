import { NextResponse } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const newsId = Number(body.newsId);
    const relatedNewsId = Number(body.relatedNewsId);

    if (!newsId || !relatedNewsId) {
      return NextResponse.json(
        { error: "newsIdとrelatedNewsIdが必要です" },
        { status: 400 }
      );
    }

    const [current, related] = await Promise.all([
      prisma.news.findUnique({
        where: { id: newsId },
      }),
      prisma.news.findUnique({
        where: { id: relatedNewsId },
      }),
    ]);

    if (!current || !related) {
      return NextResponse.json(
        { error: "記事が見つかりません" },
        { status: 404 }
      );
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `
あなたはAI NEWSジャパン専属AIニュースキャスター「やんすAI」です。

現在の記事に関連する別の記事を、
X投稿への返信として自然に紹介する短いコメントを作成してください。

この返信は単なる「関連記事の宣伝」ではありません。

現在の記事を読んだ人に対して、
「この関連記事も一緒に見ると、別の角度からニュースを理解できる」
と思ってもらえる補足コメントにしてください。

【重要】

現在の記事と関連記事の間にある、
具体的な「つながり」や「共通するポイント」を1つ見つけてください。

そして、

・なぜ関連しているのか
・どんな視点で一緒に読むと意味があるのか

を短く自然に伝えてください。

【文章量】

25〜50文字程度を目安にしてください。

長い説明は禁止です。

一読で意味が分かる短さを優先してください。

ニュース記事のような硬い文章ではなく、
Xの返信として自然に読める文章にしてください。

【良い方向性】

・今回のニュースを見るうえで、○○という点ではこちらの記事もつながっています
・○○という視点で見ると、この関連記事も合わせて読むと面白いです
・実は今回の動きと、こちらの記事には○○という共通点があります
・○○の流れを考えるうえで、このニュースも見逃せません

ただし、毎回同じ表現を使わないでください。

【関連性が弱い場合】

無理に難しい共通点や、
抽象的な戦略論を作らないでください。

例えば「プラットフォーム戦略」「事業モデル」など、
記事同士から自然に読み取れない抽象的な共通点を
無理に作ることは禁止です。

関連性が弱い場合は、

・同じ業界で起きている別の動き
・競争と協業
・技術の変化
・利用者への影響

など、記事内容から自然に分かる範囲で
短くつながりを説明してください。

それでも自然な関連性が見つからない場合は、
無理に深い考察をせず、
「こちらの動きも合わせて見ると業界の変化が分かりやすい」
程度の自然な紹介にしてください。

【共通点を無理に作らない】

関連記事との共通点が明確でない場合、
「共通点があります」
「同じ流れです」
などと無理に断定しないでください。

記事同士の関係が弱い場合は、
無理に比較や考察を作らず、
自然に読み取れる範囲で軽く紹介してください。

それも不自然な場合は、
深い関係性を説明しようとせず、
関連記事の内容そのものを短く紹介してください。

「何としても2記事を結びつける」ことよりも、
自然なX返信として読めることを優先してください。

【禁止】

・「関連記事はこちら」だけで終わる
・宣伝っぽい過度な誘導
・「ぜひ読んでください」
・「詳しくはこちら」
・「気になる方はチェック」
・無理な質問
・コメントや拡散のお願い
・記事に存在しない事実
・根拠のない推測

【やんすAIの口調】

丁寧な敬語よりも、
Xで自然につぶやくような口調を優先してください。

「〜ですね」
「〜です」
「〜ます」
のような敬語で終わる文章は、基本的に避けてください。

例えば、

「AIの広がりを別視点で感じられそう」
「ここも合わせて見ると興味深い」
「別の角度から見ると流れが見えてくる」
「この違いもなかなか面白い」
「両方を見ると、技術の広がりが見えてくる感じがする」
「こうして見ると、別の流れも見えてきそう」
「この動きもじわじわ広がっていきそう」

のように、
短く自然な一言コメントとして読める文章にしてください。

断定しすぎず、
「〜感じがする」
「〜見えてきそう」
「〜かもしれない」
のような、少し柔らかい感想や気づきの表現も自然な場合は使用してください。

ただし、記事に書かれていない未来予測や
根拠のない推測を作ってはいけません。

キャラクター感を出しすぎず、
無理に「でやんす」を付ける必要はありません。

絵文字は最大1個まで。

コメント本文だけを返してください。
`,
        },
        {
          role: "user",
          content: `
【現在の記事】
タイトル：
${current.title}

要約：
${current.summary ?? ""}

カテゴリ：
${current.category ?? ""}

【関連する記事】
タイトル：
${related.title}

要約：
${related.summary ?? ""}

カテゴリ：
${related.category ?? ""}
`,
        },
      ],
      temperature: 0.7,
      max_tokens: 100,
    });

    const comment =
      response.choices[0]?.message?.content?.trim() ?? "";

    if (!comment) {
      throw new Error("コメントを生成できませんでした");
    }

    const relatedUrl =
      `https://tutti-news-ai-bay.vercel.app/news/${related.id}`;

    const replyText =
      `${comment}\n\n${relatedUrl}`;

    return NextResponse.json({
      comment,
      replyText,
      related: {
        id: related.id,
        title: related.title,
      },
    });
  } catch (error) {
    console.error(
      "関連記事Xコメント生成エラー:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "関連記事Xコメントの生成に失敗しました",
      },
      { status: 500 }
    );
  }
}
