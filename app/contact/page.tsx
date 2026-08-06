export default function ContactPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="mb-8 text-4xl font-bold">
        お問い合わせ
      </h1>

      <p className="mb-6">
        当サイトへのご意見・ご感想・掲載内容に関するお問い合わせは、
        以下のメールアドレスまでお願いいたします。
      </p>

      <div className="rounded-xl border p-6">
        <p className="font-bold">メールアドレス</p>
        <p className="mt-2 text-lg">
          tutti058@gmail.com
        </p>
      </div>

      <p className="mt-8 text-sm text-gray-500">
        内容を確認後、必要に応じてご返信いたします。
      </p>
    </main>
  );
}