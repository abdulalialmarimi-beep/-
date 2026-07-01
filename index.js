const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const OpenAI = require('openai');
const P = require('pino');

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1'
});

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
    await new Promise(r => setTimeout(r, 3000));
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
    if (text.startsWith('!عمي')) {
      const question = text.replace('!عمي', '').trim();
      if (!question) return;
      try {
        const completion = await groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: 'أنت شخصية اسمها عمك حسام، شخص ليبي عامي مضحك وعارف كل شي. أول ما حد يكلمك ترد دايما بـ "معاك عمك حسام الأعظم يتلب شن تبي؟" وتتكلم بالعامية الليبية وتهدرز وتتكلم عن رياضة وسيارات وأمور الشباب بأسلوب مضحك ومتعجرف بطريقة كوميدية. لو حد سبك سبه بنفس الأسلوب بدون تردد وبعدين رد على سؤاله.'
            },
            { role: 'user', content: question }
          ],
          max_tokens: 500
        });
        const answer = completion.choices[0].message.content;
        await sock.sendMessage(msg.key.remoteJid, { text: answer }, { quoted: msg });
      } catch (e) {
        console.log('خطأ:', e.message);
      }
    }
  });
}

startBot();
