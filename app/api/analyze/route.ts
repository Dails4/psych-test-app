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
4. Тип привязанности: "Тревожный", "Избегающий" или "Надежный".
5. Красные флаги: если всё отлично, напиши "Красных флагов нет". Если есть — "<Цитата> - <Разбор>".
6. Вердикт: 2-3 честных предложения о сути их отношений.
7. dynamics: Как меняется тон общения.
8. patterns: Массив из 2-3 психологических терминов (например, ["Газлайтинг", "Избегание"]).
9. suggestedReplies: Дай 3 варианта ответа на ПОСЛЕДНЮЮ реплику [Партнер] в стиле общения [Я]. Стили: "Мягкий", "Жесткий", "Дипломатичный".
10. hiddenMotives (Скрытые мотивы): Выбери 1-2 неоднозначные фразы [Партнер] и переведи их истинный психологический смысл (пассивная агрессия, страх, избегание). Формат: "<Цитата> - <Истинный мотив>".
11. detailedCompatibility: Оцени 3 параметра совместимости от 0 до 100: emotional (эмоциональная), conflict (в ссорах), dominance (равноправие).

Формат вывода — строго JSON:
{
  "toxicityScore": 0,
  "mainVibe": "...",
  "attachmentStyle": "...",
  "compatibilityScore": 0,
  "redFlags": ["..."],
  "verdict": "...",
  "forecast": "...",
  "advice": "...",
  "dynamics": "...",
  "patterns": ["..."],
  "hiddenMotives": ["..."],
  "detailedCompatibility": {
    "emotional": 0,
    "conflict": 0,
    "dominance": 0
  },
  "suggestedReplies": [
    { "style": "Мягкий", "text": "..." },
    { "style": "Жесткий", "text": "..." },
    { "style": "Дипломатичный", "text": "..." }
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

    const isPremium = await redis.get(`premium:${userId}`);
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
    const parsedResult = JSON.parse(data.choices[0].message.content);
    
    await redis.del(`chat:${userId}`);
    
    // ✅ Возвращаем результат вместе со статусом подписки
    return NextResponse.json({ ...parsedResult, isPremium: !!isPremium });

  } catch (error) {
    console.error("Server Analysis Error:", error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}