import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

// Подключаем Upstash к твоим ключам от Vercel KV
const redis = new Redis({
  url: process.env.KV_REST_API_URL || '',
  token: process.env.KV_REST_API_TOKEN || '',
});

const SYSTEM_PROMPT = `Ты — прямолинейный психолог. Твоя задача — глубоко анализировать переписки.

Твои правила:
1. Пиши СТРОГО на русском языке. Никаких английских слов в значениях полей.
2. Если в отношениях всё хорошо, так и пиши: не выдумывай токсичность там, где её нет, будь честен и объективен.
3. Если есть реальная дичь — разноси её дерзко, вскрывай манипуляции и защитные механизмы.
4. Тип привязанности используй строго один из трех: "Тревожный", "Избегающий" или "Надежный".
5. Красные флаги: если всё отлично, напиши "Красных флагов нет". Если есть — бери цитату из чата и коротко, но максимально точечно объясняй логику манипуляции по формуле: "<Цитата из чата> - <Твой разбор>".
6. Вердикт: 2-3 честных, глубоких предложения о сути их отношений (либо поддержка, либо полный разнос).
7. dynamics (Динамика): Оцени, как меняется тон общения.
8. patterns (Паттерны): Массив из 2-3 психологических терминов, которые ты заметил в их поведении (например, ["Газлайтинг", "Обесценивание", "Избегание"]). Если всё здорово, пиши ["Здоровая коммуникация", "Эмпатия"].
9. suggestedReplies (Как ответить): Дай 3 варианта ответа на ПОСЛЕДНЮЮ реплику партнера в чате. Стили: "Мягкий", "Жесткий", "Дипломатичный".

Формат вывода — строго JSON:
{
  "toxicityScore": <число 0-100>,
  "mainVibe": "<Заголовок из 2-3 слов>",
  "attachmentStyle": "<Тревожный, Избегающий или Надежный>",
  "compatibilityScore": <число 0-100>,
  "redFlags": [
    "<Цитата из чата> - <Разбор манипуляции>"
  ],
  "verdict": "<Честный психологический вердикт>",
  "forecast": "<Прогноз на полгода одной емкой фразой>",
  "advice": "<Дерзкий совет к действию>",
  "dynamics": "<Анализ динамики отношений>",
  "patterns": ["<Паттерн 1>", "<Паттерн 2>"],
  "suggestedReplies": [
    { "style": "Мягкий", "text": "<Текст ответа>" },
    { "style": "Жесткий", "text": "<Текст ответа>" },
    { "style": "Дипломатичный", "text": "<Текст ответа>" }
  ]
}

СТРОГО JSON БЕЗ ЛИШНЕГО ТЕКСТА.`;

export async function POST(req: Request) {
  try {
    const { userId, isPremium = false } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'ID пользователя не передан' }, { status: 400 });
    }

    // Читаем из Upstash
    let chatData: string | null = await redis.get(`chat:${userId}`);

    if (!chatData || chatData.length < 20) {
      return NextResponse.json({ error: 'Вы не переслали сообщения боту или история слишком короткая!' }, { status: 400 });
    }

    if (!isPremium && chatData.length > 10000) {
      chatData = chatData.substring(0, 10000);
    }

    const apiKey = process.env.APIYI_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API ключ не настроен' }, { status: 500 });
    }

    const response = await fetch('https://api.apiyi.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: chatData }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
       return NextResponse.json({ error: 'Ошибка провайдера нейросети' }, { status: 500 });
    }

    const data = await response.json();
    const resultText = data.choices[0].message.content;
    
    // Очищаем базу после успешного анализа
    await redis.del(`chat:${userId}`);

    return NextResponse.json(JSON.parse(resultText));

  } catch (error) {
    console.error("Server Analysis Error:", error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}