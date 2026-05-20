import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL || '',
  token: process.env.KV_REST_API_TOKEN || '',
});

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const APP_URL = 'https://psych-test-app-jet.vercel.app'; 

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. ПОДТВЕРЖДЕНИЕ ПЛАТЕЖА (Telegram требует дать добро перед списыванием звезд)
    if (body.pre_checkout_query) {
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerPreCheckoutQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pre_checkout_query_id: body.pre_checkout_query.id,
          ok: true
        })
      });
      return NextResponse.json({ ok: true });
    }

    // 2. УСПЕШНАЯ ОПЛАТА
    if (body.message && body.message.successful_payment) {
      const userId = body.message.from.id;
      
      // Записываем в базу "Премиум-билетик" на 1 час
      await redis.set(`premium:${userId}`, 'true', { ex: 3600 });
      
      await sendTelegramMessage(userId, 
        `⭐️ <b>Оплата прошла успешно!</b>\n\nЯ готов проанализировать всю вашу историю. Открой приложение и нажми кнопку запуска!`, 
        {
          reply_markup: {
            inline_keyboard: [[ { text: "🚀 Запустить премиум-разбор", web_app: { url: APP_URL } } ]]
          }
        }
      );
      return NextResponse.json({ ok: true });
    }

    // 3. ОБРАБОТКА ТЕКСТОВЫХ СООБЩЕНИЙ (Склейка переписки)
    if (body.message && body.message.text) {
      const chatId = body.message.chat.id;
      const text = body.message.text;
      const userId = body.message.from.id;

      if (text === '/start') {
        await sendTelegramMessage(chatId, 
          `🔥 <b>Привет! Я ИИ-Психолог.</b>\n\n` +
          `Я умею вскрывать скрытые манипуляции, токсичность и оценивать реальную совместимость пар.\n\n` +
          `👉 <b>Что нужно сделать:</b> просто перешли мне сообщения из диалога с партнером. Чем больше, тем точнее анализ!`,
          {
            reply_markup: {
              inline_keyboard: [[ { text: "🚀 Открыть анализатор", web_app: { url: APP_URL } } ]]
            }
          }
        );
        return NextResponse.json({ ok: true });
      }

      let author = 'Партнер';
      if (body.message.forward_from?.id === userId) {
        author = 'Я'; 
      } else if (body.message.forward_sender_name || body.message.forward_from) {
        author = 'Партнер'; 
      } else if (!body.message.forward_date) {
        author = 'Я'; 
      }

      const cleanText = `[${author}]: ${text}\n`;
      
      await redis.append(`chat:${userId}`, cleanText);
      await redis.expire(`chat:${userId}`, 86400); 

      const lock = await redis.set(`lock:${userId}`, 'locked', { nx: true, ex: 3 });

      if (lock) {
        const replyText = `📥 <b>Сообщения получены!</b>\n\nЯ аккуратно склеиваю их в фоне. Если хочешь, можешь докинуть еще.\n\nКак только перешлешь всё нужное — жми кнопку ниже для старта ИИ-разбора.`;
        await sendTelegramMessage(chatId, replyText, {
          reply_markup: {
            inline_keyboard: [[ { text: `🔥 Запустить разбор`, web_app: { url: APP_URL } } ]]
          }
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Bot Error:", error);
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}

async function sendTelegramMessage(chatId: number, text: string, extra = {}) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: 'HTML', ...extra })
  });
}