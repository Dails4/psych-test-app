import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL || '',
  token: process.env.KV_REST_API_TOKEN || '',
});

const SYSTEM_PROMPT = `Ты — прямолинейный психолог. Твоя задача — глубоко анализировать переписки.
ВНИМАНИЕ: Диалог размечен тегами [Я] (это сообщения пользователя) и [Партнер] (это сообщения собеседника).

Твои правила:
1. Пиши СТРОГО на русском языке. Никаких английских слов в значениях полей.
2. Если в отношениях всё хорошо, так и пиши: не выдумывай токсичность там, где её нет, будь честен и объективен.
3. Если есть реальная дичь — разноси её дерзко, вскрывай манипуляции и защитные механизмы.
4. Тип привязанности используй строго один из трех: "Тревожный", "Избегающий" или "Надежный".
5. Красные флаги: если всё отлично, напиши "Красных флагов нет". Если есть — бери цитату из чата и коротко объясняй логику манипуляции по формуле: "<Цитата> - <Твой разбор>".
6. Вердикт: 2-3 честных, глубоких предложения о сути их отношений (либо поддержка, либо полный разнос).
7. dynamics: Оцени, как меняется тон общения.
8. patterns: Массив из 2-3 психологических терминов, которые ты заметил в их поведении (например, ["Газлайтинг", "Избегание"]).
9. suggestedReplies: Дай 3 варианта ответа на ПОСЛЕДНЮЮ реплику [Партнер]. Стили: "Мягкий", "Жесткий", "Дипломатичный".
ВАЖНОЕ ПРАВИЛО ДЛЯ ОТВЕТОВ: Обязательно проанализируй стиль общения [Я]. Копируй его манеру писать! Если [Я] пишет без заглавных букв, без точек, использует мат или сленг — твои варианты ответов ДОЛЖНЫ быть написаны точно в таком же стиле. Сделай так, чтобы текст выглядел человечным, как будто его написал сам [Я], а не искусственный интеллект.

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
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'ID пользователя не передан' }, { status: 400 });
    }

    let chatData: string | null = await redis.get(`chat:${userId}`);

    if (!chatData || chatData.length < 20) {
      return NextResponse.json({ error: 'Вы не переслали сообщения боту или история слишком короткая!' }, { status: 400 });
    }

    // Проверяем, есть ли у юзера купленный премиум
    const isPremium = await redis.get(`premium:${userId}`);
    
    // Лимиты: 100 000 для платных, 10 000 для бесплатных
    const limit = isPremium ? 100000 : 10000;

    if (chatData.length > limit) {
      chatData = chatData.substring(0, limit);
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
    
    // Очищаем историю чата
    await redis.del(`chat:${userId}`);
    // Если разбор был премиальным, сжигаем билет, чтобы за следующий раз юзер снова платил
    if (isPremium) {
      await redis.del(`premium:${userId}`);
    }

    return NextResponse.json(JSON.parse(resultText));

  } catch (error) {
    console.error("Server Analysis Error:", error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}