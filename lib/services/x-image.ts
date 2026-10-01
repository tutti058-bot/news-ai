import OpenAI from "openai";
import { prisma } from "@/lib/prisma";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type XImagePostType =
  | "standard"
  | "yani_reaction"
  | "today_topic"
  | "numbers"
  | "breaking"
  | "soccer_match"
  | "comparison"
  | "actually"
  | "impact"
  | "daily_summary"
  | "yani_one_liner";

const imagePostPrompts: Record<XImagePostType, string> = {
  standard:
    "A polished editorial-news image that directly visualizes the news topic. Strong composition suitable for an X timeline.",

  yani_reaction:
    "YANI NEKO MASTER CHARACTER AND ART STYLE. Draw the established Yani Neko character consistently: a petite young adult woman with clearly adult anatomy, adult body proportions, adult shoulders, adult torso length, and mature facial structure. She has a cute youthful appearance and a small stature, but she must unmistakably look like an adult woman, never like a child. She has very thin, soft, pale ash-gray hair with a clearly visible but soft pale mint-green tint, especially noticeable in the highlights, a short fluffy wavy/permed bob, large expressive cat ears, and a visible cat tail. Her eyes are extremely large, round, bright amber-golden cat eyes. Her face is cute, slightly goofy, playful, and mischievous rather than elegant or glamorous. When surprised, exaggerate the cat-like eyes and make the mouth visibly more cat-like. Use a cute, clean Japanese anime/comic illustration style with a gentle hand-drawn feeling. Use thick clean black outlines, soft pale colors, simple clean shapes, light cel-style shading, smooth anime coloring, and expressive exaggerated facial expressions. Keep the artwork polished and visually cute. The hand-drawn feeling should be subtle, not rough or messy. Avoid sketchy lines, gritty textures, watercolor, oil-paint effects, photorealism, or overly painterly rendering. Keep the character cute above everything else. Do NOT redesign her. Do NOT make her a normal human girl, realistic woman, fox girl, furry character, child, teenager, schoolgirl, or photorealistic person. Her head-to-body ratio must remain appropriate for an adult woman. Do NOT change her hair to brown, black, blonde, white, or silver-white. Do NOT make her a polished fashion-model type character. Do NOT add unnecessary mature glamour or realism. Do not place any character name or branding text inside the artwork. Show her reacting dramatically to the news in a silly, exaggerated, highly expressive way while the surrounding scene communicates the news topic.",

  today_topic:
    "A visually striking illustration centered on the main talking point of the news. Make the central subject immediately understandable at a glance.",

  numbers:
    "A visual concept centered on the most important numbers, scale, or statistics in the news. Communicate the magnitude visually without relying on written text.",

  breaking:
    "A dynamic breaking-news scene with urgency, motion, and a strong focal point. Make the situation instantly understandable.",

  soccer_match:
    "A dynamic Japanese football editorial illustration focused on the football topic. Use dramatic stadium atmosphere, action, and strong opposing composition.",

  comparison:
    "A clear left-versus-right comparison composition showing the difference between the two subjects, states, products, or situations described in the news.",

  actually:
    "An explanatory editorial scene built around the central question of what the news is really about. Visually emphasize the key issue or point that people may misunderstand.",

  impact:
    "A visual scene showing who or what is affected by this news and how. Make the real-world impact immediately understandable.",

  daily_summary:
    "A newspaper-style visual collage representing the main aspects of the news. Keep one strong overall composition rather than many unrelated panels.",

  yani_one_liner:
    "YANI NEKO MASTER CHARACTER AND ART STYLE. Use the exact established Yani Neko appearance: petite young adult woman, clearly adult anatomy and adult body proportions, small but proportionate adult head and body, youthful cute face with mature facial structure, pale ash-gray hair with a clearly visible soft pale mint-green tint, with gentle green highlights, thin soft wavy/permed bob, prominent cat ears, cat tail, and extremely large amber-golden cat eyes. Cute clean Japanese anime/comic look with a subtle hand-drawn feeling, thick clean black outlines, soft pale colors, simple clean shapes, light cel-style shading, smooth anime coloring, and exaggerated gag-manga expressions. Keep the artwork polished, cute, and consistent. Use only a slight hand-drawn imperfection; do not make the drawing rough, sketchy, messy, gritty, watercolor-like, or painterly. Make her playful and a little stupid-looking in a lovable way. Keep her visually consistent with the established character. Do NOT change her hair color, hairstyle, eye color, animal type, or age. Do NOT make her realistic, glamorous, photorealistic, fox-like, furry, or childlike in body. Do NOT add character name, logos, captions, headlines, or other text. Create a simple humorous reaction to the news with a very expressive face and pose.",
};

export async function generateXImageBase64(
  newsId: number,
  imagePostType: XImagePostType = "yani_reaction"
) {
  const news = await prisma.news.findUnique({
    where: { id: newsId },
    select: {
      title: true,
      summary: true,
      category: true,
    },
  });

  if (!news) {
    throw new Error("記事が見つかりません");
  }

  const imagePostInstruction =
    imagePostPrompts[imagePostType] ?? imagePostPrompts.yani_reaction;

  const isYaniNekoPost =
    imagePostType === "yani_reaction" ||
    imagePostType === "yani_one_liner";

  const visualStyleInstruction = isYaniNekoPost
    ? "Use the established Yani Neko anime/comic visual style described above."
    : "Use a photorealistic real-world editorial photography style. The image should look like a professionally shot news photograph or realistic editorial photograph, with natural lighting, realistic materials, authentic environments, realistic depth of field, and believable human appearance when people are appropriate. Do NOT use anime, manga, cartoon, comic-book, illustration, cel shading, watercolor, or painterly styles.";

  const isVerticalImagePost = [
    "yani_reaction",
    "today_topic",
    "numbers",
    "breaking",
    "soccer_match",
    "comparison",
    "actually",
    "impact",
    "daily_summary",
    "yani_one_liner",
  ].includes(imagePostType);

  const imageSize = isVerticalImagePost
    ? "1024x1536"
    : "1536x1024";

  const prompt = `
Create a high-quality editorial image for an X post by a Japanese news media account.

News title:
${news.title}

Summary:
${news.summary ?? ""}

Category:
${news.category ?? "ニュース"}

Image concept:
${imagePostInstruction}

Visual style:
${visualStyleInstruction}

Requirements:
- Create a visually striking editorial image that clearly relates to the news topic.
- Do NOT copy the original article thumbnail.
- ABSOLUTELY NO readable text anywhere in the image. No letters, words, numbers, logos, brand names, headlines, captions, signs, labels, watermarks, interface elements, or typography of any kind. Replace all background writing and signage with abstract, unreadable shapes.
- Do NOT invent specific people if the news does not clearly identify them.
- Strong composition that works well on an X timeline.
- For Yani Neko posts, use the established cute anime/comic visual style.
- For all non-Yani Neko posts, use photorealistic real-world editorial photography and absolutely avoid illustration, anime, manga, cartoon, comic-book, watercolor, or painterly styles.
- Use the vertical composition already selected for image-post types.
`;

  const result = await openai.images.generate({
    model: "gpt-image-1.5",
    prompt,
    size: imageSize,
    quality: "medium",
  });

  const image = result.data?.[0]?.b64_json;

  if (!image) {
    throw new Error("画像データを取得できませんでした");
  }

  return {
    base64: image,
    mimeType: "image/png",
  };
}
