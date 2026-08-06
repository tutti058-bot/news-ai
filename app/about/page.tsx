export default function AboutPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="mb-8 text-4xl font-bold">
        運営者情報
      </h1>

      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold">サイト名</h2>
          <p>AI News ジャパン</p>
        </div>

        <div>
          <h2 className="text-xl font-bold">サイト概要</h2>
          <p>
            AI News ジャパンは、国内外のニュースをAIが要約・分析し、
            わかりやすくお届けするニュースメディアです。
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold">運営目的</h2>
          <p>
            最新ニュースを短時間で把握できるよう、
            AIを活用した情報整理・要約を提供しています。
          </p>
        </div>
      </div>
    </main>
  );
}