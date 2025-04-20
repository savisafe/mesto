'use client';

import { useState, FormEvent, ChangeEvent } from 'react';
import { motion } from 'framer-motion';

export default function Home() {
  const [form, setForm] = useState({ name: '', phone: '' });
  const handleChange = (e: ChangeEvent<HTMLInputElement>) =>
      setForm({ ...form, [e.target.name]: e.target.value });
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    console.log('Consult request:', form);
  };

  return (
      <div className="space-y-32">
        {/* 1. Hero */}
        <section className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-purple-950 to-black text-white text-center px-4">
          <motion.h1
              className="text-4xl md:text-5xl font-bold mb-4"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6 }}
          >
            Управляйте студией красоты без хаоса — всё в одном месте
          </motion.h1>
          <motion.p
              className="max-w-xl mb-8 text-lg text-purple-200"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
          >
            Онлайн-записи, клиентская база, напоминания и финансы в одной системе. Просто, понятно, удобно.
          </motion.p>
          <motion.div
              className="flex flex-col sm:flex-row gap-4 mb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
          >
            <button className="px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg shadow">
              Попробовать бесплатно
            </button>
            <button className="px-6 py-3 bg-transparent border border-purple-600 hover:bg-purple-800 rounded-lg shadow">
              Получить демо
            </button>
          </motion.div>
          <motion.form
              onSubmit={handleSubmit}
              className="flex flex-col sm:flex-row gap-4"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.6 }}
          >
            <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Имя"
                required
                className="px-4 py-2 rounded-lg bg-purple-800 text-white placeholder-purple-400 focus:outline-none"
            />
            <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="Телефон"
                required
                className="px-4 py-2 rounded-lg bg-purple-800 text-white placeholder-purple-400 focus:outline-none"
            />
            <button type="submit" className="px-6 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-white">
              Получить консультацию
            </button>
          </motion.form>
        </section>

        {/* 2. Pain Points */}
        <section className="bg-white py-16 text-black px-4">
          <h2 className="text-3xl font-bold text-center mb-8">Мы понимаем ваши боли</h2>
          <p className="text-center text-lg italic mb-8">Узнаёте себя? Мы тоже так начинали.</p>
          <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {['📓 Записи в тетрадке теряются','📞 Клиенты забывают о визитах','🤯 Сложно понять, кто когда работает','🧾 Нет учёта выручки по мастерам','📱 Неудобно работать со смартфона']
                .map((text,i) => (
                    <div key={i} className="bg-purple-50 p-4 rounded-lg text-center">{text}</div>
                ))}
          </div>
        </section>

        {/* 3. Solutions */}
        <section className="py-16 bg-gradient-to-br from-purple-950 to-black text-white px-4">
          <h2 className="text-3xl font-bold text-center mb-8">Всё, что нужно — уже внутри</h2>
          <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
            {['✅ Онлайн-записи — никаких накладок и путаницы','✅ Клиентская база — история визитов и заметки по каждому','✅ Напоминания — через Telegram или SMS','✅ График сотрудников — каждый видит свой день','✅ Финансовый отчёт — кто сколько заработал и когда','✅ Уведомления и отзывы — клиенту удобно, вам — спокойнее']
                .map((text,i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="text-2xl">✔️</span><p>{text}</p>
                    </div>
                ))}
          </div>
        </section>

        {/* 4. Screenshots */}
        <section className="py-16 bg-white px-4">
          <h2 className="text-3xl font-bold text-center mb-8">Как это выглядит</h2>
          <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {['Календарь','Добавление клиента','Уведомления','Финансовый отчёт']
                .map((label,i) => (
                    <div key={i} className="bg-gray-200 h-48 flex items-center justify-center rounded-lg">{label}</div>
                ))}
          </div>
          <p className="mt-4 text-center italic">Удобно даже с телефона. Протестировано на реальных студиях.</p>
        </section>

        {/* 5. Results */}
        <section className="py-16 bg-gradient-to-br from-purple-950 to-black text-white px-4">
          <h2 className="text-3xl font-bold text-center mb-8">Автоматизация, которую вы почувствуете</h2>
          <div className="max-w-3xl mx-auto space-y-4 text-lg">
            <p>📊 +30% возвратов за счёт напоминаний</p>
            <p>🕒 Экономия до 5 часов в неделю на записи</p>
            <p>💸 Контроль выручки — без лишней бумажной волокиты</p>
            <p>😌 Меньше ошибок, больше довольных клиентов</p>
          </div>
        </section>

        {/* 6. Target Audience */}
        <section className="py-16 bg-white px-4">
          <h2 className="text-3xl font-bold text-center mb-8">Идеально подойдёт, если вы:</h2>
          <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
            {['Владелец студии красоты','Мастер, работающий на себя','Администратор с 1000 задачами в день']
                .map((t,i) => (
                    <div key={i} className="p-4 border border-purple-300 rounded-lg">{t}</div>
                ))}
          </div>
        </section>

        {/* 7. CTA */}
        <section className="py-16 bg-gradient-to-br from-purple-950 to-black text-white text-center px-4">
          <h2 className="text-3xl font-bold mb-4">Всё просто — начните прямо сейчас</h2>
          <p className="mb-8">Оставьте заявку, получите демо-доступ, добавьте сотрудников и услуги, работайте как профи!</p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button className="px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg">Запросить демо</button>
            <button className="px-6 py-3 bg-green-600 hover:bg-green-500 rounded-lg">Начать бесплатно</button>
          </div>
        </section>

        {/* 8. Testimonials */}
        <section className="py-16 bg-white px-4">
          <h2 className="text-3xl font-bold text-center mb-8">Отзывы</h2>
          <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-8">
            <blockquote className="p-6 border-l-4 border-purple-600 italic">
              “Наконец-то не забываю про клиентов! Всё под рукой”<br />
              <span className="font-bold">— Виктория, мастер по бровям</span>
            </blockquote>
          </div>
        </section>

        {/* 9. FAQ */}
        <section className="py-16 bg-gradient-to-br from-purple-950 to-black text-white px-4">
          <h2 className="text-3xl font-bold text-center mb-8">FAQ</h2>
          <div className="max-w-3xl mx-auto space-y-4 text-lg">
            <div><strong>Это платно?</strong> — MVP бесплатен на старте</div>
            <div><strong>Подойдёт для одного мастера?</strong> — Конечно!</div>
            <div><strong>Как напоминания приходят?</strong> — Telegram или SMS</div>
          </div>
        </section>

        {/* 10. Bottom Form */}
        <section className="py-16 bg-white px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Готовы попробовать? Оставьте заявку</h2>
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 justify-center max-w-lg mx-auto">
            <input name="name" value={form.name} onChange={handleChange} placeholder="Имя" required
                   className="flex-1 px-4 py-2 rounded-lg bg-gray-100 text-black" />
            <input name="phone" value={form.phone} onChange={handleChange} placeholder="Телефон" required
                   className="flex-1 px-4 py-2 rounded-lg bg-gray-100 text-black" />
            <button type="submit" className="px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg text-white">Попробовать</button>
          </form>
        </section>
      </div>
  );
}
