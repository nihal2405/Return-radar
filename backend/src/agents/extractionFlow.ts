import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { ExtractedPurchase } from '../schema/types';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function extractReceiptData({ text, image }: { text?: string, image?: string }): Promise<ExtractedPurchase> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });

    const systemPrompt = `You are an expert purchase auditor and return policy analyzer.
Your task is to analyze documents or emails and determine if they represent a real, completed order confirmation or purchase receipt of returnable items (physical goods like clothing, electronics, shoes, gear, home items).

CRITICAL CLASSIFICATION RULE - WHAT TO REJECT:
- Set "isReturnablePurchase": false if the document is ANY of the following:
  * An advertisement, marketing newsletter, sales promotion, coupon code, or promotional discount.
  * A news article, blog digest, account alert, or spam.
  * A digital subscription, software upgrade, developer account, API credits, SaaS product, cloud service, or streaming service.
  * Anything that cannot be physically put in a box and mailed back to a store.

CRITICAL CLASSIFICATION RULE - WHAT TO ACCEPT:
- Set "isReturnablePurchase": true ONLY if the email is a genuine order confirmation or receipt for a PHYSICAL GOOD that can be shipped back (e.g., clothing, electronics, shoes, physical books, home goods).

Extract details strictly as a JSON object matching this schema:
{
  "isReturnablePurchase": boolean,
  "productName": "string (name of product, or empty string if not a purchase)",
  "retailer": "string (name of merchant)",
  "purchaseDate": "YYYY-MM-DD",
  "deliveryDate": "YYYY-MM-DD (optional)",
  "price": number (optional),
  "returnWindowDays": number (e.g. 30, 14, 90, based on store policy or email fine print. Default to 30 if unknown),
  "returnWindowStartsFrom": "purchase_date" or "delivery_date",
  "confidenceScore": number (0-100),
  "missingInformation": "string (if not a purchase, briefly explain why e.g. 'Promotional advertisement for discounts' or 'Streaming subscription renewal')"
}
Return ONLY valid JSON without markdown fences if possible.`;

    const parts: any[] = [{ text: systemPrompt }];

    if (text) {
      parts.push({ text: `Receipt Text:\n${text}` });
    }

    if (image) {
      const commaIndex = image.indexOf(',');
      const mimeTypeMatch = image.match(/^data:(.+?);base64/);
      if (commaIndex !== -1 && mimeTypeMatch) {
        parts.push({
          inlineData: {
            mimeType: mimeTypeMatch[1],
            data: image.substring(commaIndex + 1)
          }
        });
      } else {
        // Fallback if the payload is not properly prefixed
        parts.push({
          inlineData: {
            mimeType: 'image/jpeg',
            data: image
          }
        });
      }
    }

    const candidateModels = ['gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-3.5-flash'];
    let response: any = null;
    let lastErr: any = null;

    for (const modelName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        response = await model.generateContent(parts);
        console.log(`✅ Gemini extraction succeeded with model: ${modelName}`);
        break;
      } catch (err: any) {
        console.warn(`⚠️ Model ${modelName} failed, trying next candidate...`, err.message);
        lastErr = err;
      }
    }

    if (!response) {
      throw lastErr || new Error('All Gemini candidate models failed.');
    }

    const rawText = response.response.text();
    console.log('Gemini raw extraction:', rawText);

    // Clean up code fences if Gemini added them
    const cleanJson = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error('Extraction error in GoogleGenAI:', error);
    throw error;
  }
}
