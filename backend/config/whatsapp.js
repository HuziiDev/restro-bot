import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import { handleIncomingMessage } from '../services/botService.js';

let whatsappClient = null;

export const initializeWhatsApp = (io) => {
  whatsappClient = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    }
  });

  whatsappClient.on('qr', (qr) => {
    console.log('📱 Scan this QR code with WhatsApp:');
    qrcode.generate(qr, { small: true });
    io.emit('qr', qr);
  });

  whatsappClient.on('ready', () => {
    console.log('✅ WhatsApp client is ready!');
    io.emit('whatsapp_ready', { status: 'connected' });
  });

  whatsappClient.on('authenticated', () => {
    console.log('✅ WhatsApp authenticated');
  });

  whatsappClient.on('auth_failure', (msg) => {
    console.error('❌ WhatsApp authentication failed:', msg);
  });

  whatsappClient.on('disconnected', (reason) => {
    console.log('⚠️  WhatsApp disconnected:', reason);
    io.emit('whatsapp_disconnected', { reason });
  });

  whatsappClient.on('message', async (message) => {
    try {
      await handleIncomingMessage(message, whatsappClient, io);
    } catch (error) {
      console.error('❌ Error handling message:', error);
    }
  });

  whatsappClient.initialize();
};

export const getWhatsAppClient = () => {
  if (!whatsappClient) {
    throw new Error('WhatsApp client not initialized');
  }
  return whatsappClient;
};