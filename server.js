const express = require('express');
const axios = require('axios');
const cron = require('node-cron');

const app = express();
app.use(express.json());

// Log ALL requests for debugging
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.path}`);
  next();
});

const SYSTEM = `You are AXIOM, the autonomous AI agent for Assistance Ghana, a social impact organization in Ghana. You manage all communications and social media independently. Be warm, professional, community-focused. Use English with occasional Twi phrases like "Akwaaba" (welcome) or "Medaase" (thank you). For urgent matters like media requests, partnerships or emergencies, start your reply with [ESCALATE].`;

// ── Ask AXIOM via Groq
async function askAxiom(prompt) {
  const r = await axios.post(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      model: 'llama3-8b-8192',
      max_tokens: 500,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: prompt }
      ]
    },
    {
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return r.data.choices[0].message.content;
}

// ── Send WhatsApp message
async function sendWhatsApp(to, message) {
  await axios.post(
    `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: message }
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    }
  );
}

// ── Post to Facebook
async function postFacebook(message) {
  await axios.post(
    `https://graph.facebook.com/v18.0/${process.env.META_PAGE_ID}/feed`,
    {
      message,
      access_token: process.env.META_PAGE_ACCESS_TOKEN
    }
  );
  console.log('✅ Posted to Facebook:', message.substring(0, 60));
}

// ── Health check
app.get('/', (req, res) => {
  res.send('⚡ AXIOM is online - Assistance Ghana Agent');
});

// ── WhatsApp Webhook Verification
app.get('/webhook/whatsapp', (req, res) => {
  console.log('🔍 Webhook verification request received');
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log('✅ Webhook verified!');
    res.send(challenge);
  } else {
    console.log('❌ Webhook verification failed');
    res.sendStatus(403);
  }
});

// ── Receive WhatsApp messages
app.post('/webhook/whatsapp', async (req, res) => {
  console.log('📩 Webhook POST received');
  res.sendStatus(200);
  try {
    const entry = req.body?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const msg = value?.messages?.[0];
    if (!msg) {
      console.log('No message in payload');
      return;
    }
    const from = msg.from;
    const text = msg.text?.body || '';
    console.log(`💬 Message from ${from}: "${text}"`);
    const reply = await askAxiom(
      `WhatsApp message from ${from}: "${text}". Reply on behalf of Assistance Ghana.`
    );
    console.log(`🤖 AXIOM reply: ${reply.substring(0, 80)}`);
    if (reply.startsWith('[ESCALATE]')) {
      await sendWhatsApp(
        process.env.OWNER_PHONE,
        `🚨 AXIOM ESCALATION:\nFrom: ${from}\nMessage: "${text}"\nSuggested: ${reply.replace('[ESCALATE]', '')}`
      );
      console.log('🚨 Escalated to owner');
    } else {
      await sendWhatsApp(from, reply);
      console.log('✅ Reply sent');
    }
  } catch (e) {
    console.error('❌ Error:', e.message);
  }
});

// ── Auto-post every 6 hours
cron.schedule('0 */6 * * *', async () => {
  try {
    console.log('⏰ Auto-post triggered');
    const post = await askAxiom(
      'Create an engaging Facebook post for Assistance Ghana. Community-focused, inspiring, relevant to Ghana. Just return the post text.'
    );
    await postFacebook(post);
  } catch (e) {
    console.error('Auto-post error:', e.message);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`⚡ AXIOM online on port ${PORT}`);
});  res.sendStatus(200);
});

// ── Ask AXIOM
async function askAxiom(prompt) {
  const r = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    system: SYSTEM,
    messages: [{ role: 'user', content: prompt }]
  });
  return r.content[0].text;
}

// ── Send WhatsApp
async function sendWhatsApp(to, message) {
  await axios.post(
    `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    { messaging_product: 'whatsapp', to, type: 'text', text: { body: message } },
    { headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` } }
  );
}

// ── Post to Facebook Page
async function postFacebook(message) {
  await axios.post(
    `https://graph.facebook.com/v18.0/${process.env.META_PAGE_ID}/feed`,
    { message, access_token: process.env.META_PAGE_ACCESS_TOKEN }
  );
  console.log('Posted to Facebook:', message.substring(0, 60));
}

// ── Auto-post every 6 hours
cron.schedule('0 */6 * * *', async () => {
  try {
    const post = await askAxiom('Create an engaging Facebook post for Assistance Ghana. Community-focused, inspiring, relevant to Ghana. Just return the post text, no explanation.');
    await postFacebook(post);
  } catch (e) { console.error('Auto-post error:', e.message); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`⚡ AXIOM online on port ${PORT}`);
});
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.path}`);
  next();
});
