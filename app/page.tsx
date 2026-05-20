'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, Shield, Zap, Activity, RefreshCcw, Share, HeartCrack, TrendingUp, 
  Lightbulb, MessageSquareQuote, Fingerprint 
} from 'lucide-react';

const WebApp = typeof window !== 'undefined' ? require('@twa-dev/sdk').default : null;

const LOADING_MESSAGES = [
  "Прогреваем ИИ-психолога...",
  "Читаем пересланные сообщения...",
  "Ищем скрытую пассивную агрессию...",
  "Формируем психологический профиль..."
];

interface AnalysisResult {
  toxicityScore: number;
  mainVibe: string;
  attachmentStyle: string;
  compatibilityScore: number;
  redFlags: string[];
  verdict: string;
  forecast: string;
  advice: string;
  dynamics: string;
  patterns: string[];
  suggestedReplies: { style: string; text: string }[];
}

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  const [screen, setScreen] = useState<'welcome' | 'loading' | 'result'>('welcome');
  const [loadingText, setLoadingText] = useState(LOADING_MESSAGES[0]);
  const [resultData, setResultData] = useState<AnalysisResult | null>(null);
  const [tgUserId, setTgUserId] = useState<number | null>(null);

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined' && WebApp?.initData) {
      WebApp.ready();
      WebApp.expand();
      
      const user = WebApp.initDataUnsafe?.user;
      if (user?.id) {
        setTgUserId(user.id);
      }
    }
  }, []);

  const haptic = (style: 'light' | 'medium' | 'heavy') => {
    if (typeof window !== 'undefined' && WebApp?.initData) {
      WebApp.HapticFeedback.impactOccurred(style);
    }
  };

  const startOver = () => {
    haptic('medium');
    setResultData(null);
    setScreen('welcome');
    if (typeof window !== 'undefined') {
      WebApp.close(); 
    }
  };

  const handleShare = () => {
    haptic('light');
    if (resultData) {
      // ⚠️ ВАЖНО: Замени "my_psycho_bot" на реальный юзернейм твоего бота
      const botUrl = "https://t.me/my_psycho_bot"; 
      
      const text = `🔥 Мой результат у ИИ-Психолога:\n\n` +
                   `Уровень токсичности: ${resultData.toxicityScore}/100\n` +
                   `Диагноз: ${resultData.mainVibe}\n\n` +
                   `Проверь свою переписку 👇`;
                   
      const shareLink = `https://t.me/share/url?url=${encodeURIComponent(botUrl)}&text=${encodeURIComponent(text)}`;
      
      if (typeof window !== 'undefined') {
        if (WebApp?.initData && WebApp.platform !== 'unknown') {
          try {
            WebApp.openTelegramLink(shareLink);
          } catch (e) {
            window.open(shareLink, '_blank');
          }
        } else {
          window.open(shareLink, '_blank');
        }
      }
    }
  };

  const handleSendReplyToChat = (replyText: string) => {
    haptic('medium');
    const shareLink = `https://t.me/share/url?url=&text=${encodeURIComponent(replyText)}`;
    
    if (typeof window !== 'undefined') {
      if (WebApp?.initData && WebApp.platform !== 'unknown') {
        try {
          WebApp.openTelegramLink(shareLink);
        } catch (e) {
          window.open(shareLink, '_blank');
        }
      } else {
        window.open(shareLink, '_blank');
      }
    }
  };

  const handleAnalyze = async () => {
    if (!tgUserId) {
      alert('Ошибка авторизации Telegram. Откройте приложение внутри бота.');
      return;
    }

    haptic('heavy');
    setScreen('loading');
    
    let msgIndex = 0;
    const interval = setInterval(() => {
      msgIndex++;
      if (msgIndex < LOADING_MESSAGES.length) {
        setLoadingText(LOADING_MESSAGES[msgIndex]);
      }
    }, 1500);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: tgUserId }),
      });

      const data = await response.json();
      clearInterval(interval);

      if (response.ok) {
        setResultData(data);
        haptic('heavy');
        setScreen('result');
      } else {
        alert(data.error || 'Произошла ошибка при анализе данных.');
        setScreen('welcome');
      }
    } catch (error) {
      clearInterval(interval);
      alert('Ошибка соединения. Проверьте подключение к интернету.');
      setScreen('welcome');
    }
  };

  if (!isMounted) return null;

  return (
    <main className="min-h-[100dvh] relative overflow-x-hidden flex flex-col items-center p-6 bg-[#0a0a0f] text-[#f0eeff]">
      <div className="fixed top-[-100px] right-[-80px] w-[300px] h-[300px] bg-[#7c5cfc]/20 rounded-full blur-[80px] pointer-events-none animate-pulse" />
      <div className="fixed bottom-[20%] left-[-100px] w-[250px] h-[250px] bg-[#ff6b9d]/20 rounded-full blur-[80px] pointer-events-none animate-pulse" style={{ animationDelay: '2s' }} />

      <AnimatePresence mode="wait">
        
        {screen === 'welcome' && (
          <motion.div key="welcome" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="z-10 flex flex-col items-center justify-center text-center w-full max-w-md my-auto h-full flex-1">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#7c5cfc] to-[#ff6b9d] p-[2px] mb-8 shadow-[0_0_48px_rgba(124,92,252,0.5)]">
              <div className="w-full h-full bg-[#0a0a0f] rounded-full flex items-center justify-center">
                <Brain className="w-10 h-10 text-white" />
              </div>
            </div>
            
            <h1 className="text-4xl font-extrabold mb-4 bg-gradient-to-br from-white via-[#c77dff] to-[#ff6b9d] bg-clip-text text-transparent tracking-tight">
              Psychological<br />Passport
            </h1>
            
            <p className="text-[#a09cc0] mb-8 text-[15px] leading-relaxed max-w-[300px]">
              Если ты уже переслал сообщения нашему боту, жми кнопку ниже для мгновенного глубокого ИИ-разбора ваших отношений.
            </p>
            
            <div className="flex gap-2 mb-8 flex-wrap justify-center">
              <div className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[12px] text-[#a09cc0] flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-[#06d6a0]" /> 30 секунд</div>
              <div className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[12px] text-[#a09cc0] flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-[#06d6a0]" /> Анонимно</div>
            </div>
            
            <button onClick={handleAnalyze} className="w-full py-4 bg-gradient-to-r from-[#7c5cfc] to-[#ff6b9d] rounded-2xl text-white font-bold text-lg shadow-[0_8px_32px_rgba(124,92,252,0.4)] transition-transform active:scale-95">
              🔥 Сделать ИИ-разбор →
            </button>
          </motion.div>
        )}

        {screen === 'loading' && (
          <motion.div key="loading" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1 }} className="z-10 flex flex-col items-center justify-center text-center w-full max-w-md my-auto h-full flex-1">
            <div className="relative w-32 h-32 mb-8 flex items-center justify-center">
              <div className="absolute inset-0 border-4 border-[#7c5cfc]/30 rounded-full animate-[spin_3s_linear_infinite]" />
              <div className="absolute inset-0 border-4 border-transparent border-t-[#ff6b9d] rounded-full animate-[spin_1.5s_ease-in-out_infinite]" />
              <Brain className="w-12 h-12 text-[#c77dff] animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Анализируем...</h2>
            <p className="text-[#a09cc0] h-6 transition-all duration-300">{loadingText}</p>
          </motion.div>
        )}

        {screen === 'result' && resultData && (
          <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="z-10 flex flex-col w-full max-w-md h-full flex-1 pt-4 pb-36">
            
            <div className="text-center mb-8">
              <h2 className="text-3xl font-extrabold bg-gradient-to-br from-white to-[#c77dff] bg-clip-text text-transparent leading-tight">{resultData.mainVibe}</h2>
              <div className="text-[#a09cc0] mt-2 text-sm">{resultData.attachmentStyle} тип привязанности</div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between">
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#ff4757]/10 rounded-full blur-3xl" />
                <h3 className="text-xs text-[#a09cc0] uppercase tracking-wider mb-4 font-bold relative z-10">Токсичность</h3>
                <div className="flex items-baseline gap-1 relative z-10">
                  <div className={`text-4xl font-black ${resultData.toxicityScore > 50 ? 'text-[#ff4757]' : 'text-[#06d6a0]'}`}>{resultData.toxicityScore}</div>
                  <div className="text-sm text-[#a09cc0]">/100</div>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between">
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#06d6a0]/10 rounded-full blur-3xl" />
                <h3 className="text-xs text-[#a09cc0] uppercase tracking-wider mb-4 font-bold relative z-10">Совместимость</h3>
                <div className="flex items-baseline gap-1 relative z-10">
                  <div className={`text-4xl font-black ${resultData.compatibilityScore < 50 ? 'text-[#ff4757]' : 'text-[#06d6a0]'}`}>{resultData.compatibilityScore}</div>
                  <div className="text-sm text-[#a09cc0]">%</div>
                </div>
              </div>
            </div>

            {resultData.patterns && resultData.patterns.length > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 mb-4">
                <div className="text-xs text-[#a09cc0] uppercase tracking-wider mb-4 font-bold flex items-center gap-2"><Fingerprint className="w-4 h-4 text-[#c77dff]"/> Паттерны общения</div>
                <div className="flex flex-wrap gap-2">
                  {resultData.patterns.map((pattern, idx) => (
                    <div key={idx} className="bg-white/10 text-white/90 text-sm px-4 py-2 rounded-xl border border-white/5">{pattern}</div>
                  ))}
                </div>
              </div>
            )}

            {resultData.dynamics && (
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 mb-4">
                <div className="text-xs text-[#a09cc0] uppercase tracking-wider mb-3 font-bold flex items-center gap-2"><Activity className="w-4 h-4 text-[#06d6a0]"/> Динамика отношений</div>
                <div className="text-[15px] text-[#f0eeff] leading-relaxed">{resultData.dynamics}</div>
              </div>
            )}

            {/* БЛОК С КРАСНЫМИ ФЛАГАМИ (не показываем, если флагов нет) */}
            {resultData.redFlags && resultData.redFlags.length > 0 && !resultData.redFlags.includes("Красных флагов нет") && (
              <div className="bg-white/5 border border-[#ff4757]/20 rounded-3xl p-6 mb-4">
                <div className="text-xs text-[#ff4757] uppercase tracking-wider mb-5 font-bold">Красные флаги 🚩</div>
                <div className="space-y-4">
                  {resultData.redFlags.map((flag, idx) => {
                    const parts = flag.split(' - ');
                    const quote = parts[0];
                    const explanation = parts.length > 1 ? parts.slice(1).join(' - ') : '';
                    return (
                      <div key={idx} className="border-b border-white/5 pb-4 last:border-0 last:pb-0">
                        <div className="text-[15px] font-bold text-white mb-2">«{quote}»</div>
                        {explanation && <div className="text-[14px] text-[#a09cc0] leading-relaxed">{explanation}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ПЕРЕВОДЧИК С КНОПКАМИ ОТПРАВКИ */}
            {resultData.suggestedReplies && resultData.suggestedReplies.length > 0 && (
              <div className="bg-gradient-to-br from-[#7c5cfc]/10 to-[#ff6b9d]/5 border border-[#7c5cfc]/30 rounded-3xl p-6 mb-4">
                <div className="text-xs text-[#c77dff] uppercase tracking-wider mb-5 font-bold flex items-center gap-2"><MessageSquareQuote className="w-4 h-4"/> Как ответить на последнее сообщение</div>
                <div className="space-y-3">
                  {resultData.suggestedReplies.map((reply, idx) => (
                    <div key={idx} className="bg-[#0a0a0f]/50 p-4 rounded-2xl border border-white/5 relative group">
                      <div className="text-[11px] font-bold text-[#c77dff] uppercase mb-2">{reply.style}</div>
                      <div className="text-[15px] text-white/90 leading-relaxed pr-10">{reply.text}</div>
                      
                      {/* Кнопка отправки прямо в чат */}
                      <button 
                        onClick={() => handleSendReplyToChat(reply.text)}
                        className="absolute right-4 bottom-4 w-8 h-8 bg-white/10 hover:bg-[#7c5cfc] rounded-full flex items-center justify-center transition-colors active:scale-90"
                        title="Отправить в чат"
                      >
                        <span className="text-sm">✈️</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {resultData.verdict && (
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 mb-4">
                <div className="text-xs text-[#a09cc0] uppercase tracking-wider mb-4 font-bold flex items-center gap-2"><HeartCrack className="w-4 h-4 text-[#c77dff]"/> Вердикт психолога</div>
                <div className="italic text-[16px] text-[#f0eeff] leading-relaxed">"{resultData.verdict}"</div>
              </div>
            )}

            <div className="space-y-4 mb-4">
              {resultData.forecast && (
                <div className="bg-[#7c5cfc]/10 border border-[#7c5cfc]/30 rounded-3xl p-6">
                  <div className="text-xs text-[#c77dff] uppercase tracking-wider mb-3 font-bold flex items-center gap-2"><TrendingUp className="w-4 h-4"/> Прогноз на полгода</div>
                  <div className="text-[15px] text-[#f0eeff] leading-relaxed">{resultData.forecast}</div>
                </div>
              )}
              {resultData.advice && (
                <div className="bg-[#06d6a0]/10 border border-[#06d6a0]/30 rounded-3xl p-6">
                  <div className="text-xs text-[#06d6a0] uppercase tracking-wider mb-3 font-bold flex items-center gap-2"><Lightbulb className="w-4 h-4"/> Что делать прямо сейчас</div>
                  <div className="text-[15px] text-[#f0eeff] leading-relaxed">{resultData.advice}</div>
                </div>
              )}
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-[#0a0a0f]/95 backdrop-blur-xl flex gap-3 justify-center border-t border-white/5 z-50">
              <button onClick={startOver} className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform text-white">
                <RefreshCcw className="w-5 h-5" /> Начать заново
              </button>
              <button onClick={handleShare} className="flex-[2] py-4 bg-gradient-to-r from-[#7c5cfc] to-[#ff6b9d] rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform text-white">
                <Share className="w-5 h-5" /> Поделиться
              </button>
            </div>
            
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}