import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { userId, image } = await req.json();

    if (!userId || !image) {
      return NextResponse.json({ error: 'Не хватает данных' }, { status: 400 });
    }

    // Очищаем Base64 строку от метаданных и превращаем в буфер
    const base64Data = image.replace(/^data:image\/png;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    // Формируем форм-дату для Telegram API
    const formData = new FormData();
    const blob = new Blob([buffer], { type: 'image/png' });
    formData.append('photo', blob, 'result.png');
    formData.append('chat_id', userId.toString());
    
    // ⚠️ ЗАМЕНИ ССЫЛКУ НИЖЕ НА РЕАЛЬНЫЙ ЮЗЕРНЕЙМ ТВОЕГО БОТА
    const botLink = 'https://t.me/my_psycho_bot'; 
    
    formData.append('caption', `🔥 Мой разбор отношений от ИИ-Психолога!\n\n👉 Сделай свой разбор тут: ${botLink}`);

    const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendPhoto`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Telegram API Error Details:", errorData);
      throw new Error('Telegram API error');
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Share API Route Error:", error);
    return NextResponse.json({ error: 'Внутренняя ошибка' }, { status: 500 });
  }
}