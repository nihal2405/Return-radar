'use client';
import { useState, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  UploadCloud,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  DollarSign,
  Store,
  Tag,
  Calendar,
  X,
  ScanLine,
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';

export default function UploadPage() {
  const router = useRouter();
  const [documentText, setDocumentText] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Editable Extracted Form State
  const [extractedData, setExtractedData] = useState<{
    productName: string;
    retailer: string;
    purchaseDate: string;
    deliveryDate?: string;
    price?: number;
    returnWindowDays: number;
    confidenceScore: number;
    missingInformation?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setImagePreview(base64);
        setBase64Image(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setImagePreview(base64);
        setBase64Image(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleExtract = async () => {
    if (!documentText && !base64Image) {
      setErrorMsg('Please upload a receipt image or paste receipt text.');
      return;
    }
    setErrorMsg(null);
    setLoading(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
      const response = await fetch(`${backendUrl}/api/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentText, base64Image }),
      });
      const data = await response.json();
      if (data.success && data.data) {
        setExtractedData({
          productName: data.data.productName || '',
          retailer: data.data.retailer || '',
          purchaseDate: data.data.purchaseDate || new Date().toISOString().split('T')[0],
          deliveryDate: data.data.deliveryDate,
          price: data.data.price,
          returnWindowDays: data.data.returnWindowDays || 30,
          confidenceScore: data.data.confidenceScore || 90,
          missingInformation: data.data.missingInformation,
        });
      } else {
        console.error('Backend returned failure:', data);
        setErrorMsg(data.error || 'Could not extract details. Please check the receipt and try again.');
      }
    } catch (err: any) {
      console.error('Fetch error:', err);
      setErrorMsg(err.message || 'Error connecting to extraction service. Please verify the backend is running.');
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!extractedData) return;
    setSaving(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
      const response = await fetch(`${backendUrl}/api/returns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...extractedData,
          source: base64Image ? 'OCR Upload' : 'Email Webhook',
        }),
      });
      const data = await response.json();
      if (data.success) {
        router.push('/');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to save return case.');
    }
    setSaving(false);
  };

  // Preset samples for fast demo
  const loadSample = (type: 'bestbuy' | 'amazon' | 'apple') => {
    if (type === 'bestbuy') {
      setDocumentText(`BEST BUY #1094
1000 Best Buy Pkwy, Richfield, MN
Order Date: ${new Date().toISOString().split('T')[0]}
Item: Sony WH-1000XM5 Wireless Noise Cancelling Headphones - Black
Model: WH1000XM5/B   SKU: 6505727
Unit Price: $349.99
Subtotal: $349.99
Tax: $28.00
Total Paid: $377.99
Return Policy: Standard items may be returned within 14 days of purchase. Original packaging required.`);
    } else if (type === 'amazon') {
      setDocumentText(`Amazon.com Order Confirmation
Order # 114-9847291-3829103
Order Date: ${new Date().toISOString().split('T')[0]}
Ship to: Sai Nihal
Item: Bose QuietComfort Ultra Wireless Headphones
Sold by: Amazon.com Services LLC
Price: $429.00
Return Policy: Eligible for return or refund within 30 days of receipt.`);
    } else {
      setDocumentText(`Apple Store Online Receipt
Order Number: W94820184
Date of Purchase: ${new Date().toISOString().split('T')[0]}
Product: Apple Watch Series 10 GPS 46mm Jet Black Aluminum Case
Amount: $429.00
Payment Method: Apple Card
Standard Return Window: 14 calendar days from the date of delivery to initiate a return.`);
    }
  };

  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-background/85 px-4 py-3 backdrop-blur-md sm:px-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Back to Dashboard
          </Link>
          <span className="text-muted-foreground/40">/</span>
          <h2 className="font-display text-sm font-semibold tracking-tight text-foreground">
            Ingest Purchase
          </h2>
        </header>

        <main className="mx-auto w-full max-w-4xl flex-1 space-y-8 px-4 py-8 sm:px-6 lg:py-10">
          {/* Title section */}
          <section className="space-y-2">
            <p className="label-mono text-accent">Multimodal Ingestion</p>
            <h1 className="text-3xl font-semibold leading-tight text-foreground">
              Scan Receipt or Paste Details
            </h1>
            <p className="max-w-xl text-[15px] leading-relaxed text-muted-foreground">
              Gemini 3.5 Flash reads receipt images, detects stores, calculates return windows from merchant policies, and syncs countdowns automatically.
            </p>
          </section>

          {errorMsg && (
            <div className="flex items-center gap-2 rounded-lg border border-critical/25 bg-critical-soft p-4 text-xs font-medium text-critical">
              <AlertCircle className="size-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Upload and Paste Panels */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Image OCR Dropzone */}
            <div className="panel p-5 space-y-4">
              <div className="flex items-center gap-2">
                <ScanLine className="size-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Upload Paper Receipt / Screenshot</h3>
              </div>

              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="group relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-surface-2 p-8 text-center cursor-pointer transition hover:border-primary/50 hover:bg-surface-3"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />

                {imagePreview ? (
                  <div className="relative w-full">
                    <img
                      src={imagePreview}
                      alt="Receipt Preview"
                      className="max-h-48 w-auto mx-auto rounded-lg shadow-sm border border-border object-contain"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setImagePreview(null);
                        setBase64Image(null);
                      }}
                      className="absolute -top-2 -right-2 size-6 rounded-full bg-critical text-white grid place-items-center shadow hover:opacity-90"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="mx-auto grid size-10 place-items-center rounded-full bg-surface-1 text-primary shadow-sm group-hover:scale-105 transition">
                      <UploadCloud className="size-5" />
                    </div>
                    <p className="text-xs font-medium text-foreground">
                      Click to upload or drag receipt image here
                    </p>
                    <p className="text-[11px] text-muted-foreground">Supports PNG, JPG, WebP</p>
                  </div>
                )}
              </div>
            </div>

            {/* Raw Text / Confirmation Email */}
            <div className="panel p-5 space-y-4 flex flex-col">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="size-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Paste Email Receipt Text</h3>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-muted-foreground uppercase font-mono">Samples:</span>
                  <button
                    onClick={() => loadSample('bestbuy')}
                    className="text-[11px] font-medium text-primary hover:underline"
                  >
                    Best Buy
                  </button>
                  <span className="text-muted-foreground/40">·</span>
                  <button
                    onClick={() => loadSample('amazon')}
                    className="text-[11px] font-medium text-primary hover:underline"
                  >
                    Amazon
                  </button>
                </div>
              </div>

              <textarea
                value={documentText}
                onChange={(e) => setDocumentText(e.target.value)}
                placeholder="Paste order confirmation text, store receipt, or return policy snippet..."
                className="flex-1 w-full min-h-[160px] rounded-xl border border-border bg-surface-2 p-3 text-xs font-mono text-foreground placeholder:text-muted-foreground outline-none transition focus:border-primary/40 focus:ring-3 focus:ring-primary/10"
              />
            </div>
          </div>

          {/* Action Button */}
          <div className="flex justify-end">
            <button
              onClick={handleExtract}
              disabled={loading || (!documentText && !base64Image)}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="size-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  Analyzing with Gemini 3.5 Flash...
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  Extract Return Window
                </>
              )}
            </button>
          </div>

          {/* Extracted Review & Approval Card */}
          {extractedData && (
            <section className="hero-wash relative overflow-hidden rounded-xl border border-primary/25 bg-surface-1 p-6 shadow-[var(--shadow-raised)] space-y-6">
              <span className="absolute inset-y-0 left-0 w-1 bg-primary" aria-hidden />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-safe-soft px-2.5 py-0.5 font-mono text-[11px] font-semibold text-safe border border-safe/20">
                      {extractedData.confidenceScore}% AI Confidence
                    </span>
                    <span className="label-mono text-accent">Review & Verify</span>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">
                    Structured Policy Extraction
                  </h3>
                </div>

                <div className="text-right">
                  <span className="font-mono text-xs text-muted-foreground">Source: Multimodal Ingestion</span>
                </div>
              </div>

              {extractedData.missingInformation && (
                <div className="rounded-lg border border-warning/25 bg-warning-soft p-3 text-xs text-warning flex items-start gap-2">
                  <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Note from AI: </span>
                    {extractedData.missingInformation}
                  </div>
                </div>
              )}

              {/* Form Fields Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Tag className="size-3.5 text-muted-foreground" />
                    Product Name
                  </label>
                  <input
                    type="text"
                    value={extractedData.productName}
                    onChange={(e) => setExtractedData({ ...extractedData, productName: e.target.value })}
                    className="w-full h-9 rounded-lg border border-border bg-surface-1 px-3 text-xs font-medium text-foreground outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Store className="size-3.5 text-muted-foreground" />
                    Retailer / Store
                  </label>
                  <input
                    type="text"
                    value={extractedData.retailer}
                    onChange={(e) => setExtractedData({ ...extractedData, retailer: e.target.value })}
                    className="w-full h-9 rounded-lg border border-border bg-surface-1 px-3 text-xs font-medium text-foreground outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Calendar className="size-3.5 text-muted-foreground" />
                    Purchase Date
                  </label>
                  <input
                    type="date"
                    value={extractedData.purchaseDate}
                    onChange={(e) => setExtractedData({ ...extractedData, purchaseDate: e.target.value })}
                    className="w-full h-9 rounded-lg border border-border bg-surface-1 px-3 text-xs font-medium text-foreground outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Clock className="size-3.5 text-muted-foreground" />
                    Return Window (Days)
                  </label>
                  <input
                    type="number"
                    value={extractedData.returnWindowDays}
                    onChange={(e) => setExtractedData({ ...extractedData, returnWindowDays: Number(e.target.value) || 30 })}
                    className="w-full h-9 rounded-lg border border-border bg-surface-1 px-3 text-xs font-medium text-foreground outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <DollarSign className="size-3.5 text-muted-foreground" />
                    Price Paid ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={extractedData.price !== undefined ? extractedData.price : ''}
                    onChange={(e) => setExtractedData({ ...extractedData, price: e.target.value ? parseFloat(e.target.value) : undefined })}
                    placeholder="e.g. 349.99"
                    className="w-full h-9 rounded-lg border border-border bg-surface-1 px-3 text-xs font-medium text-foreground outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                  />
                </div>
              </div>

              {/* Confirm & Save */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setExtractedData(null)}
                  className="h-9 rounded-full border border-border bg-surface-1 px-4 text-xs font-medium text-muted-foreground hover:bg-secondary transition"
                >
                  Discard
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-5 text-xs font-medium text-primary-foreground shadow-sm hover:opacity-90 transition disabled:opacity-50"
                >
                  {saving ? (
                    'Adding to Tracker...'
                  ) : (
                    <>
                      <CheckCircle2 className="size-3.5" />
                      Approve & Start Monitoring
                    </>
                  )}
                </button>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
      </Suspense>
  );
}
