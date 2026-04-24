const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const pino = require('pino');

const userStates = {}; // track conversation

async function startBot() {

    const { state, saveCreds } = await useMultiFileAuthState('session_data');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) qrcode.generate(qr, { small: true });

        if (connection === 'open') console.log('✅ Sachora Clinic Bot is Online');
        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode;
            if (reason !== DisconnectReason.loggedOut) startBot();
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const sender = msg.key.remoteJid;
        const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || "").toLowerCase();

        console.log("User:", text);

        // =============================
        // STEP 1: LEAD CAPTURE FLOW
        // =============================
        if (userStates[sender]?.step === 'WAITING_FOR_DETAILS') {

            userStates[sender].details = text;

            await sock.sendMessage(sender, {
                text: `✅ *Thank you!*\n\nOur team will contact you shortly.\n\n📍 *Sachora Aesthetic & Cosmetology Clinic*\nArshad Residency,Amber Tower,Sarkhej, Ahmedabad\n📞 9725181418 & 7048181418`
            });

            delete userStates[sender];
            return;
        }

        // =============================
        // BOOK APPOINTMENT FLOW
        // =============================
        if (text.includes("book") || text.includes("appointment")) {

            userStates[sender] = { step: 'WAITING_FOR_DETAILS' };

            await sock.sendMessage(sender, {
                text: `📅 *Appointment Booking*\n\nPlease share:\n\n• Full Name\n• Concern (Skin/Hair/Hijama)\n• Preferred Time\n\nOur team will confirm your slot shortly.`
            });

            return;
        }

        // =============================
        // SERVICES
        // =============================
        if (text.includes("service") || text.includes("treatment")) {

            await sock.sendMessage(sender, {
                text: `✨ *Our Services:*\n\n• Hydra Facial\n• Korean Facial\n• Glow Facial\n• OxyGeneo Facial\n• Chemical Peel\n• PRP Treatment\n• Warts Removal (Massa)\n• Hijama Therapy\n\n👉 Reply *book* to schedule consultation`
            });

            return;
        }

        // =============================
        // CONSULTATION OFFER
        // =============================
        if (text.includes("price") || text.includes("consultation")) {

            await sock.sendMessage(sender, {
                text: `💰 *Special Offer*\n\nConsultation Just ₹50 Only!\n\nExpert Care By:\nDr. Sachora Mahamad Avval\nSachora Hiba\n\n👉 Reply *book* to confirm your slot`
            });

            return;
        }

        // =============================
        // FACIAL / SKIN QUERIES
        // =============================
        if (text.includes("facial") || text.includes("skin")) {

            await sock.sendMessage(sender, {
                text: `✨ *Facial Treatments Available*\n\n• Hydra Facial (Deep Hydration)\n• Korean Facial (Glass Glow)\n• Glow Facial (Instant Brightness)\n\n👉 Best treatment depends on your skin type\n\nReply *book* for expert consultation`
            });

            return;
        }

        // =============================
        // HIJAMA
        // =============================
        if (text.includes("hijama")) {

            await sock.sendMessage(sender, {
                text: `🩺 *Hijama Therapy*\n\n• Sunnah Treatment\n• Improves blood circulation\n• Detoxifies body\n\nAvailable at Sachora Clinic\n\n👉 Reply *book* to schedule`
            });

            return;
        }

        // =============================
        // LOCATION / CONTACT
        // =============================
        if (text.includes("address") || text.includes("location")) {

            await sock.sendMessage(sender, {
                text: `📍 *Sachora Aesthetic & Cosmetology Clinic*\n\nArshad Residency,\nTP-85 Road,Amber Tower, Sarkhej,\nAhmedabad – 380055\n\n📞 9725181418 & 7048181418`
            });

            return;
        }

        // =============================
        // GREETING
        // =============================
        if (text.includes("hi") || text.includes("hello") || text.includes("hey")) {

            await sock.sendMessage(sender, {
                text: `👋 *Welcome to Sachora Clinic*\n\nWe specialize in Skin, Hair & Hijama treatments.\n\nType:\n• *services* → View treatments\n• *book* → Book appointment\n• *price* → Consultation offer`
            });

            return;
        }

        // =============================
        // DEFAULT
        // =============================
        await sock.sendMessage(sender, {
            text: `🤔 I didn't understand that.\n\nType:\n• *services*\n• *book*\n• *price*`
        });

    });
}

startBot().catch(err => console.log(err));
