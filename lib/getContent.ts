export type NewsContent = {
  points: string[];
  comment: string;
};

/**
 * AI NEWS ジャパン独自の補足情報を生成
 *
 * OpenAI APIは使用しない。
 * 記事タイトル・要約・カテゴリからルールベースで生成するため、
 * APIコストを増やさず独自コンテンツを追加できる。
 */
export function generateNewsContent(
  title: string,
  summary: string,
  category: string
): NewsContent {
  const text = `${title} ${summary}`.toLowerCase();

  const points: string[] = [];

  // カテゴリごとの注目ポイント
  switch (category) {
    case "テクノロジー":
      points.push("AI・テクノロジー業界の動きとして注目されるニュースです。");
      break;

    case "スポーツ":
      points.push("今後の大会・チーム・選手の動向にもつながるニュースです。");
      break;

    case "芸能":
      points.push("今後の活動や関連する話題への広がりにも注目です。");
      break;

    case "経済":
      points.push("企業や市場への影響という視点でも注目したいニュースです。");
      break;

    case "国際":
      points.push("今後の国際情勢への影響にも注目したいニュースです。");
      break;

    case "国内":
      points.push("私たちの生活や社会との関わりという視点でも注目したいニュースです。");
      break;

    default:
      points.push("今後の動きにも注目したいニュースです。");
  }

  // タイトル・要約に含まれるキーワードから補足
  if (/ai|人工知能|chatgpt|openai/i.test(text)) {
    points.push("AI技術の進化や活用が、今後どのように広がるかがポイントです。");
  }

  if (/発表|発表した|公開|開始|導入|発売/i.test(text)) {
    points.push("今回の発表・開始によって、今後の展開がどう変わるかがポイントです。");
  }

  if (/企業|会社|メーカー|サービス/i.test(text)) {
    points.push("企業やサービスの今後の展開にも注目が集まりそうです。");
  }

  // 最大3項目
  const uniquePoints = Array.from(new Set(points)).slice(0, 3);

  let comment = "今後の動きにも注目しておきたいニュースでやんす。";

  switch (category) {
    case "テクノロジー":
      comment = "技術の進化が、これからどんな形で広がっていくのか注目したいところでやんす。";
      break;

    case "スポーツ":
      comment = "ここからの展開がどう動いていくのか、引き続き注目したいニュースでやんす。";
      break;

    case "芸能":
      comment = "これから関連する動きが出てくるのか、気になるところでやんす。";
      break;

    case "経済":
      comment = "企業や市場にどんな影響が出てくるのか、今後も見ておきたいニュースでやんす。";
      break;

    case "国際":
      comment = "今後の情勢がどう変化していくのか、引き続き注目したいニュースでやんす。";
      break;

    case "国内":
      comment = "身近なところにも影響が出てくる可能性があるため、今後の動きも見ておきたいでやんす。";
      break;
  }

  return {
    points: uniquePoints,
    comment,
  };
}
