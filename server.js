express = require('express');
const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk');
const cron = require('node-cron');

const app = express();
app.use(express.json());

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `You are AXIOM, the autonomous AI agent for Assistance Ghana, a social impact organization in Ghana. You manage all communications and social media independently. Be warm, professional, community-focused. Use English with occasional Twi phrases. For urgent matters like media, partnerships or emergencies, start your reply with [ESCALATE].`;

// ── Health check
app.get('/', (req, res) => res.send('AXIOM is online ⚡'));

// ── WhatsApp Webhook Verification
app.get('/webhook/whatsapp', (req, res) => {
  if (req.query['hub.verify_token'] === process.env.WHATSAPP_VERIFY_TOKEN) {
    res.send(req.query['hub.challenge']);
  } else res.sendStatus(403);
});

// ── Receive & handle WhatsApp messages
app.post('/webhook/whatsapp', async (req, res) => {
  try {
    const msg = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!msg) return res.sendStatus(200);
    const from = msg.from;
    const text = msg.text?.body || '';
    const reply = await askAxiom(`WhatsApp message from ${from}: "${text}". Reply on behalf of Assistance Ghana.`);
    if (reply.startsWith('[ESCALATE]')) {
      await sendWhatsApp(process.env.OWNER_PHONE, `🚨 AXIOM ESCALATION:\nFrom: ${from}\nMessage: "${text}"\nSuggested reply: ${reply.replace('[ESCALATE]','')}`);
    } else {
      await sendWhatsApp(from, reply);
    }
  } catch (e) { console.error('WA error:', e.message); }
  res.sendStatus(200);
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

app.listen(process.env.PORT || 3000, () => console.log('⚡ AXIOM online'));
