import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { google } from 'googleapis';
import { extractReceiptData } from './agents/extractionFlow';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const upload = multer();

// In-memory store for active return cases
export interface ReturnCase {
  id: string;
  productName: string;
  retailer: string;
  purchaseDate: string;
  deliveryDate?: string;
  price?: number;
  returnWindowDays: number;
  deadlineDate: string;
  daysRemaining: number;
  status: 'Action Recommended' | 'Monitoring' | 'Completed' | 'Expired';
  confidenceScore: number;
  source: 'OCR Upload' | 'Email Webhook';
  createdAt: string;
  notified7Days?: boolean;
  notified1Day?: boolean;
}

import fs from 'fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let db: Firestore | null = null;
let returnCases: ReturnCase[] = []; // Fallback in-memory array

try {
  let serviceAccount = null;
  
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else if (fs.existsSync('./firebase-key.json')) {
    serviceAccount = JSON.parse(fs.readFileSync('./firebase-key.json', 'utf8'));
  }

  if (serviceAccount) {
    initializeApp({
      credential: cert(serviceAccount)
    });
    db = getFirestore();
    console.log('🔥 Firebase Firestore connected successfully!');
  } else {
    console.warn('⚠️ No Firebase credentials found. Falling back to in-memory array.');
  }
} catch (error) {
  console.error('Failed to initialize Firebase:', error);
}

async function saveReturnCase(newCase: ReturnCase) {
  if (db) {
    // Firestore throws errors if you pass `undefined` values. 
    // We must clean the object first.
    const cleanCase = { ...newCase };
    Object.keys(cleanCase).forEach(key => {
      if ((cleanCase as any)[key] === undefined) {
        delete (cleanCase as any)[key];
      }
    });
    
    await db.collection('returnCases').doc(cleanCase.id).set(cleanCase);
  } else {
    returnCases.unshift(newCase);
  }
}

async function getReturnCases(): Promise<ReturnCase[]> {
  if (db) {
    const snapshot = await db.collection('returnCases').orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => doc.data() as ReturnCase);
  }
  return returnCases;
}

async function deleteReturnCase(id: string) {
  if (db) {
    await db.collection('returnCases').doc(id).delete();
  } else {
    returnCases = returnCases.filter(c => c.id !== id);
  }
}

async function updateReturnCase(id: string, updates: Partial<ReturnCase>) {
  if (db) {
    await db.collection('returnCases').doc(id).update(updates);
  } else {
    const item = returnCases.find(c => c.id === id);
    if (item) Object.assign(item, updates);
  }
}

function calculateDeadline(purchaseDateStr: string, windowDays: number) {
  const baseDate = new Date(purchaseDateStr);
  
  if (isNaN(baseDate.getTime())) {
    return {
      deadlineDate: "Unknown",
      daysRemaining: -9999
    };
  }

  const deadline = new Date(baseDate);
  deadline.setDate(baseDate.getDate() + windowDays);

  const today = new Date();
  const diffTime = deadline.getTime() - today.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return {
    deadlineDate: deadline.toISOString().split('T')[0],
    daysRemaining: daysRemaining
  };
}

async function sendEmailNotification(toEmail: string, subject: string, messageText: string, messageHtml?: string) {
  try {
    const refreshToken = HACKATHON_GLOBAL_REFRESH_TOKEN || process.env.GOOGLE_USER_REFRESH_TOKEN;
    if (!refreshToken) return;
    
    const oauth2Client = getOAuthClient();
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    
    // Properly encode the subject line for emojis (RFC 1342)
    const encodedSubject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
    
    // Construct raw email
    const emailLines = [
      `To: ${toEmail}`,
      messageHtml ? 'Content-type: text/html; charset=utf-8' : 'Content-type: text/plain; charset=utf-8',
      'MIME-Version: 1.0',
      `Subject: ${encodedSubject}`,
      '',
      messageHtml || messageText
    ];
    const email = emailLines.join('\r\n');
    const base64EncodedEmail = Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    
    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: base64EncodedEmail,
      },
    });
    console.log(`✉️ Email notification sent to ${toEmail}: ${subject}`);
  } catch (err) {
    console.error("Failed to send email notification", err);
  }
}

function generateEmailHtml(productName: string, retailer: string, deadlineDate: string, isUrgent: boolean, price?: number) {
  const color = isUrgent ? '#dc2626' : '#ea580c';
  const icon = isUrgent ? '🚨' : '⚠️';
  const title = isUrgent ? 'Final Day to Return' : 'Return Deadline Approaching';
  
  const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000';
  
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
      <div style="background-color: ${color}; padding: 24px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">${icon} ${title}</h1>
      </div>
      <div style="padding: 32px 24px; background-color: #ffffff;">
        <p style="font-size: 16px; color: #374151; margin-top: 0;">Hi there,</p>
        <p style="font-size: 16px; color: #374151; line-height: 1.5;">
          This is an automated reminder from <strong>ReturnMinder</strong>. You have a return deadline coming up very soon for your recent purchase from <strong>${retailer}</strong>.
        </p>
        
        <div style="background-color: #f9fafb; border-radius: 6px; padding: 16px; margin: 24px 0; border: 1px solid #e5e7eb;">
          <h3 style="margin: 0 0 12px 0; color: #111827; font-size: 16px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">Purchase Details</h3>
          <p style="margin: 0 0 8px 0; color: #4b5563;"><strong>Item:</strong> ${productName}</p>
          ${price ? `<p style="margin: 0 0 8px 0; color: #4b5563;"><strong>Price:</strong> $${price.toFixed(2)}</p>` : ''}
          <p style="margin: 0; color: ${color}; font-weight: bold; font-size: 18px;">Deadline: ${deadlineDate}</p>
        </div>
        
        <p style="font-size: 16px; color: #374151; line-height: 1.5;">
          Make sure to gather the original packaging and any receipts or return labels to start the return process before the window closes.
        </p>
        
        <div style="text-align: center; margin-top: 32px; margin-bottom: 16px;">
          <a href="${frontendUrl}" style="display: inline-block; background-color: #111827; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 16px;">View Dashboard</a>
        </div>
      </div>
      <div style="background-color: #f9fafb; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0; color: #9ca3af; font-size: 12px;">Sent autonomously by ReturnMinder's background monitor.</p>
      </div>
    </div>
  `;
}

// Background checker for notifications
setInterval(async () => {
  // If we have a refresh token but no email yet, try to fetch it
  if (!HACKATHON_GLOBAL_USER_EMAIL && (HACKATHON_GLOBAL_REFRESH_TOKEN || process.env.GOOGLE_USER_REFRESH_TOKEN)) {
    try {
      const oauth2Client = getOAuthClient();
      oauth2Client.setCredentials({ refresh_token: HACKATHON_GLOBAL_REFRESH_TOKEN || process.env.GOOGLE_USER_REFRESH_TOKEN });
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      const profile = await gmail.users.getProfile({ userId: 'me' });
      HACKATHON_GLOBAL_USER_EMAIL = profile.data.emailAddress || null;
    } catch(e) {}
  }

  if (!HACKATHON_GLOBAL_USER_EMAIL) return;

  const currentCases = await getReturnCases();

  for (const item of currentCases) {
    // Recalculate days remaining to be fresh
    const { daysRemaining } = calculateDeadline(item.purchaseDate, item.returnWindowDays);
    
    let needsUpdate = false;
    let updates: Partial<ReturnCase> = { daysRemaining };

    if (item.daysRemaining !== daysRemaining) {
        needsUpdate = true;
    }
    
    // Urgent 1-day warning (1 or 0 days left)
    if (daysRemaining <= 1 && daysRemaining >= 0 && !item.notified1Day) {
      updates.notified1Day = true;
      updates.notified7Days = true; // Skip the 7-day warning if we're already at 1 day
      needsUpdate = true;
      await sendEmailNotification(
        HACKATHON_GLOBAL_USER_EMAIL,
        `🚨 FINAL DAY to Return: ${item.productName}`,
        `URGENT: Today or tomorrow is the last day to return your purchase from ${item.retailer}.\n\nItem: ${item.productName}\nDeadline: ${item.deadlineDate}\n\nDon't miss the window!`,
        generateEmailHtml(item.productName, item.retailer, item.deadlineDate, true, item.price)
      );
    } 
    // 7-day warning (between 2 and 7 days left)
    else if (daysRemaining <= 7 && daysRemaining > 1 && !item.notified7Days) {
      updates.notified7Days = true;
      needsUpdate = true;
      await sendEmailNotification(
        HACKATHON_GLOBAL_USER_EMAIL,
        `⚠️ Return Deadline Approaching: ${item.productName}`,
        `Heads up! You have 7 days or fewer left to return your purchase from ${item.retailer}.\n\nItem: ${item.productName}\nDeadline: ${item.deadlineDate}\n\nMake sure to start the return process soon!`,
        generateEmailHtml(item.productName, item.retailer, item.deadlineDate, false, item.price)
      );
    }

    if (needsUpdate) {
        await updateReturnCase(item.id, updates);
    }
  }
}, 60 * 1000); // Check every minute

let lastError: any = null;

app.get('/api/debug/error', (req, res) => {
  res.json({ lastError });
});

app.get('/api/debug/models', async (req, res) => {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    const data = await response.json();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


app.post('/api/extract', async (req, res) => {
  try {
    const { documentText, base64Image } = req.body;
    const extractedData = await extractReceiptData({ text: documentText, image: base64Image });
    res.json({ success: true, data: extractedData });
  } catch (error: any) {
    lastError = { message: error?.message, stack: error?.stack, raw: error };
    res.status(500).json({ error: 'Failed to process document.', details: error?.message });
  }
});

app.get('/api/returns', async (req, res) => {
  try {
    const cases = await getReturnCases();
    res.json({ success: true, data: cases });
  } catch (error) {
    console.error("GET /api/returns ERROR:", error);
    res.status(500).json({ error: 'Failed to fetch returns' });
  }
});

app.post('/api/returns', async (req, res) => {
  try {
    const { productName, retailer, purchaseDate, deliveryDate, price, returnWindowDays, confidenceScore, source } = req.body;
    const window = Number(returnWindowDays) || 30;
    const { deadlineDate, daysRemaining } = calculateDeadline(purchaseDate || new Date().toISOString().split('T')[0], window);
    let status: ReturnCase['status'] = 'Monitoring';
    if (daysRemaining <= 7 && daysRemaining >= 0) status = 'Action Recommended';
    else if (daysRemaining < 0) status = 'Expired';

    const newCase: ReturnCase = {
      id: Date.now().toString(),
      productName: productName || 'Unnamed Item',
      retailer: retailer || 'Unknown Retailer',
      purchaseDate: purchaseDate || new Date().toISOString().split('T')[0],
      deliveryDate,
      price: price ? Number(price) : undefined,
      returnWindowDays: window,
      deadlineDate,
      daysRemaining,
      status,
      confidenceScore: confidenceScore || 90,
      source: source || 'OCR Upload',
      createdAt: new Date().toISOString()
    };
    await saveReturnCase(newCase);
    res.json({ success: true, data: newCase });
  } catch (error) {
    console.error("POST /api/returns ERROR:", error);
    res.status(500).json({ error: 'Failed to save return case' });
  }
});


app.put('/api/returns/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    await updateReturnCase(id, updates);
    res.json({ success: true });
  } catch (err: any) {
    console.error('Failed to update case:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to update case' });
  }
});

app.post('/api/returns/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    await updateReturnCase(id, { status: 'Completed' });
    res.json({ success: true });
  } catch (err: any) {
    console.error('Failed to mark case complete:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to mark case complete' });
  }
});

app.delete('/api/returns/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await deleteReturnCase(id);
    res.json({ success: true, message: 'Removed' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete return case' });
  }
});

// CloudMailin sends multipart form data
app.post('/api/email-hook', upload.none(), async (req, res) => {
  try {
    console.log("================= INCOMING EMAIL WEBHOOK =================");
    
    // CloudMailin normalizes text to req.body.plain or req.body.html
    const emailBody = req.body?.plain || req.body?.html || req.body?.text || (req.body ? JSON.stringify(req.body) : "");
    
    console.log("Email Body Preview:", emailBody ? emailBody.substring(0, 500) : "NO BODY FOUND");
    
    if (emailBody && emailBody.includes("Confirmation code:")) {
      console.log("\n\n🔥 GMAIL CONFIRMATION CODE DETECTED! 🔥\n", emailBody);
      return res.status(200).json({ success: true, message: "Logged verification code" });
    }

    const extracted = await extractReceiptData({ text: emailBody });
    
    // STRICT FILTER: Only allow actual purchases
    if (!extracted.isReturnablePurchase || String(extracted.isReturnablePurchase).toLowerCase() === 'false') {
      console.log(`⏩ [IGNORED NON-ORDER] CloudMailin ignored non-purchase email. Reason: ${extracted.missingInformation}`);
      return res.status(200).json({ success: true, message: "Ignored non-purchase" });
    }

    const window = Number(extracted.returnWindowDays) || 30;
    const { deadlineDate, daysRemaining } = calculateDeadline(extracted.purchaseDate || new Date().toISOString().split('T')[0], window);

    const newCase: ReturnCase = {
      id: Date.now().toString(),
      productName: extracted.productName,
      retailer: extracted.retailer,
      purchaseDate: extracted.purchaseDate,
      deliveryDate: extracted.deliveryDate,
      price: extracted.price,
      returnWindowDays: window,
      deadlineDate,
      daysRemaining,
      status: daysRemaining < 0 ? 'Expired' : (daysRemaining <= 7 ? 'Action Recommended' : 'Monitoring'),
      confidenceScore: extracted.confidenceScore,
      source: 'Email Webhook',
      createdAt: new Date().toISOString()
    };
    await saveReturnCase(newCase);
    res.status(200).json({ success: true, data: newCase });
  } catch (error) {
    console.error('Email webhook ingestion error:', error);
    res.status(500).json({ error: 'Failed to ingest email receipt' });
  }
});

// Google OAuth 2.0 Setup
const getOAuthClient = () => {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI // e.g. https://return-radar-backend.onrender.com/api/auth/callback
  );
};

// For the hackathon demo, we store the user's refresh token in memory or read from env
let HACKATHON_GLOBAL_REFRESH_TOKEN: string | null = process.env.GOOGLE_USER_REFRESH_TOKEN || null;
let HACKATHON_GLOBAL_USER_EMAIL: string | null = null;

app.get('/api/debug', async (req, res) => {
  const cases = await getReturnCases();
  res.json({
    status: 'online',
    isGmailConnected: !!(HACKATHON_GLOBAL_REFRESH_TOKEN || process.env.GOOGLE_USER_REFRESH_TOKEN),
    userEmail: HACKATHON_GLOBAL_USER_EMAIL,
    returnCasesCount: cases.length,
    projectId: process.env.GOOGLE_PROJECT_ID || 'NOT_SET',
    hasClientId: !!process.env.GOOGLE_CLIENT_ID,
    hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    hasGeminiKey: !!process.env.GEMINI_API_KEY,
    firebaseConnected: db !== null,
    firebaseEnvLength: process.env.FIREBASE_SERVICE_ACCOUNT ? process.env.FIREBASE_SERVICE_ACCOUNT.length : 0
  });
});

app.get('/api/auth/google', (req, res) => {
  const oauth2Client = getOAuthClient();
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Required to get a refresh token!
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send'
    ]
  });
  res.redirect(url);
});

app.get('/api/auth/callback', async (req, res) => {
  try {
    const code = req.query.code as string;
    const oauth2Client = getOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    
    if (tokens.refresh_token) {
      HACKATHON_GLOBAL_REFRESH_TOKEN = tokens.refresh_token;
      console.log("\n=======================================================");
      console.log("✅ GOOGLE REFRESH TOKEN ACQUIRED!");
      console.log("REFRESH_TOKEN:", tokens.refresh_token);
      console.log("=======================================================\n");
    }

    oauth2Client.setCredentials(tokens);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Get user email
    try {
      const profile = await gmail.users.getProfile({ userId: 'me' });
      HACKATHON_GLOBAL_USER_EMAIL = profile.data.emailAddress || null;
      console.log("User email loaded:", HACKATHON_GLOBAL_USER_EMAIL);
    } catch(e) {
      console.error("Failed to fetch user email", e);
    }

    // Tell Google to start pushing notifications to our Pub/Sub topic!
    await gmail.users.watch({
      userId: 'me',
      requestBody: {
        topicName: `projects/${process.env.GOOGLE_PROJECT_ID}/topics/return-radar-receipts`,
        labelIds: ['INBOX']
      }
    });

    console.log("👀 Gmail Watch activated for Pub/Sub!");
    
    // Redirect back to frontend dashboard
    const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}?gmail_connected=true`);
  } catch (error) {
    console.error("Auth callback error:", error);
    res.status(500).send("Authentication failed");
  }
});

// Cache to prevent duplicate webhook processing
const processedMessageIds = new Set<string>();

// Google Cloud Pub/Sub Webhook (Gmail Push Notifications)

app.post('/api/gmail-webhook', async (req, res) => {
  try {
    if (!req.body || !req.body.message) {
      return res.status(400).send('Invalid Pub/Sub message format');
    }

    // 1. Decode the Google Pub/Sub Base64 payload
    const pubSubMessage = req.body.message;
    const decodedData = Buffer.from(pubSubMessage.data, 'base64').toString();
    const { emailAddress, historyId } = JSON.parse(decodedData);
    
    console.log(`\n\n📫 [GOOGLE PUB/SUB] Received push for: ${emailAddress} | History ID: ${historyId}`);

    // 2. Acknowledge the message immediately so Google doesn't retry
    res.status(200).send('OK');

    // 3. Process the email asynchronously in the background
    if (!HACKATHON_GLOBAL_REFRESH_TOKEN) {
      console.log("No Refresh Token saved yet. Waiting for user to connect via /api/auth/google.");
      return;
    }

    const oauth2Client = getOAuthClient();
    oauth2Client.setCredentials({ refresh_token: HACKATHON_GLOBAL_REFRESH_TOKEN });
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    
    // Fetch the recent emails from the Primary category only
    const listRes = await gmail.users.messages.list({ userId: 'me', maxResults: 1, q: 'category:primary' });
    const messages = listRes.data.messages;

    if (messages && messages.length > 0) {
      const messageId = messages[0].id!;
      
      // Deduplicate by messageId
      if (processedMessageIds.has(messageId)) {
        console.log(`⏩ [DEDUPLICATE] Message ${messageId} already processed, skipping.`);
        return;
      }
      processedMessageIds.add(messageId);

      const msgRes = await gmail.users.messages.get({ userId: 'me', id: messageId });
      
      let emailBodyText = "";
      const payload = msgRes.data.payload;
      
      if (payload?.parts) {
         // Multipart email
         const textPart = payload.parts.find(p => p.mimeType === 'text/plain');
         const htmlPart = payload.parts.find(p => p.mimeType === 'text/html');
         const activePart = textPart || htmlPart;
         if (activePart && activePart.body?.data) {
           emailBodyText = Buffer.from(activePart.body.data, 'base64').toString();
         }
      } else if (payload?.body?.data) {
         // Single part email
         emailBodyText = Buffer.from(payload.body.data, 'base64').toString();
      }

      console.log(`Extracting data from fetched email... length: ${emailBodyText.length}`);

      if (emailBodyText.length > 50) {
        // Pass to Gemini Agent
        const extracted = await extractReceiptData({ text: emailBodyText });

        // Filter out non-purchases (advertisements, news, newsletters, subscriptions)
        if (!extracted.isReturnablePurchase || String(extracted.isReturnablePurchase).toLowerCase() === 'false') {
          console.log(`⏩ [IGNORED NON-ORDER] Filtered out non-purchase email. Reason: ${extracted.missingInformation || 'Not a returnable order'}`);
          return;
        }
        
        const currentCases = await getReturnCases();
        
        // Deduplicate against existing return cases
        const isDuplicate = currentCases.some(
          c => c.productName.trim().toLowerCase() === extracted.productName.trim().toLowerCase() &&
               c.retailer.trim().toLowerCase() === extracted.retailer.trim().toLowerCase() &&
               c.purchaseDate === extracted.purchaseDate
        );

        if (isDuplicate) {
          console.log(`⏩ [DEDUPLICATE] Duplicate item '${extracted.productName}' already in tracking ledger.`);
          return;
        }

        const window = Number(extracted.returnWindowDays) || 30;
        const { deadlineDate, daysRemaining } = calculateDeadline(extracted.purchaseDate || new Date().toISOString().split('T')[0], window);

        const newCase: ReturnCase = {
          id: Date.now().toString(),
          productName: extracted.productName,
          retailer: extracted.retailer,
          purchaseDate: extracted.purchaseDate,
          deliveryDate: extracted.deliveryDate,
          price: extracted.price,
          returnWindowDays: window,
          deadlineDate,
          daysRemaining,
          status: daysRemaining < 0 ? 'Expired' : (daysRemaining <= 7 ? 'Action Recommended' : 'Monitoring'),
          confidenceScore: extracted.confidenceScore,
          source: 'Email Webhook',
          createdAt: new Date().toISOString()
        };
        await saveReturnCase(newCase);
        console.log(`✅ successfully processed receipt from PubSub push! Retailer: ${newCase.retailer}`);
      }
    }
    
  } catch (error) {
    console.error('Pub/Sub webhook error:', error);
    res.status(500).send('Webhook failed');
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 ReturnMinder Backend listening on port ${PORT}`);
});
