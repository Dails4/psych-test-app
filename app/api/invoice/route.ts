import { NextResponse } from 'next/server';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Глубокий разбор отношений',
        description: 'ИИ-Психолог проанализирует до 100 000 символов вашей переписки, найдет скрытые паттерны и даст прогноз.',
        payload: `premium_${userId}`, // Внутренняя метка для нас
        provider_token: "", // Для Telegram Stars токен провайдера должен быть пустой строкой
        currency: 'XTR',
        prices: [{ label: 'Глубокий разбор', amount: 50 }] // Цена: 50 Звезд
      })
    });

    const data = await response.json();

    if (!data.ok) {
      console.error("Invoice Error:", data);
      throw new Error('Failed to create invoice');
    }

    return NextResponse.json({ url: data.result });
  } catch (error) {
    console.error("Payment Route Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}