const express = require('express');
const axios = require('axios');
const cron = require('node-cron');

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  console.log(req.method + ' ' + req.path);
  next();
});

const SYSTEM = 'You are AXIOM, the autonomous AI agent for Assistance Ghana, a social impact organization in Ghana. Be warm, professional and community-focused. For urgent matters like media or partnerships, start your reply with [ESCALATE].';

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
        'Authorization': 'Bearer ' + process.env.GROQ_API_KEY,
        'Content-Type': 'application/json'
      }
    }
  );
  return r.data.choices[0].message.content;
}

async function sendWhatsApp(to, message) {
  await axios.post(
    'https://graph.facebook.com/v18.0/' + process.env.WHATSAPP_PHONE_NUMBER_ID + '/messages',
    {
      messaging_product: 'whatsapp',
      to: to,
      type: 'text',
      text: { body: message }
    },
    {
      headers: {
        'Authorization': 'Bearer ' + process.env.WHATSAPP_ACCESS_TOKEN,
        'Content-Type': 'application/json'
      }
    }
  );
}

async function postFacebook(message) {
  await axios.post(
    'https://graph.facebook.com/v18.0/' + process.env.META_PAGE_ID + '/feed',
    {
      message: message,
      access_token: process.env.META_PAGE_ACCESS_TOKEN
    }
  );
  console.log('Posted to Facebook');
}

app.get('/', function(req, res) {
  res.send('AXIOM is online - Assistance Ghana');
});

app.get('/webhook/whatsapp', function(req, res) {
  console.log('Webhook verification received');
  var mode = req.query['hub.mode'];
  var token = req.query['hub.verify_token'];
  var challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log('Webhook verified');
    res.send(challenge);
  } else {
    res.sendStatus(403);
  }
});

app.post('/webhook/whatsapp', function(req, res) {
  console.log('Message received');
  res.sendStatus(200);
  try {
    var msg = req.body.entry[0].changes[0].value.messages[0];
    if (!msg) return;
    var from = msg.from;
    var text = msg.text.body;
    console.log('From: ' + from + ' Text: ' + text);
    askAxiom('WhatsApp from ' + from + ': ' + text + '. Reply for Assistance Ghana.').then(function(reply) {
      console.log('Reply: ' + reply);
      if (reply.indexOf('[ESCALATE]') === 0) {
        sendWhatsApp(process.env.OWNER_PHONE, 'ESCALATION from ' + from + ': ' + text).then(function() {
          console.log('Escalated');
        });
      } else {
        sendWhatsApp(from, reply).then(function() {
          console.log('Sent');
        });
      }
    });
  } catch(e) {
    console.log('Error: ' + e.message);
  }
});

cron.schedule('0 */6 * * *', function() {
  console.log('Auto-post triggered');
  askAxiom('Create a Facebook post for Assistance Ghana. Inspiring and community-focused. Ghana context.').then(function(post) {
    postFacebook(post);
  }).catch(function(e) {
    console.log('Auto-post error: ' + e.message);
  });
});

var PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', function() {
  console.log('AXIOM online on port ' + PORT);
});
