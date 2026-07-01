const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const OpenAI = require('openai');
const P = require('pino');
const http = require('http');

// سيرفر وهمي عشان Render ما يوقف البوت
http.createServer((req, res) => res.end('Bot running')).listen(3000);

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1'
});

const conversations = {};

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  const sock = makeWASocket({
    auth: state,
    logger: P({ level: 'silent' }),
    printQRInTerminal: false
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'open') {
      console.log('متصل بنجاح ✅');
    }
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) startBot();
    }
  });

  if (!state.creds.registered) {
    await new Promise(r => setTimeout(r, 5000));
    const number = process.env.PHONE_NUMBER;
    const code = await sock.requestPairingCode(number);
    console.log('===== كود الربط =====');
    console.log(code);
    console.log('=====================');
  }

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
    const groupId = msg.key.remoteJid;
    const quotedParticipant = msg.message.extendedTextMessage?.contextInfo?.participant;

    if (text.startsWith('!عمي')) {
      const question = text.replace('!عمي', '').trim();
      if (!question) return;
      conversations[groupId] = [
        {
          role: 'system',
          content: 'أنت شخصية اسمها عمك حسام، شخص ليبي عامي مضحك وذكي وعارف كل شي في السياسة والرياضة والطب والذكاء الاصطناعي. تتكلم بالعامية الليبية وتهدرز. أول ما حد يكلمك ترد بـ "معاك عمك حسام الأعظم يتلب شن تبي؟" وبعدها ترد بشكل مضحك. لو حد سبك سبه بدون تردد.'
        },
        { role: 'user', content: question }
      ];
      try {
        const completion = await groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: conversations[groupId],
          max_tokens: 500
        });
        const answer = completion.choices[0].message.content;
        conversations[groupId].push({ role: 'assistant', content: answer });
        await sock.sendMessage(groupId, { text: answer }, { quoted: msg });
      } catch (e) {
        console.log('خطأ:', e.message);
      }
      return;
    }

    if (quotedParticipant && conversations[groupId]?.length > 0) {
      const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
      if (quotedParticipant === botJid || quotedParticipant === sock.user.id) {
        if (!text) return;
        conversations[groupId].push({ role: 'user', content: text });
        try {
          const completion = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: conversations[groupId],
            max_tokens: 500
          });
          const answer = completion.choices[0].message.content;
          conversations[groupId].push({ role: 'assistant', content: answer });
          await sock.sendMessage(groupId, { text: answer }, { quoted: msg });
        } catch (e) {
          console.log('خطأ:', e.message);
        }
      }
    }
  });
}

startBot();
