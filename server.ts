import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import compression from "compression";
import axios from "axios";
import multer from "multer";
import admin from "firebase-admin";
import dns from "dns";
import { getAdminApp, getAdminDb, verifyAdmin, verifyUser, getDocViaRest, createDocViaRest, writeDocViaRest, deleteDocViaRest } from "./src/services/firebaseAdmin.js";
import { parseRestValue, parseRestDocument, fetchFromREST, generateContentWithFallback, resolveTenantGeminiKey } from "./src/services/apiHelpers.js";
import geminiRouter from "./src/server/routes/gemini.js";
import { handleSendEmail } from "./src/services/emailHandler.js";
import { sendWhatsAppMessage, formatWhatsAppMessage, sendWhatsAppTemplateMessage } from "./src/services/whatsappHandler.js";
import { generateVoucherPdf } from "./src/services/email/voucherGenerator.js";
import { generateManifestPdf } from "./src/services/email/manifestGenerator.js";
import { resolveEmailConfig } from "./src/services/email/recipientResolver.js";
import { sendEmailViaProvider } from "./src/services/email/transporter.js";
import { emailBaseTemplate } from "./src/services/emailTemplates.js";
import { handleChatbotRequest } from "./src/services/chatbotHandler.js";
import { fallbackHtmlTemplate } from "./src/indexHtmlFallback.js";
import { createCreemCheckoutSession } from "./src/services/creemService.js";
import { sendWelcomeEmail, sendVerificationEmail, sendPaymentSuccessEmail, sendPaymentDueEmail, sendEmail } from "./src/services/mailjetService.js";
import crypto from "crypto";

dotenv.config();

// const db = getAdminDb();

// Test environment variables
console.log("[Server] Checking environment variables...");
console.log(`[Server] GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? "CONFIGURED" : "MISSING"}`);
console.log(`[Server] FIREBASE_PROJECT_ID: ${process.env.VITE_FIREBASE_PROJECT_ID ? "CONFIGURED" : "MISSING"}`);
console.log(`[Server] OPENWA_API_KEY: ${process.env.OPENWA_API_KEY || process.env.WHAPI_TOKEN ? "CONFIGURED" : "MISSING"}`);
console.log(`[Server] RESEND_API_KEY: ${process.env.RESEND_API_KEY ? "CONFIGURED" : "MISSING"}`);
console.log(`[Server] SENDER_EMAIL: ${process.env.SENDER_EMAIL || "NOT SET (will use fallback)"}`);

// Start of server logic
export async function createServer() {
  const db = getAdminDb();
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(compression());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Configure multer for in-memory file uploads (max 10MB)
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024,
    },
  });

  // API Route: Safe Image Upload Proxy (eliminates client CORS and API key leaks)
  app.post("/api/upload", upload.single("image"), async (req: any, res: any) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const file = req.file;
      const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, "_");

      // Generate a robust unique ID resembling a Firestore doc ID
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      const docId = Array.from({ length: 20 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join("");

      const localUploadsDir = path.join(process.cwd(), "uploads");
      try {
        if (!fs.existsSync(localUploadsDir)) {
          fs.mkdirSync(localUploadsDir, { recursive: true });
        }

        // Save the file buffer and metadata locally on disk
        const localFilePath = path.join(localUploadsDir, docId);
        const localMetaPath = path.join(localUploadsDir, `${docId}.json`);
        fs.writeFileSync(localFilePath, file.buffer);
        fs.writeFileSync(localMetaPath, JSON.stringify({
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.buffer.length,
          createdAt: new Date().toISOString()
        }));

        console.log(`[Local Upload] File successfully saved locally! ID: ${docId}, Path: ${localFilePath}`);
      } catch (localWriteError) {
        console.warn(`[Local Upload] Warning: Failed to save copy locally (this is expected on read-only systems like Cloud Run): ${localWriteError.message || localWriteError}`);
      }

      // Try Firebase Storage first (as a background backup, won't block the response)
      const filePath = `uploads/${Date.now()}_${sanitizedName}`;
      let storageUrl: string | null = null;
      try {
        // Ensure admin app is initialized
        getAdminApp();

        let bucketName = process.env.VITE_FIREBASE_STORAGE_BUCKET;
        if (!bucketName) {
          try {
            const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
            if (fs.existsSync(configPath)) {
              const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
              bucketName = config.storageBucket;
            }
          } catch (e) {
            // ignore
          }
        }
        if (!bucketName) {
          bucketName = "gorilla-atv-adventure.firebasestorage.app";
        }

        // Remove gs:// prefix if present
        if (bucketName.startsWith("gs://")) {
          bucketName = bucketName.substring(5);
        }

        console.log(`[Server Upload] Uploading to Firebase Storage bucket: ${bucketName}, path: ${filePath}`);
        const bucket = admin.storage().bucket(bucketName);
        const fileUpload = bucket.file(filePath);

        // Generate a standard Firebase Storage download token (random hex works perfectly)
        const downloadToken = Array.from({ length: 4 }, () => Math.random().toString(16).substring(2)).join("");

        await fileUpload.save(file.buffer, {
          metadata: {
            contentType: file.mimetype,
            metadata: {
              firebaseStorageDownloadTokens: downloadToken,
            },
          },
        });

        storageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(filePath)}?alt=media&token=${downloadToken}`;
        console.log("[Server Upload] Firebase Storage upload successful! URL:", storageUrl);
      } catch (storageError: any) {
        console.warn("[Server Upload] Firebase Storage upload failed, trying Firestore fallback:", storageError.message || storageError);
      }

      // If we got a Storage URL, we can save that in Firestore under the specified docId,
      // otherwise we save the base64 content in Firestore as a backup!
      try {
        const adminDb = getAdminDb();
        const base64Data = file.buffer.length < 1000000 ? file.buffer.toString("base64") : null;

        const docPayload: any = {
          name: file.originalname,
          mimetype: file.mimetype,
          createdAt: admin.firestore?.FieldValue?.serverTimestamp ? admin.firestore.FieldValue.serverTimestamp() : new Date().toISOString(),
        };

        if (storageUrl) {
          docPayload.storageUrl = storageUrl;
        }
        if (base64Data) {
          docPayload.base64 = base64Data;
        }

        try {
          await adminDb.collection("uploads").doc(docId).set(docPayload);
          console.log(`[Server Upload] Firestore upload successful! Document ID: ${docId}`);
        } catch (sdkError: any) {
          console.warn("[Server Upload] Firestore SDK set failed, trying REST fallback:", sdkError.message || sdkError);
          const restPayload = {
            name: file.originalname,
            mimetype: file.mimetype,
            createdAt: new Date().toISOString(),
          } as any;
          if (storageUrl) restPayload.storageUrl = storageUrl;
          if (base64Data) restPayload.base64 = base64Data;

          await writeDocViaRest("uploads", docId, restPayload, req);
          console.log(`[Server Upload] Firestore REST fallback write successful! Document ID: ${docId}`);
        }
      } catch (firestoreErr: any) {
        console.warn("[Server Upload] Firestore backup writes failed. Image is still available locally.", firestoreErr.message || firestoreErr);
      }

      // Always return the highly reliable local proxy endpoint!
      const downloadUrl = `/api/uploads/${docId}`;
      console.log(`[Server Upload] Responding with local proxy URL: ${downloadUrl}`);
      return res.json({ success: true, url: downloadUrl });

    } catch (error: any) {
      console.error("[Server Upload] Critical error:", error);
      res.status(500).json({ error: error.message || "Failed to upload image" });
    }
  });

  // API Route: Serve files from local filesystem or Firestore uploads collection fallback
  app.get("/api/uploads/:id", async (req: any, res: any) => {
    try {
      const id = req.params.id;
      const localUploadsDir = path.join(process.cwd(), "uploads");
      const localFilePath = path.join(localUploadsDir, id);
      const localMetaPath = path.join(localUploadsDir, `${id}.json`);

      // 1. Try serving from local disk first (100% reliable, fast, bypasses rules/network)
      if (fs.existsSync(localFilePath)) {
        const buffer = fs.readFileSync(localFilePath);
        let mimetype = "application/octet-stream";
        if (fs.existsSync(localMetaPath)) {
          try {
            const meta = JSON.parse(fs.readFileSync(localMetaPath, "utf-8"));
            if (meta.mimetype) mimetype = meta.mimetype;
          } catch (e) {
            // ignore
          }
        } else {
          // simple extension / prefix sniffer fallback
          if (buffer.slice(0, 4).toString("hex") === "89504e47") mimetype = "image/png";
          else if (buffer.slice(0, 3).toString("hex") === "ffd8ff") mimetype = "image/jpeg";
          else if (buffer.slice(8, 12).toString("ascii") === "WEBP") mimetype = "image/webp";
        }

        res.setHeader("Content-Type", mimetype);
        res.setHeader("Cache-Control", "public, max-age=31536000"); // Cache for 1 year
        console.log(`[Serve File] Served from local disk: ${id}, MimeType: ${mimetype}`);
        return res.end(buffer);
      }

      // 2. Local disk missed (e.g. after container restart). Fetch from Firestore, cache it, and serve!
      console.log(`[Serve File] Local disk miss for ID: ${id}. Attempting recovery from Firestore...`);
      let data: any = null;
      try {
        const adminDb = getAdminDb();
        const docSnap = await adminDb.collection("uploads").doc(id).get();
        if (docSnap.exists) {
          data = docSnap.data();
        }
      } catch (sdkError: any) {
        console.warn(`[Serve File] Admin SDK failed: ${sdkError.message || sdkError}. Trying REST fallback...`);
        try {
          data = await getDocViaRest("uploads", id, undefined, req);
        } catch (restError: any) {
          console.error(`[Serve File] REST fallback failed too: ${restError.message || restError}`);
        }
      }

      if (!data) {
        return res.status(404).send("File not found");
      }

      // If the document has a direct Firebase Storage link, we can proxy fetch it
      if (data.storageUrl) {
        try {
          console.log(`[Serve File] Proxying from Firebase Storage URL: ${data.storageUrl}`);
          const fetchRes = await fetch(data.storageUrl);
          if (fetchRes.ok) {
            const arrayBuffer = await fetchRes.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            // Cache it locally on disk for subsequent hits!
            try {
              if (!fs.existsSync(localUploadsDir)) {
                fs.mkdirSync(localUploadsDir, { recursive: true });
              }
              fs.writeFileSync(localFilePath, buffer);
              fs.writeFileSync(localMetaPath, JSON.stringify({
                originalname: data.name || id,
                mimetype: data.mimetype || fetchRes.headers.get("content-type") || "application/octet-stream",
                size: buffer.length,
                createdAt: new Date().toISOString()
              }));
            } catch (cacheError: any) {
              console.warn(`[Serve File] Warning: Failed to write local cache: ${cacheError.message}`);
            }

            res.setHeader("Content-Type", data.mimetype || fetchRes.headers.get("content-type") || "application/octet-stream");
            res.setHeader("Cache-Control", "public, max-age=31536000");
            return res.end(buffer);
          }
        } catch (e: any) {
          console.warn(`[Serve File] Failed to fetch proxy from Firebase Storage storageUrl: ${e.message}`);
        }
      }

      if (!data.base64) {
        return res.status(404).send("File data not found");
      }

      const buffer = Buffer.from(data.base64, "base64");

      // Cache it locally on disk for subsequent hits!
      try {
        if (!fs.existsSync(localUploadsDir)) {
          fs.mkdirSync(localUploadsDir, { recursive: true });
        }
        fs.writeFileSync(localFilePath, buffer);
        fs.writeFileSync(localMetaPath, JSON.stringify({
          originalname: data.name || id,
          mimetype: data.mimetype || "application/octet-stream",
          size: buffer.length,
          createdAt: new Date().toISOString()
        }));
      } catch (cacheError: any) {
        console.warn(`[Serve File] Warning: Failed to write local cache: ${cacheError.message}`);
      }

      res.setHeader("Content-Type", data.mimetype || "application/octet-stream");
      res.setHeader("Cache-Control", "public, max-age=31536000"); // Cache for 1 year
      console.log(`[Serve File] Served and cached from Firestore base64 backup: ${id}`);
      return res.end(buffer);
    } catch (error: any) {
      console.error("[Serve File Error]:", error);
      return res.status(500).send("Error serving file");
    }
  });

  // API Route: Send Email
  app.post("/api/send-email", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      console.log(`[API /api/send-email] Request received. To: ${req.body.to}, Type: ${req.body.type}`);
      
      const result = await handleSendEmail(req.body, authHeader);
      console.log(`[API /api/send-email] Success:`, result);
      res.json(result);
    } catch (error: any) {
      console.error("[Email Proxy Error]:", error);
      res.status(500).json({ 
        error: error.message || "Internal server error",
        stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
      });
    }
  });

  // API Route: Contact Form Submission & Email Integration
  app.post("/api/contact", async (req, res) => {
    try {
      const { tenantId, name, email, phone, subject, message } = req.body;
      if (!name || !email || !message) {
        return res.status(400).json({ error: "Name, email, and message are required fields." });
      }

      console.log(`[API /api/contact] Form submission received. Name: ${name}, Email: ${email}, Tenant: ${tenantId || 'global'}`);

      // Resolve email config for the specific tenant
      const resolvedTenantId = tenantId || 'global';
      const config = await resolveEmailConfig(resolvedTenantId);

      // Get tenant's settings to find their support email address
      const adminDb = getAdminDb();
      const settingsDoc = await adminDb.collection('settings').doc(resolvedTenantId === 'global' ? 'general' : resolvedTenantId).get();
      let recipientEmail = 'support@tripbone.com'; // fallback
      let siteName = 'Our Platform';

      if (settingsDoc.exists) {
        const data = settingsDoc.data();
        if (data?.supportEmail) {
          recipientEmail = data.supportEmail;
        } else if (data?.contactEmail) {
          recipientEmail = data.contactEmail;
        }
        if (data?.siteName) {
          siteName = data.siteName;
        }
      }

      console.log(`[API /api/contact] Mailing inquiry to: ${recipientEmail} for tenant ${resolvedTenantId}`);

      // Prepare email HTML content
      const htmlContent = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #f1f5f9; border-radius: 16px; background-color: #ffffff;">
          <h2 style="color: #ea580c; border-bottom: 2px solid #ffedd5; padding-bottom: 12px; margin-top: 0;">New Contact Inquiry</h2>
          <p style="color: #475569; font-size: 15px; line-height: 1.5;">You have received a new customer inquiry from your website's contact form on <strong>${siteName}</strong>:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 24px 0; font-size: 14px;">
            <tr>
              <td style="padding: 10px 8px; font-weight: bold; width: 120px; border-bottom: 1px solid #f1f5f9; color: #64748b;">Full Name:</td>
              <td style="padding: 10px 8px; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-weight: 500;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 10px 8px; font-weight: bold; border-bottom: 1px solid #f1f5f9; color: #64748b;">Email:</td>
              <td style="padding: 10px 8px; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-weight: 500;"><a href="mailto:${email}" style="color: #f97316; text-decoration: none;">${email}</a></td>
            </tr>
            <tr>
              <td style="padding: 10px 8px; font-weight: bold; border-bottom: 1px solid #f1f5f9; color: #64748b;">Phone/WA:</td>
              <td style="padding: 10px 8px; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-weight: 500;">${phone || 'Not provided'}</td>
            </tr>
            <tr>
              <td style="padding: 10px 8px; font-weight: bold; border-bottom: 1px solid #f1f5f9; color: #64748b;">Subject:</td>
              <td style="padding: 10px 8px; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-weight: 500;">${subject || 'General Inquiry'}</td>
            </tr>
          </table>
          <div style="background-color: #fafafa; padding: 20px; border-radius: 12px; border-left: 4px solid #f97316; margin-top: 24px;">
            <p style="margin-top: 0; font-weight: bold; color: #0f172a; font-size: 14px;">Customer Message:</p>
            <p style="white-space: pre-wrap; color: #334155; font-size: 14px; line-height: 1.6; margin-bottom: 0;">${message}</p>
          </div>
          <p style="font-size: 11px; color: #94a3b8; margin-top: 36px; text-align: center; border-t: 1px dashed #e2e8f0; padding-top: 20px;">This email was automatically routed and dispatched via the ${siteName} Contact Gateway.</p>
        </div>
      `;

      // Save the inquiry to Firestore so it can be managed by the tenant or platform in their CRM
      try {
        await adminDb.collection('inquiries').add({
          tenantId: resolvedTenantId,
          name,
          email,
          phone: phone || '',
          subject: subject || 'General Inquiry',
          message,
          createdAt: new Date().toISOString(),
          status: 'unread'
        });
        console.log(`[API /api/contact] Inquiry successfully saved to Firestore for tenant ${resolvedTenantId}`);
      } catch (dbError: any) {
        console.error("[API /api/contact] Warning: Failed to write inquiry to Firestore:", dbError.message);
      }

      // Fallback override to Resend if provider is 'none' but process.env has RESEND_API_KEY
      if ((config.emailProvider === 'none' || !config.emailApiKey) && process.env.RESEND_API_KEY) {
        config.emailProvider = 'resend';
        config.emailApiKey = process.env.RESEND_API_KEY;
        if (config.senderEmail === 'onboarding@resend.dev') {
          config.senderEmail = process.env.SENDER_EMAIL || 'onboarding@resend.dev';
        }
      }

      if (config.emailProvider && config.emailProvider !== 'none' && config.emailApiKey) {
        try {
          await sendEmailViaProvider(config, {
            to: [recipientEmail],
            subject: `[Contact Inquiry] ${subject || 'New Message'} - ${name}`,
            html: htmlContent
          });
          res.json({ success: true, message: "Your message has been sent successfully." });
        } catch (mailError: any) {
          console.error("[API /api/contact] Mail dispatch failed, fallback to DB log:", mailError.message);
          res.json({ success: true, message: "Your message has been recorded successfully in our system." });
        }
      } else {
        console.warn("[API /api/contact] Warning: No active email provider configured for tenant contact routing. Recorded in database.");
        res.json({ success: true, message: "Your message has been recorded successfully in our system." });
      }
    } catch (error: any) {
      console.error("[API /api/contact] Error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // API Route: Send Secure OTP Verification Email
  app.post("/api/send-otp", async (req, res) => {
    try {
      const { email, otp } = req.body;
      if (!email || !otp) {
        return res.status(400).json({ success: false, error: "Email and OTP are required parameters." });
      }

      console.log(`[API /api/send-otp] Request received to send secure OTP to: ${email}`);
      const resolvedTenantId = req.body.tenantId || 'global';
      const emailConfig = await resolveEmailConfig(resolvedTenantId);

      // Fallback override to Resend if provider is 'none' or 'empty' but process.env has RESEND_API_KEY
      if ((emailConfig.emailProvider === 'none' || !emailConfig.emailApiKey) && process.env.RESEND_API_KEY) {
        emailConfig.emailProvider = 'resend';
        emailConfig.emailApiKey = process.env.RESEND_API_KEY;
        if (emailConfig.senderEmail === 'onboarding@resend.dev') {
          emailConfig.senderEmail = process.env.SENDER_EMAIL || 'onboarding@resend.dev';
        }
      }

      if (emailConfig.emailProvider && emailConfig.emailProvider !== 'none' && emailConfig.emailApiKey) {
        console.log(`[API /api/send-otp] Sending security code via configured provider: ${emailConfig.emailProvider}`);

        const otpHtmlContent = `
          <p style="font-size: 15px; color: #1e293b; line-height: 1.6; margin: 0 0 15px 0;">
            Hello,
          </p>
          <p style="font-size: 15px; color: #1e293b; line-height: 1.6; margin: 0 0 20px 0;">
            You are receiving this email because a secure sign-in or security verification request was initiated for your Tripbone account.
          </p>
          <p style="font-size: 15px; color: #1e293b; line-height: 1.6; margin: 0 0 15px 0;">
            Your 6-digit secure authentication code is:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="display: inline-block; background-color: #f1f5f9; color: #0f172a; padding: 12px 24px; font-size: 24px; font-weight: 800; font-family: monospace; border-radius: 8px; border: 1px solid #e2e8f0; letter-spacing: 4px;">
              ${otp}
            </span>
          </div>
          <p style="font-size: 14px; color: #64748b; line-height: 1.6; margin: 0 0 15px 0;">
            This verification code will expire shortly. If you did not initiate this request, please secure your account immediately or contact support.
          </p>
        `;

        const emailHtml = emailBaseTemplate(
          "Security Verification",
          "Secure OTP Code",
          otpHtmlContent,
          emailConfig
        );

        await sendEmailViaProvider(emailConfig, {
          to: [email],
          subject: `Tripbone Secure OTP Code: ${otp}`,
          html: emailHtml
        });

        console.log(`[API /api/send-otp] Secure OTP successfully sent to: ${email}`);
        return res.json({ success: true, message: "Security verification code successfully dispatched." });
      } else {
        console.warn("[API /api/send-otp] No active email provider configured. Falling back to console logging.");
        return res.json({ 
          success: true, 
          fallback: true,
          message: "Email provider is not configured. OTP code was output to server console." 
        });
      }
    } catch (error: any) {
      console.error("[API /api/send-otp] Error dispatching secure OTP:", error);
      res.status(500).json({ 
        success: false,
        error: error.message || "Failed to dispatch secure OTP code."
      });
    }
  });

  // API Route: Forgot Password (generate OTP and send email)
  app.post("/api/auth/forgot-password-otp", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, error: "Email is a required parameter." });
      }

      const emailLower = email.trim().toLowerCase();
      const db = getAdminDb();
      
      console.log(`[API /api/auth/forgot-password-otp] Initiating forgot password for: ${emailLower}`);

      // 1. Verify that a user profile exists with this email address
      const usersQuery = await db.collection('users')
        .where('email', '==', emailLower)
        .limit(1)
        .get();

      if (usersQuery.empty) {
        return res.status(404).json({ success: false, error: "No user account was found with this email address." });
      }

      // 2. Generate a random secure 6-digit OTP code
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes expiry

      // 3. Store OTP session in 'password_resets'
      await db.collection('password_resets').add({
        email: emailLower,
        otp,
        expiresAt: expiresAt.toISOString(),
        createdAt: new Date().toISOString()
      });

      console.log(`[API /api/auth/forgot-password-otp] Generated OTP ${otp} for ${emailLower}`);

      // 4. Resolve tenant or global settings to send the email
      const resolvedTenantId = req.body.tenantId || 'global';
      const emailConfig = await resolveEmailConfig(resolvedTenantId);

      // Fallback override to Resend if provider is 'none' or 'empty' but process.env has RESEND_API_KEY
      if ((emailConfig.emailProvider === 'none' || !emailConfig.emailApiKey) && process.env.RESEND_API_KEY) {
        emailConfig.emailProvider = 'resend';
        emailConfig.emailApiKey = process.env.RESEND_API_KEY;
        if (emailConfig.senderEmail === 'onboarding@resend.dev') {
          emailConfig.senderEmail = process.env.SENDER_EMAIL || 'onboarding@resend.dev';
        }
      }

      if (emailConfig.emailProvider && emailConfig.emailProvider !== 'none' && emailConfig.emailApiKey) {
        console.log(`[API /api/auth/forgot-password-otp] Dispatching OTP via: ${emailConfig.emailProvider}`);

        const otpHtmlContent = `
          <p style="font-size: 15px; color: #1e293b; line-height: 1.6; margin: 0 0 15px 0;">
            Hello,
          </p>
          <p style="font-size: 15px; color: #1e293b; line-height: 1.6; margin: 0 0 20px 0;">
            A request was made to reset the password for your Tripbone account. Use the secure verification code below to authorize this password change.
          </p>
          <p style="font-size: 15px; color: #1e293b; line-height: 1.6; margin: 0 0 15px 0;">
            Your secure password reset verification code is:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="display: inline-block; background-color: #f1f5f9; color: #0f172a; padding: 12px 24px; font-size: 24px; font-weight: 800; font-family: monospace; border-radius: 8px; border: 1px solid #e2e8f0; letter-spacing: 4px;">
              ${otp}
            </span>
          </div>
          <p style="font-size: 14px; color: #64748b; line-height: 1.6; margin: 0 0 15px 0;">
            This security code is active for 15 minutes. If you did not request this password change, please ignore this email and your password will remain unchanged.
          </p>
        `;

        const emailHtml = emailBaseTemplate(
          "Password Reset Code",
          "Secure Verification Code",
          otpHtmlContent,
          emailConfig
        );

        await sendEmailViaProvider(emailConfig, {
          to: [emailLower],
          subject: `Tripbone Password Reset Code: ${otp}`,
          html: emailHtml
        });

        console.log(`[API /api/auth/forgot-password-otp] Password reset OTP sent to: ${emailLower}`);
        return res.json({ success: true, message: "A secure verification code has been sent to your email address." });
      } else {
        console.warn("[API /api/auth/forgot-password-otp] No active email provider configured. Fallback code logged.");
        return res.json({ 
          success: true, 
          fallback: true,
          otp, // Return the OTP to client for preview testing in case there is no email provider configured
          message: "Email provider is not configured. OTP code was output to server console." 
        });
      }
    } catch (error: any) {
      console.error("[API /api/auth/forgot-password-otp] Error:", error);
      res.status(500).json({ 
        success: false,
        error: error.message || "Failed to generate or send password reset verification code."
      });
    }
  });

  // API Route: Reset Password with OTP
  app.post("/api/auth/reset-password-otp", async (req, res) => {
    try {
      const { email, otp, password } = req.body;
      if (!email || !otp || !password) {
        return res.status(400).json({ success: false, error: "Email, OTP, and new password are required fields." });
      }

      const emailLower = email.trim().toLowerCase();
      const otpCode = otp.trim();
      const db = getAdminDb();

      console.log(`[API /api/auth/reset-password-otp] Attempting password reset for: ${emailLower}`);

      // 1. Query the 'password_resets' collection for valid matching session
      const resetsQuery = await db.collection('password_resets')
        .where('email', '==', emailLower)
        .where('otp', '==', otpCode)
        .get();

      if (resetsQuery.empty) {
        return res.status(400).json({ success: false, error: "Invalid verification code. Please check the code and try again." });
      }

      // Check if code has expired
      let validResetDoc: any = null;
      for (const d of resetsQuery.docs) {
        const data = d.data();
        const expiresAt = new Date(data.expiresAt);
        if (expiresAt.getTime() >= Date.now()) {
          validResetDoc = d;
          break;
        }
      }

      if (!validResetDoc) {
        return res.status(400).json({ success: false, error: "The verification code has expired. Please request a new one." });
      }

      // 2. Perform password update in Firebase Authentication
      try {
        const app = getAdminApp();
        const userRecord = await admin.auth().getUserByEmail(emailLower);
        await admin.auth().updateUser(userRecord.uid, { password: password });
        console.log(`[API /api/auth/reset-password-otp] Password updated successfully in Auth for UID: ${userRecord.uid}`);
      } catch (authError: any) {
        console.error("[API /api/auth/reset-password-otp] Firebase Auth updateUser failed:", authError);
        return res.status(500).json({ 
          success: false, 
          error: "Auth update failed. " + (authError.message || "Please make sure your new password is at least 6 characters.")
        });
      }

      // 3. Delete OTP record from Firestore to prevent double use
      await db.collection('password_resets').doc(validResetDoc.id).delete();
      console.log(`[API /api/auth/reset-password-otp] Successfully consumed and deleted OTP session: ${validResetDoc.id}`);

      return res.json({ success: true, message: "Your password has been reset successfully. You can now log in with your new password." });
    } catch (error: any) {
      console.error("[API /api/auth/reset-password-otp] Error:", error);
      res.status(500).json({ 
        success: false,
        error: error.message || "An unexpected error occurred while resetting your password."
      });
    }
  });

  // API Route: Image Proxy to bypass Hotlinking/Referer protections on CDNs
  app.get("/api/image-proxy", async (req, res) => {
    try {
      const imageUrl = req.query.url as string;
      if (!imageUrl) {
        return res.status(400).send("url query parameter is required");
      }

      const parsedUrl = new URL(imageUrl);
      console.log(`[Image Proxy] Fetching: ${imageUrl}`);

      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Referer": `${parsedUrl.protocol}//${parsedUrl.host}/`,
          "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
        },
        timeout: 10000
      });

      let contentType = response.headers["content-type"] || "image/jpeg";
      if (typeof contentType !== "string") {
        contentType = "image/jpeg";
      }
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=2592000"); // 30 days caching

      res.send(Buffer.from(response.data));
    } catch (error: any) {
      console.error("[Image Proxy Error]:", error.message || error);
      res.status(500).send("Error proxying image");
    }
  });

  // API Route: Provision SaaS Workspace securely with backend authority and password syncing fallbacks
  app.post("/api/provision-workspace", async (req: any, res: any) => {
    try {
      const {
        companyName,
        slug,
        adminName,
        adminEmail,
        adminPassword,
        plan,
        primaryColor,
        secondaryColor,
        currency,
        email,
        phone,
        address
      } = req.body;

      let finalAdminEmail = adminEmail;
      let finalAdminName = adminName;
      let uid: string;
      let isNewUser = false;

      // Initialize Admin App
      getAdminApp();
      const db = getAdminDb();

      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        // Logged-in session path
        const idToken = authHeader.split("Bearer ")[1];
        try {
          const decodedToken = await admin.auth().verifyIdToken(idToken);
          uid = decodedToken.uid;
          finalAdminEmail = decodedToken.email || adminEmail;
          finalAdminName = decodedToken.name || adminName || finalAdminEmail.split('@')[0];
          console.log(`[Provision API] User authenticated via ID token. UID: ${uid}, Email: ${finalAdminEmail}`);
        } catch (tokenErr: any) {
          console.error(`[Provision API] Failed to verify auth token:`, tokenErr.message);
          return res.status(401).json({ error: `Invalid session token: ${tokenErr.message}` });
        }
      } else {
        // Guest registration path (requires adminEmail and adminPassword)
        if (!slug || !adminEmail || !adminPassword) {
          return res.status(400).json({ error: "Missing required parameters (slug, adminEmail, adminPassword)" });
        }

        try {
          const userRecord = await admin.auth().getUserByEmail(adminEmail);
          uid = userRecord.uid;
          // Sync password with what they typed to prevent mismatch errors
          await admin.auth().updateUser(uid, {
            password: adminPassword,
            displayName: adminName || finalAdminName
          });
          console.log(`[Provision API] User already exists in Auth. Password synchronized successfully for UID: ${uid}`);
        } catch (authErr: any) {
          if (authErr.code === 'auth/user-not-found') {
            isNewUser = true;
            const newUserRecord = await admin.auth().createUser({
              email: adminEmail,
              password: adminPassword,
              displayName: adminName || finalAdminName,
              emailVerified: true
            });
            uid = newUserRecord.uid;
            console.log(`[Provision API] Created new Auth user with UID: ${uid}`);
          } else {
            console.error(`[Provision API] Firebase Auth operation failed:`, authErr.message);
            return res.status(500).json({ error: `Authentication service error: ${authErr.message}` });
          }
        }
      }

      console.log(`[Provision API] Starting secure tenant workspace creation for slug: ${slug}, admin: ${finalAdminEmail}`);

      // Check slug uniqueness
      let slugExists = false;
      try {
        const tenantsSnap = await db.collection("tenants").where("slug", "==", slug).get();
        slugExists = !tenantsSnap.empty;
      } catch (e: any) {
        console.warn(`[Provision API] Admin SDK query failed, trying REST query for slug uniqueness check:`, e.message);
        try {
          const docs = await fetchFromREST("tenants", undefined, {
            whereFilters: [{ field: "slug", op: "EQUAL", value: slug }]
          });
          slugExists = !!(docs && docs.length > 0);
        } catch (restErr: any) {
          console.error(`[Provision API] REST query also failed:`, restErr.message);
        }
      }

      if (slugExists) {
        return res.status(400).json({ error: `Workspace slug "${slug}" is already taken. Please choose another.` });
      }

      const tenantId = `tenant_${slug}_${Date.now().toString(36)}`;

      // Helper function for Firestore Set Doc
      const safeSetDoc = async (collection: string, docId: string, data: any) => {
        try {
          if (db) {
            await db.collection(collection).doc(docId).set(data);
            console.log(`[Provision API] Wrote ${collection}/${docId} using Admin SDK`);
            return true;
          }
        } catch (sdkErr: any) {
          console.warn(`[Provision API] Admin SDK set failed for ${collection}/${docId}:`, sdkErr.message);
        }
        console.log(`[Provision API] Falling back to REST PATCH for ${collection}/${docId}`);
        const restRes = await writeDocViaRest(collection, docId, data, req);
        return !!restRes;
      };

      // Helper function for Firestore Add Doc
      const safeAddDoc = async (collection: string, data: any) => {
        try {
          if (db) {
            const ref = await db.collection(collection).add(data);
            console.log(`[Provision API] Added to ${collection} using Admin SDK, ID: ${ref.id}`);
            return ref.id;
          }
        } catch (sdkErr: any) {
          console.warn(`[Provision API] Admin SDK add failed for ${collection}:`, sdkErr.message);
        }
        console.log(`[Provision API] Falling back to REST POST for ${collection}`);
        const restRes = await createDocViaRest(collection, data, req);
        if (restRes && restRes.name) {
          return restRes.name.split("/").pop();
        }
        return null;
      };

      // 1. Create User Profile
      const userProfile = {
        uid: uid,
        email: finalAdminEmail,
        displayName: finalAdminName,
        photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(finalAdminName)}`,
        role: 'admin',
        status: 'active',
        tenantId: tenantId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await safeSetDoc('users', uid, userProfile);

      // 2. Create Tenant space document
      const newTenantData = {
        companyName: companyName,
        slug: slug,
        plan: plan || 'starter',
        status: 'trial',
        trialEnds: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        primaryColor: primaryColor || '#4f46e5',
        secondaryColor: secondaryColor || '#8b5cf6',
        currency: currency || 'USD',
        email: email || finalAdminEmail,
        adminEmail: finalAdminEmail,
        phone: phone || '',
        address: address || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        emailVerified: false
      };
      await safeSetDoc('tenants', tenantId, newTenantData);

      // 3. Create Settings document
      const settingsData = {
        siteName: companyName,
        siteTitle: `${companyName} | Premium Tour Operator`,
        siteDescription: `Explore amazing tours and travel packages curated by ${companyName}.`,
        primaryColor: primaryColor || '#4f46e5',
        secondaryColor: secondaryColor || '#8b5cf6',
        currency: currency || 'USD',
        supportEmail: finalAdminEmail,
        enableAIHub: true,
        enableAIPlanner: true,
        enableChatbot: true,
        tenantId: tenantId
      };
      await safeSetDoc('settings', tenantId, settingsData);

      // 4. Create welcome tours (Seed 3 diverse packages)
      const toursToSeed = [
        {
          title: `Signature ${companyName} Exploration`,
          description: `Experience the best of what our curated packages have to offer on this magnificent guided expedition. Designed exclusively by ${companyName} for premium traveler satisfaction.`,
          duration: 3,
          durationUnit: 'Days',
          regularPrice: 499,
          status: 'active',
          images: ['https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80'],
          itinerary: [
            { day: 1, title: 'Welcome and Briefing', description: 'Arrive and check in. Meet your expert local hosts.' },
            { day: 2, title: 'The Grand Exploration', description: 'Participate in our core signature curated activities.' },
            { day: 3, title: 'Farewell Celebration', description: 'Enjoy our signature closing meal and departures.' }
          ],
          capacity: 12,
          difficulty: 'Easy',
          highlights: ['Professional Local Guides', 'Handcrafted Dining Experiences', 'All transfers included'],
          tenantId: tenantId,
          createdAt: new Date().toISOString()
        },
        {
          title: 'Wilderness & Active Adventure Trek',
          description: 'Get off the beaten path and experience raw nature on this thrill-seeking active day tour. Explore hidden paths, cross local bridges, and witness stunning canyon panoramas.',
          duration: 1,
          durationUnit: 'Day',
          regularPrice: 129,
          status: 'active',
          images: ['https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80'],
          itinerary: [
            { day: 1, title: 'Morning Trek & Canopy Walk', description: 'Begin early with a forest climb and scenic lookouts.' },
            { day: 2, title: 'Canyon Rafting & Picnic', description: 'Descend into the valley for river rafting and a fresh organic lunch.' }
          ],
          capacity: 8,
          difficulty: 'Moderate',
          highlights: ['Safety Equipment Provided', 'Gourmet Trail Lunch Included', 'Park Entry & Wildlife Fees Paid'],
          tenantId: tenantId,
          createdAt: new Date().toISOString()
        },
        {
          title: 'Wellness & Cultural Heritage Retreat',
          description: 'Rejuvenate your senses on this peaceful escape. Immerse yourself in local wellness rituals, historical heritage sites, and organic culinary experiences.',
          duration: 2,
          durationUnit: 'Days',
          regularPrice: 299,
          status: 'active',
          images: ['https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=800&q=80'],
          itinerary: [
            { day: 1, title: 'Meditation & Temple Tour', description: 'Morning breathing session followed by a private tour of historic local temples.' },
            { day: 2, title: 'Hot Springs & Spa Session', description: 'Soak in thermal natural hot springs followed by a signature local massage therapy.' }
          ],
          capacity: 10,
          difficulty: 'Easy',
          highlights: ['Wellness Instructors', 'Mineral Hot Springs access', 'Fresh Vegan & Organic Menu'],
          tenantId: tenantId,
          createdAt: new Date().toISOString()
        }
      ];

      for (const tour of toursToSeed) {
        await safeAddDoc('tours', tour);
      }

      // Seed mock blog posts (posts)
      const blogsToSeed = [
        {
          title: `10 Hidden Spots You Must Visit in ${companyName} Destinations`,
          excerpt: 'Discover secret pathways, private waterfalls, and stunning viewpoints that most tourists completely miss out on.',
          featuredImage: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=800&q=80',
          category: 'Guides',
          slug: 'hidden-spots-to-visit',
          status: 'published',
          content: `<p>Welcome to our traveler journal! Today, we are opening up our private operator registry to share the top secret spots that make our tours so unique.</p><p>First up is the hidden canyon trail, located just off the main valley highway. Here, you will find pristine blue pools and zero crowds. Make sure to pack sturdy hiking boots and carry plenty of hydration.</p><p>Next, do not miss the sunset cliffs during golden hour. While most travelers crowd the popular beaches, this spot offers quiet serenity and views stretching out over the entire mountain range.</p>`,
          tenantId: tenantId,
          createdAt: new Date().toISOString()
        },
        {
          title: 'The Ultimate Packing Guide For Curated Day Excursions',
          excerpt: 'Stressed about packing? Use our checklist to pack exactly what you need for safety, style, and comfort.',
          featuredImage: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80',
          category: 'Tips',
          slug: 'ultimate-packing-guide',
          status: 'published',
          content: `<p>Packing for a new adventure does not have to be overwhelming. Over the years, our professional tour guides have compiled this essential list to help you travel light while carrying everything you need.</p><h3>1. Core Essentials</h3><ul><li>Reusable insulated water flask</li><li>Eco-friendly high-SPF sunscreen</li><li>Lightweight waterproof windbreaker</li></ul><h3>2. Footwear</h3><p>We always advise wearing closed-toe trail shoes or athletic sneakers with deep tread grip. Canyons and forest trails can get wet and slippery, so good grip is your number one safety check.</p>`,
          tenantId: tenantId,
          createdAt: new Date().toISOString()
        }
      ];

      for (const blog of blogsToSeed) {
        await safeAddDoc('posts', blog);
      }

      // Seed mock customer reviews (reviews)
      const reviewsToSeed = [
        {
          userName: 'Marcus Sterling',
          nationality: 'United Kingdom',
          comment: `Our signature exploration trip with ${companyName} was the absolute highlight of our vacation! The local guides were incredibly friendly, and the small group size made it feel highly personal and exclusive. 10/10 recommended!`,
          rating: 5,
          userPhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&h=120&q=80',
          tenantId: tenantId,
          createdAt: new Date().toISOString()
        },
        {
          userName: 'Elena Rostova',
          nationality: 'Canada',
          comment: 'Perfect organization and stunning locations. The online customer dashboard made tracking our tickets and schedules simple, and the AI booking assistant was extremely helpful with packing recommendations.',
          rating: 5,
          userPhoto: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&h=120&q=80',
          tenantId: tenantId,
          createdAt: new Date().toISOString()
        },
        {
          userName: 'Kenji Tanaka',
          nationality: 'Japan',
          comment: 'Excellent wellness day tour. The thermal springs were highly rejuvenating and the vegan organic lunch menu was fantastic. Very professional service throughout.',
          rating: 5,
          userPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&h=120&q=80',
          tenantId: tenantId,
          createdAt: new Date().toISOString()
        }
      ];

      for (const review of reviewsToSeed) {
        await safeAddDoc('reviews', review);
      }

      // Seed AI Concierge FAQs & Tips (aiFaqs, aiTips)
      const faqsToSeed = [
        {
          question: 'What is your reservation cancellation policy?',
          answer: 'We offer a full 100% refund for all bookings cancelled at least 48 hours before the scheduled tour start time. Cancellations made within 48 hours are non-refundable but can be rescheduled for free.',
          helpfulCount: 24,
          tenantId: tenantId,
          createdAt: new Date().toISOString()
        },
        {
          question: 'Are meals and transport included in the pricing?',
          answer: 'Yes! All signature exploration and wellness retreats include round-trip transfers from designated local hotels, organic lunches, safety equipment, and national park entrance tickets. Check individual tour highlights to confirm.',
          helpfulCount: 15,
          tenantId: tenantId,
          createdAt: new Date().toISOString()
        },
        {
          question: 'How do I download my travel tickets?',
          answer: 'Once payment completes, your digital tickets are instantly generated. You can download and print them directly from your Customer Portal Dashboard under the Tickets tab, or show the barcode on your smartphone during check-in.',
          helpfulCount: 38,
          tenantId: tenantId,
          createdAt: new Date().toISOString()
        }
      ];

      for (const faq of faqsToSeed) {
        await safeAddDoc('aiFaqs', faq);
      }

      const tipsToSeed = [
        {
          title: 'Eco-Friendly Footprint',
          category: 'Sustainability',
          description: 'Help us protect local environments by carrying a reusable water bottle. Single-use plastics are prohibited in several protected nature areas.',
          tenantId: tenantId,
          createdAt: new Date().toISOString()
        },
        {
          title: 'Early Arrival Check',
          category: 'Logistics',
          description: 'We suggest arriving at the designated hotel lobby or meeting point 15 minutes before the departure time to facilitate boarding check-in.',
          tenantId: tenantId,
          createdAt: new Date().toISOString()
        }
      ];

      for (const tip of tipsToSeed) {
        await safeAddDoc('aiTips', tip);
      }

      // Seed Urgency Points (urgencyPoints)
      const urgencyPointsToSeed = [
        {
          text: 'Best Seller - Limited slots left this month',
          type: 'limit',
          tenantId: tenantId,
          createdAt: new Date().toISOString()
        },
        {
          text: 'Highly Rated by over 100+ travelers',
          type: 'social',
          tenantId: tenantId,
          createdAt: new Date().toISOString()
        },
        {
          text: 'Includes free hotel shuttle pickup & drop-off',
          type: 'value',
          tenantId: tenantId,
          createdAt: new Date().toISOString()
        }
      ];

      for (const pt of urgencyPointsToSeed) {
        await safeAddDoc('urgencyPoints', pt);
      }

      // 5. Create simulated activation notification
      const notificationData = {
        title: 'Account Provisioned & Activated',
        body: `Welcome to Tripbone, ${finalAdminName}! Your tenant space "${companyName}" has been successfully initialized and activated under plan: ${plan || 'growth'}. You can now manage your tours, bookings, and guides from your dashboard.`,
        url: '/admin',
        read: false,
        tenantId: tenantId,
        createdAt: new Date().toISOString()
      };
      await safeAddDoc('notifications', notificationData);

      // 6. Generate Custom Token for SSO
      let customToken: string | null = null;
      try {
        customToken = await admin.auth().createCustomToken(uid);
        console.log(`[Provision API] Successfully generated custom token for UID: ${uid}`);
      } catch (tokenErr: any) {
        console.warn(`[Provision API] Could not generate custom token via SDK:`, tokenErr.message);
      }

      console.log(`[Provision API] Successfully completed all workspace provisioning steps for tenantId: ${tenantId}`);

      // 7. Send registration notifications via Resend / configured provider
      try {
        const emailConfig = await resolveEmailConfig('global');
        
        // Dynamic fallback override to Resend if provider is 'none' or 'empty' but process.env has RESEND_API_KEY
        if ((emailConfig.emailProvider === 'none' || !emailConfig.emailApiKey) && process.env.RESEND_API_KEY) {
          emailConfig.emailProvider = 'resend';
          emailConfig.emailApiKey = process.env.RESEND_API_KEY;
          if (emailConfig.senderEmail === 'onboarding@resend.dev') {
            emailConfig.senderEmail = process.env.SENDER_EMAIL || 'onboarding@resend.dev';
          }
        }

        if (emailConfig.emailProvider && emailConfig.emailProvider !== 'none' && emailConfig.emailApiKey) {
          console.log(`[Provision API] Attempting to send workspace registration emails using ${emailConfig.emailProvider}...`);

          const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
          const host = req.get('host');
          const workspaceUrl = `${protocol}://${host}/?tenant=${slug}`;
          const confirmationLink = `${protocol}://${host}/?confirmTenantId=${tenantId}`;

          // Format HTML content for Tenant Confirmation
          const tenantHtmlContent = `
            <p style="font-size: 15px; color: #1e293b; line-height: 1.6; margin: 0 0 15px 0;">
              Hello ${finalAdminName || adminName || 'Workspace Admin'},
            </p>
            <p style="font-size: 15px; color: #1e293b; line-height: 1.6; margin: 0 0 20px 0;">
              Congratulations! Your new tour operator portal <strong>${companyName}</strong> has been successfully provisioned and activated under the <strong>${plan || 'growth'}</strong> plan tier.
            </p>
            <p style="font-size: 15px; color: #1e293b; line-height: 1.6; margin: 0 0 15px 0;">
              You can access your dedicated workspace and start managing your tours, packages, and custom page content using the button below:
            </p>
            <div style="text-align: center; margin: 25px 0;">
              <a href="${workspaceUrl}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 12px 28px; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 6px; box-shadow: 0 2px 4px rgba(79, 70, 229, 0.2);">
                Launch Your Workspace
              </a>
            </div>
            <p style="font-size: 15px; color: #1e293b; line-height: 1.6; margin: 0 0 15px 0;">
              <strong>Action Required: Confirm your email address</strong><br/>
              To fully activate and secure your workspace, please click the button below to verify your email address:
            </p>
            <div style="text-align: center; margin: 25px 0;">
              <a href="${confirmationLink}" style="display: inline-block; background-color: #00b272; color: #ffffff; padding: 12px 28px; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 6px; box-shadow: 0 2px 4px rgba(0, 178, 114, 0.2);">
                Confirm Email Address
              </a>
            </div>
            <p style="font-size: 15px; color: #1e293b; line-height: 1.6; margin: 0 0 15px 0;">
              <strong>Workspace Summary:</strong>
            </p>
            <table border="0" cellpadding="10" cellspacing="0" width="100%" style="border-collapse: collapse; background-color: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; margin-bottom: 25px;">
              <tr>
                <td style="font-size: 14px; font-weight: 600; color: #64748b; border-bottom: 1px solid #e2e8f0; width: 140px;">Workspace Slug</td>
                <td style="font-size: 14px; color: #0f172a; border-bottom: 1px solid #e2e8f0; font-family: monospace;">${slug}</td>
              </tr>
              <tr>
                <td style="font-size: 14px; font-weight: 600; color: #64748b; border-bottom: 1px solid #e2e8f0;">Admin Login Email</td>
                <td style="font-size: 14px; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${finalAdminEmail}</td>
              </tr>
              <tr>
                <td style="font-size: 14px; font-weight: 600; color: #64748b; border-bottom: 1px solid #e2e8f0;">Plan Tier</td>
                <td style="font-size: 14px; color: #0f172a; border-bottom: 1px solid #e2e8f0; text-transform: capitalize;">${plan || 'growth'}</td>
              </tr>
              <tr>
                <td style="font-size: 14px; font-weight: 600; color: #64748b;">Workspace URL</td>
                <td style="font-size: 14px; color: #4f46e5;">
                  <a href="${workspaceUrl}" style="color: #4f46e5; text-decoration: underline;">${workspaceUrl}</a>
                </td>
              </tr>
            </table>
            <p style="font-size: 14px; color: #64748b; line-height: 1.6; margin: 0 0 15px 0;">
              What's next? Seed content has been automatically prepared for you including welcome tours, blog templates, default system communication preferences, and basic settings! Log in to your Admin console at any time to begin customizing your design or generating new packages.
            </p>
          `;

          const tenantHtml = emailBaseTemplate(
            "Workspace Provisioned",
            `Your Portal is Live!`,
            tenantHtmlContent,
            emailConfig
          );

          // Send to Tenant Admin
          await sendEmailViaProvider(emailConfig, {
            to: [finalAdminEmail],
            subject: `Welcome to Tripbone! Your Workspace is Ready - ${companyName}`,
            html: tenantHtml
          });
          console.log(`[Provision API] Successfully sent tenant confirmation email to: ${finalAdminEmail}`);

          // Format HTML content for Superadmin Notification
          const superadminHtmlContent = `
            <p style="font-size: 15px; color: #1e293b; line-height: 1.6; margin: 0 0 15px 0;">
              Hello Superadmin,
            </p>
            <p style="font-size: 15px; color: #1e293b; line-height: 1.6; margin: 0 0 20px 0;">
              A new workspace has been successfully registered and provisioned on the Tripbone SaaS Platform. Below are the tenant details:
            </p>
            <table border="0" cellpadding="10" cellspacing="0" width="100%" style="border-collapse: collapse; background-color: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; margin-bottom: 25px;">
              <tr>
                <td style="font-size: 14px; font-weight: 600; color: #64748b; border-bottom: 1px solid #e2e8f0; width: 140px;">Company Name</td>
                <td style="font-size: 14px; color: #0f172a; border-bottom: 1px solid #e2e8f0; font-weight: 700;">${companyName}</td>
              </tr>
              <tr>
                <td style="font-size: 14px; font-weight: 600; color: #64748b; border-bottom: 1px solid #e2e8f0;">Workspace URL</td>
                <td style="font-size: 14px; color: #4f46e5; border-bottom: 1px solid #e2e8f0; font-weight: 600;">
                  <a href="${workspaceUrl}" style="color: #4f46e5; text-decoration: underline;">${workspaceUrl}</a>
                </td>
              </tr>
              <tr>
                <td style="font-size: 14px; font-weight: 600; color: #64748b; border-bottom: 1px solid #e2e8f0;">Plan Tier</td>
                <td style="font-size: 14px; color: #0f172a; border-bottom: 1px solid #e2e8f0; text-transform: capitalize;">${plan || 'growth'}</td>
              </tr>
              <tr>
                <td style="font-size: 14px; font-weight: 600; color: #64748b; border-bottom: 1px solid #e2e8f0;">Admin Name</td>
                <td style="font-size: 14px; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${finalAdminName}</td>
              </tr>
              <tr>
                <td style="font-size: 14px; font-weight: 600; color: #64748b; border-bottom: 1px solid #e2e8f0;">Admin Email</td>
                <td style="font-size: 14px; color: #0f172a; border-bottom: 1px solid #e2e8f0;"><a href="mailto:${finalAdminEmail}" style="color: #0f172a; text-decoration: none;">${finalAdminEmail}</a></td>
              </tr>
              <tr>
                <td style="font-size: 14px; font-weight: 600; color: #64748b; border-bottom: 1px solid #e2e8f0;">Currency</td>
                <td style="font-size: 14px; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${currency || 'USD'}</td>
              </tr>
              <tr>
                <td style="font-size: 14px; font-weight: 600; color: #64748b;">Phone / Address</td>
                <td style="font-size: 14px; color: #0f172a;">${phone || 'N/A'} ${address ? `(${address})` : ''}</td>
              </tr>
            </table>
            <div style="text-align: center; margin-top: 30px;">
              <a href="${protocol}://${host}/superadmin" style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 12px 24px; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 5px; box-shadow: 0 2px 4px rgba(79, 70, 229, 0.2);">
                Open Superadmin Console
              </a>
            </div>
          `;

          const superadminHtml = emailBaseTemplate(
            "New Tenant Registered",
            "Platform Alert",
            superadminHtmlContent,
            emailConfig
          );

          // Send to Superadmin (deduplicated across settings, env, and default contact to guarantee delivery)
          const superadminRecipients = Array.from(new Set([
            (emailConfig.adminNotificationEmail || '').trim().toLowerCase(),
            (process.env.ADMIN_EMAIL || '').trim().toLowerCase(),
            'baliadventours@gmail.com'
          ])).filter(email => {
            const trimmed = email.trim();
            return (
              trimmed &&
              trimmed.includes('@') &&
              !trimmed.includes('example.com') &&
              !trimmed.includes('demo.com') &&
              !trimmed.includes('yourdomain.com')
            );
          });

          console.log(`[Provision API] Discovered superadmin recipients for notification:`, superadminRecipients);

          for (const recipient of superadminRecipients) {
            try {
              await sendEmailViaProvider(emailConfig, {
                to: [recipient],
                subject: `[SaaS Notification] New Tenant Registered: ${companyName}`,
                html: superadminHtml
              });
              console.log(`[Provision API] Successfully sent superadmin notification email to: ${recipient}`);
            } catch (sendErr: any) {
              console.error(`[Provision API] Failed sending superadmin notification email to ${recipient}:`, sendErr.message || sendErr);
            }
          }
        } else {
          console.warn("[Provision API] No active email provider configured for SaaS system notifications.");
        }
      } catch (emailErr: any) {
        console.error(`[Provision API] Failed sending workspace notifications:`, emailErr.message || emailErr);
      }

      return res.json({
        success: true,
        uid: uid,
        tenantId: tenantId,
        customToken: customToken,
        isNewUser: isNewUser
      });

    } catch (err: any) {
      console.error(`[Provision API] Critical Error in workspace provisioning:`, err);
      return res.status(500).json({ error: err.message || "Failed to provision workspace" });
    }
  });

  // API Route: Delete SaaS Workspace and cascade delete all data securely
  app.post("/api/delete-workspace", async (req: any, res: any) => {
    try {
      const { tenantId } = req.body;
      
      if (!tenantId) {
        return res.status(400).json({ error: "Missing required parameter (tenantId)" });
      }
      
      console.log(`[Delete API] Starting secure deletion for workspace: ${tenantId}`);
      
      getAdminApp();
      const db = getAdminDb();
      
      // Helper to fetch and delete by tenantId
      const deleteCollectionByTenant = async (collection: string) => {
        try {
          if (db && !db._isFallback) {
            const snap = await db.collection(collection).where("tenantId", "==", tenantId).get();
            const batch = db.batch();
            snap.forEach((doc: any) => {
              batch.delete(doc.ref);
            });
            await batch.commit();
            console.log(`[Delete API] Deleted ${snap.size} docs from ${collection} via Admin SDK`);
          } else {
            console.warn(`[Delete API] No Admin SDK for ${collection}, falling back to REST query`);
            const docs = await fetchFromREST(collection, undefined, {
              whereFilters: [{ field: "tenantId", op: "EQUAL", value: tenantId }]
            });
            if (docs && docs.length > 0) {
              for (const doc of docs) {
                await deleteDocViaRest(collection, doc.id, req);
              }
              console.log(`[Delete API] Deleted ${docs.length} docs from ${collection} via REST`);
            }
          }
        } catch (e: any) {
          console.warn(`[Delete API] Failed deleting from ${collection}: ${e.message}`);
        }
      };

      // 1. Fetch all users for this tenant to delete Auth accounts
      try {
        let uidsToDelete: string[] = [];
        if (db && !db._isFallback) {
          const usersSnap = await db.collection("users").where("tenantId", "==", tenantId).get();
          usersSnap.forEach((doc: any) => uidsToDelete.push(doc.id));
        } else {
          const docs = await fetchFromREST("users", undefined, {
            whereFilters: [{ field: "tenantId", op: "EQUAL", value: tenantId }]
          });
          if (docs && docs.length > 0) {
            uidsToDelete = docs.map((d: any) => d.id);
          }
        }
        
        for (const uid of uidsToDelete) {
          try {
            await admin.auth().deleteUser(uid);
            console.log(`[Delete API] Deleted Auth user ${uid}`);
          } catch (authErr: any) {
            console.warn(`[Delete API] Auth deletion warning for ${uid}: ${authErr.message}`);
          }
        }
      } catch (e: any) {
         console.warn(`[Delete API] Error fetching users to delete Auth accounts: ${e.message}`);
      }

      // 2. Cascade delete documents by tenantId in collections
      const collectionsToClean = ["users", "tours", "bookings", "reviews", "aiFaqs", "aiTips", "notifications", "guides", "payouts"];
      for (const col of collectionsToClean) {
        await deleteCollectionByTenant(col);
      }

      // 3. Delete tenant and settings documents (direct ID)
      const safeDeleteDoc = async (col: string, id: string) => {
        try {
          if (db && !db._isFallback) {
             await db.collection(col).doc(id).delete();
             console.log(`[Delete API] Deleted ${col}/${id} via Admin SDK`);
          } else {
             await deleteDocViaRest(col, id, req);
             console.log(`[Delete API] Deleted ${col}/${id} via REST`);
          }
        } catch (e: any) {
          console.warn(`[Delete API] Failed deleting ${col}/${id}: ${e.message}`);
        }
      };

      await safeDeleteDoc("settings", tenantId);
      await safeDeleteDoc("tenants", tenantId);

      console.log(`[Delete API] Workspace ${tenantId} completely deleted.`);
      return res.json({ success: true });
    } catch (err: any) {
      console.error(`[Delete API] Critical Error in workspace deletion:`, err);
      return res.status(500).json({ error: err.message || "Failed to delete workspace" });
    }
  });

  // API Route: Delete User Account Securely
  app.post("/api/delete-user", async (req: any, res: any) => {
    try {
      const { uid } = req.body;
      if (!uid) {
        return res.status(400).json({ error: "Missing required parameter (uid)" });
      }

      console.log(`[Delete User API] Starting secure deletion for user: ${uid}`);
      getAdminApp();
      const db = getAdminDb();

      // Delete from Firebase Auth
      try {
        await admin.auth().deleteUser(uid);
        console.log(`[Delete User API] Deleted Auth user ${uid}`);
      } catch (authErr: any) {
        console.warn(`[Delete User API] Auth deletion warning for ${uid}: ${authErr.message}`);
      }

      // Delete from Firestore
      try {
        if (db && !db._isFallback) {
          await db.collection("users").doc(uid).delete();
          console.log(`[Delete User API] Deleted user document via Admin SDK`);
        } else {
          await deleteDocViaRest("users", uid, req);
          console.log(`[Delete User API] Deleted user document via REST`);
        }
      } catch (e: any) {
        console.warn(`[Delete User API] Failed deleting user document: ${e.message}`);
      }

      return res.json({ success: true });
    } catch (err: any) {
      console.error(`[Delete User API] Error:`, err);
      return res.status(500).json({ error: err.message || "Failed to delete user" });
    }
  });

  // API Route: Email Diagnostic
  app.get("/api/admin/email-diagnostic", async (req, res) => {
    try {
      // Use the safe resolver which handles Admin SDK and REST fallbacks
      const resolvedConfig = await resolveEmailConfig();

      // Fetch email_logs via Admin SDK first
      let logs: any[] = [];
      let firestoreConfigFound = false;

      try {
        const db = getAdminDb();
        const logsSnap = await db.collection("email_logs").orderBy("createdAt", "desc").limit(30).get();
        firestoreConfigFound = true;
        if (!logsSnap.empty) {
          logs = logsSnap.docs.map((doc: any) => {
            const data = doc.data() || {};
            return {
              id: doc.id,
              ...data,
              createdAt: data.createdAt ? (typeof data.createdAt.toDate === 'function' ? data.createdAt.toDate().toISOString() : data.createdAt) : undefined
            };
          });
        }
      } catch (sdkErr: any) {
        console.warn("[Diagnostic Admin SDK logs fetch failed, trying REST fallback]:", sdkErr.message);
        
        // Fetch email_logs via REST API as fallback
        const rootPath = process.cwd();
        const configPath = path.resolve(rootPath, "firebase-applet-config.json");

        if (fs.existsSync(configPath)) {
          firestoreConfigFound = true;
          const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
          const projectId = config.projectId;
          const databaseId = config.firestoreDatabaseId || "(default)";
          const apiKey = config.apiKey;
          const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/email_logs?key=${apiKey}&pageSize=30`;
          
          try {
            const restRes = await axios.get(url);
            if (restRes.data && restRes.data.documents) {
              logs = restRes.data.documents.map((doc: any) => {
                const fields = doc.fields || {};
                const mapped: Record<string, any> = {};
                for (const [key, val] of Object.entries(fields)) {
                  const v = val as any;
                  if ('stringValue' in v) mapped[key] = v.stringValue;
                  else if ('booleanValue' in v) mapped[key] = v.booleanValue;
                  else if ('integerValue' in v) mapped[key] = parseInt(v.integerValue, 10);
                  else if ('doubleValue' in v) mapped[key] = parseFloat(v.doubleValue);
                }
                return {
                  id: doc.name.split("/").pop(),
                  ...mapped,
                  createdAt: doc.createTime
                };
              });
            }
          } catch (restErr: any) {
            console.warn("[Diagnostic REST logs fetch failed]:", restErr.message);
          }
        }
      }

      // Safely mask secret values
      const maskSecret = (val: string) => {
        if (!val) return "undefined/empty";
        const trimmed = val.trim();
        if (trimmed.length < 8) return `present (length: ${trimmed.length})`;
        return `${trimmed.substring(0, 4)}...${trimmed.substring(trimmed.length - 4)} (length: ${trimmed.length})`;
      };

      res.json({
        success: true,
        firestoreConfigFound,
        activeEnvironment: {
          NODE_ENV: process.env.NODE_ENV,
          DEFAULT_EMAIL_PROVIDER: process.env.DEFAULT_EMAIL_PROVIDER,
          MAILJET_API_KEY_ENV_EXISTS: !!process.env.MAILJET_API_KEY,
          MAILJET_API_SECRET_ENV_EXISTS: !!process.env.MAILJET_API_SECRET,
          RESEND_API_KEY_ENV_EXISTS: !!process.env.RESEND_API_KEY,
        },
        resolvedConfiguration: {
          emailProvider: resolvedConfig.emailProvider,
          senderEmail: resolvedConfig.senderEmail,
          senderName: resolvedConfig.senderName,
          adminNotificationEmail: resolvedConfig.adminNotificationEmail,
          emailApiKey_masked: maskSecret(resolvedConfig.emailApiKey),
          emailApiKey_has_colon: resolvedConfig.emailApiKey ? resolvedConfig.emailApiKey.includes(":") : false
        },
        recentLogs: logs
      });
    } catch (err: any) {
      console.error("[Email Diagnostic Error]:", err);
      res.status(500).json({ error: err.message, stack: err.stack });
    }
  });

  // API Route: Full Site Backup (Admin Only)
  app.get("/api/admin/backup", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const idToken = authHeader?.startsWith('Bearer ') ? authHeader.split('Bearer ')[1] : undefined;

      // SECURITY: Verify user is admin
      const authResult = await verifyAdmin(idToken);
      if (!authResult.isAdmin) {
        return res.status(403).json({ error: "Unauthorized: Admin access required for backups." });
      }

      const db = getAdminDb();
      
      // Diagnostic: List collections
      console.log(`[Backup] Starting backup...`);
      
      const collections = [
        'tours', 
        'bookings', 
        'users', 
        'coupons', 
        'generalSettings', 
        'communicationSettings', 
        'inventory', 
        'reviews',
        'partnerSettings',
        'payouts',
        'posts',
        'locationMeta',
        'categories',
        'pages',
        'urgencyPoints',
        'tourLabels',
        'tourTypes',
        'popups',
        'guides',
        'globalAddOns'
      ];

      let collectionsToBackup = collections;
      const collectionsParam = req.query.collections as string;
      if (collectionsParam) {
        const requested = collectionsParam.split(',').map(c => c.trim()).filter(Boolean);
        collectionsToBackup = collections.filter(c => requested.includes(c));
        console.log(`[Backup] Performing partial backup for: ${collectionsToBackup.join(', ')}`);
      } else {
        console.log(`[Backup] Performing full system backup...`);
      }

      const backup: Record<string, any[]> = {};
      let totalDocs = 0;

      // Fetch all collections sequentially to avoid timeouts and resource exhaustion
      for (const colName of collectionsToBackup) {
        try {
          const snapshot = await db.collection(colName).limit(5000).get();
          totalDocs += snapshot.size;
          backup[colName] = snapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data()
          }));
          console.log(`[Server Backup] Collection ${colName}: found ${snapshot.size} docs.`);
        } catch (colErr: any) {
          console.warn(`[Backup] Warning: Could not backup collection ${colName}:`, colErr.message);
          backup[colName] = [];
        }
      }

      const timestamp = new Date().toISOString();
      const metadata = {
        version: "2.1",
        timestamp,
        source: "Bali Adventours CMS",
        totalCollections: collectionsToBackup.length,
        totalDocumentsFound: totalDocs,
        databaseId: db.databaseId || '(default)',
        userId: authResult.decodedToken?.uid || 'unknown',
        isPartial: !!collectionsParam
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=bali_adventours_backup_${timestamp.split('T')[0]}.json`);
      res.status(200).json({ metadata, data: backup });

    } catch (error: any) {
      console.error("[Backup Error]:", error);
      res.status(500).json({ error: error.message || "Failed to generate backup" });
    }
  });

  // API Route: Restore Site (Admin Only)
  app.post("/api/admin/restore", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const idToken = authHeader?.startsWith('Bearer ') ? authHeader.split('Bearer ')[1] : undefined;

      const adminAuth = await verifyAdmin(idToken);
      if (!adminAuth.isAdmin) {
        return res.status(403).json({ error: "Unauthorized: Admin access required for restore." });
      }

      const { data } = req.body;
      if (!data || typeof data !== 'object') {
        return res.status(400).json({ error: "Invalid backup data provided." });
      }

      console.log("[Restore] Starting full system restore...");
      
      const results: Record<string, number> = {};

      for (const [colName, docs] of Object.entries(data)) {
        if (!Array.isArray(docs)) continue;
        
        let count = 0;
        const colRef = db.collection(colName);

        // Process in batches if possible, but for simplicity we'll do promise.all on docs
        // or sequential for safety with large datasets.
        for (const docData of docs) {
          const { id, ...cleanData } = docData;
          if (id) {
            await colRef.doc(id).set(cleanData, { merge: true });
            count++;
          }
        }
        results[colName] = count;
      }

      res.json({ 
        message: "Restore completed successfully", 
        stats: results 
      });

    } catch (error: any) {
      console.error("[Restore Error]:", error);
      res.status(500).json({ error: error.message || "Failed to restore backup" });
    }
  });

  // API Route: AI Hub Content Generator (Admin Only)
  app.post("/api/admin/generate-ai-hub", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const idToken = authHeader?.startsWith('Bearer ') ? authHeader.split('Bearer ')[1] : undefined;

      const adminAuth = await verifyAdmin(idToken);
      if (!adminAuth.isAdmin) {
        return res.status(403).json({ error: "Unauthorized: Admin access required for content generation." });
      }

      const { type, prompt, category } = req.body;
      if (!type || !prompt || !category) {
        return res.status(400).json({ error: "Missing required fields: type, prompt, category." });
      }

      const apiKey = process.env.GEMINI_API_KEY?.trim();
      if (!apiKey) {
        return res.status(400).json({ error: "Gemini API Key is not configured on the server." });
      }

      const { GoogleGenAI, Type } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey });

      if (type === 'faq') {
        const response = await generateContentWithFallback(ai, {
          model: "gemini-3.5-flash",
          contents: `Create exactly 3 relevant, highly human questions and highly detailed, expert answers about: "${prompt}" in the category: "${category}".
          For Bali Tourism SEO, provide informative responses containing specific Balinese words (like "Kulkul", "Warung", "Santi", "Sari", "Pura") with exact explanations. Keep the language natural, helpful, and highly detailed.
          Respond in JSON format complying with the schema.`,
          config: {
            systemInstruction: "You are an expert Bali SEO content generator for Bali Adventours. You generate helpful travel FAQs that search engines love.",
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  answer: { type: Type.STRING }
                },
                required: ["question", "answer"]
              }
            }
          }
        });

        const text = response.text || "";
        res.status(200).json({ data: JSON.parse(text) });
      } else {
        // Tips
        const response = await generateContentWithFallback(ai, {
          model: "gemini-3.5-flash",
          contents: `Create a single highly actionable, incredibly detailed, specific Travel Tip about: "${prompt}" under the category: "${category}".
          Write a short title and paragraph-length content containing local Balinese terms or culture insights. Avoid generic ideas.
          Respond in JSON format complying with the schema.`,
          config: {
            systemInstruction: "You are an expert Bali Travel Advisor for Bali Adventours. You generate premium travel tips and insights.",
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                content: { type: Type.STRING }
              },
              required: ["title", "content"]
            }
          }
        });

        const text = response.text || "";
        res.status(200).json({ data: JSON.parse(text) });
      }

    } catch (error: any) {
      console.error("[AI Content Gen Error]:", error);
      res.status(500).json({ error: error.message || "Failed to generate AI contents." });
    }
  });

  // Registered Gemini Router to handle AI planner, SEO, concierge and chatbot endpoints
  app.use("/api/gemini", geminiRouter);
  app.post("/api/chatbot", (req: any, res: any, next: any) => {
    req.url = "/chatbot";
    geminiRouter(req, res, next);
  });

  // API Route: Send WhatsApp
  app.post("/api/send-whatsapp", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const idToken = authHeader?.startsWith('Bearer ') ? authHeader.split('Bearer ')[1] : undefined;
      const { 
        type, 
        booking, 
        customMessage, 
        message: fallbackMessage, 
        receiver, 
        sessionId, 
        token, 
        baseUrl, 
        provider, 
        file, 
        filename, 
        attachManifest, 
        attachVoucher,
        wabaAccessToken,
        wabaPhoneNumberId,
        wabaTemplateName,
        wabaLanguageCode,
        tenantId
      } = req.body;
      const finalMessageContent = customMessage || fallbackMessage;

      console.log(`[API /api/send-whatsapp] Request received. Type: ${type}, Receiver: ${receiver || booking?.customerData?.phone}, attachManifest: ${attachManifest}, attachVoucher: ${attachVoucher}`);

      // SECURITY: Verify user is authorized
      const authResult = await verifyAdmin(idToken);
      const isOwner = await verifyUser(idToken, booking?.userId);
      const isAnonymousBooking = booking && booking.userId === 'anonymous';
      const guestAllowedTypes = ['booking_confirmation', 'admin_notification', 'booking_status_updated'];

      // Allow sending custom messages if they are an admin
      const isCustomAllowed = (finalMessageContent || file || attachManifest || attachVoucher) && authResult.isAdmin;
      const isBookingNotificationAllowed = !finalMessageContent && !file && !attachManifest && !attachVoucher && (authResult.isAdmin || isOwner || (isAnonymousBooking && guestAllowedTypes.includes(type)));

      if (!isCustomAllowed && !isBookingNotificationAllowed) {
        return res.status(403).json({ error: "Forbidden: You are not authorized to send messages or notifications." });
      }

      // Fetch communication settings from Firestore with fallback
      let settings: any = {};
      const resolvedTenantId = tenantId || booking?.tenantId || 'global';
      try {
        const settingsDoc = await db.collection('communicationSettings').doc(resolvedTenantId).get();
        if (settingsDoc.exists) {
          settings = settingsDoc.data();
        }
      } catch (dbErr) {
        console.error("[WhatsApp Proxy Error] DB Fetch failed:", dbErr);
      }
      
      const isEnabled = settings.hasOwnProperty('whatsappEnabled') ? settings.whatsappEnabled : true;
      if (!isEnabled && !finalMessageContent && !file && !attachManifest && !attachVoucher) {
        return res.json({ success: false, error: 'WhatsApp is disabled in settings' });
      }

      let message = '';
      let targetNumber = receiver || booking?.customerData?.phone;

      if (finalMessageContent) {
        message = finalMessageContent;
      } else if (type === 'booking_confirmation') {
        const template = settings.whatsappTemplates?.booking_confirmation?.message || 
          "Halo {{customerName}}, booking anda untuk {{tourTitle}} pada tanggal {{date}} telah dikonfirmasi. Booking ID: {{bookingId}}";
        message = formatWhatsAppMessage(template, booking);
      } else if (type === 'admin_notification') {
        const template = settings.whatsappTemplates?.admin_notification?.message || 
          "New Booking Alert! {{customerName}} booked {{tourTitle}} for {{date}}. Total: {{totalAmount}}";
        message = formatWhatsAppMessage(template, booking);
        targetNumber = settings.adminNotificationPhone;
      } else if (type === 'booking_status_updated') {
        const template = settings.whatsappTemplates?.booking_status_updated?.message || 
          "Halo {{customerName}}, status booking anda {{bookingId}} telah diperbarui menjadi: {{status}}";
        message = formatWhatsAppMessage(template, booking);
      }

      if (!targetNumber) {
        return res.status(400).json({ success: false, error: 'No receiver number provided' });
      }

      let fileToSend = file;
      let filenameToSend = filename;

      if (!fileToSend && booking) {
        if (attachManifest) {
          try {
            const config = await resolveEmailConfig(resolvedTenantId);
            const pdfBuffer = await generateManifestPdf(booking, config);
            fileToSend = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;
            filenameToSend = filename || `Tour-Manifest-${booking.id.substring(0, 8).toUpperCase()}.pdf`;
            console.log(`[API /api/send-whatsapp] Automatically generated Manifest PDF for booking ${booking.id}`);
          } catch (manifestErr: any) {
            console.error(`[API /api/send-whatsapp] Failed to auto-generate Manifest PDF:`, manifestErr);
          }
        } else if (attachVoucher) {
          try {
            const config = await resolveEmailConfig(resolvedTenantId);
            const pdfBuffer = await generateVoucherPdf(booking, config);
            fileToSend = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;
            filenameToSend = filename || `Tour-Voucher-${booking.id.substring(0, 8).toUpperCase()}.pdf`;
            console.log(`[API /api/send-whatsapp] Automatically generated Tour Voucher PDF for booking ${booking.id}`);
          } catch (voucherErr: any) {
            console.error(`[API /api/send-whatsapp] Failed to auto-generate Tour Voucher PDF:`, voucherErr);
          }
        }
      }

      // Determine final provider (defaults to settings.whatsappProvider, fallback to body.provider, fallback to 'openwa')
      const finalProvider = provider || settings.whatsappProvider || 'openwa';

      const finalWabaConfig = {
        accessToken: wabaAccessToken || settings.wabaAccessToken,
        phoneNumberId: wabaPhoneNumberId || settings.wabaPhoneNumberId,
        templateName: wabaTemplateName || settings.wabaTemplateName,
        languageCode: wabaLanguageCode || settings.wabaLanguageCode || 'en',
        booking: booking,
        type: type
      };

      // Use configured OpenWA credentials, supporting inline overrides
      const finalToken = token || settings.openwaApiKey;
      const finalBaseUrl = baseUrl || settings.openwaBaseUrl;
      const finalSessionId = sessionId || settings.openwaSessionId;
      
      const result = await sendWhatsAppMessage({
        number: targetNumber,
        message: message,
        file: fileToSend,
        filename: filenameToSend
      }, finalToken, finalBaseUrl, finalSessionId, finalProvider, finalWabaConfig);

      res.json(result);
    } catch (error: any) {
      console.error("[WhatsApp Proxy Error]:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // API Route: Verify custom domain DNS configuration
  app.get("/api/tenant/verify-domain", async (req: any, res: any) => {
    try {
      const { domain } = req.query;
      if (!domain) return res.status(400).json({ error: "Missing required query parameter 'domain'" });

      const vercelToken = process.env.VERCEL_API_TOKEN;
      const projectId = process.env.VERCEL_PROJECT_ID;
      const teamId = process.env.VERCEL_TEAM_ID;

      if (!vercelToken || !projectId) {
        // Fallback for local testing without Vercel Token
        const isSubdomain = domain.split('.').length > 2;
        return res.json({
          domain: domain,
          isSubdomain,
          verified: false,
          dnsError: "Vercel API credentials not configured locally.",
          expectedCname: 'cname.vercel-dns.com',
          expectedA: '76.76.21.21',
          checkedAt: new Date().toISOString()
        });
      }

      let url = `https://api.vercel.com/v9/projects/${projectId}/domains/${domain}/config`;
      if (teamId) url += `?teamId=${teamId}`;

      const response = await fetch(url, { headers: { 'Authorization': `Bearer ${vercelToken}` } });
      const data = await response.json();

      if (!response.ok) {
        return res.status(response.status).json({ error: data.error?.message || 'Failed to verify domain with Vercel' });
      }

      const isSubdomain = domain.split('.').length > 2;
      const isConfigured = data.misconfigured === false;

      res.status(200).json({
        verified: isConfigured,
        domain: domain,
        isSubdomain: isSubdomain,
        expectedCname: 'cname.vercel-dns.com',
        expectedA: '76.76.21.21',
        checkedAt: new Date().toISOString()
      });
    } catch (error: any) {
      console.error("[Domain Verification Error]:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // API Route: Add Custom Domain to Vercel
  app.post("/api/tenant/add-domain", async (req: any, res: any) => {
    const { domain } = req.body;
    if (!domain) return res.status(400).json({ error: 'Domain is required' });

    const vercelToken = process.env.VERCEL_API_TOKEN;
    const projectId = process.env.VERCEL_PROJECT_ID;
    const teamId = process.env.VERCEL_TEAM_ID;

    if (!vercelToken || !projectId) return res.status(500).json({ error: 'Vercel API credentials missing.' });

    try {
      let url = `https://api.vercel.com/v10/projects/${projectId}/domains`;
      if (teamId) url += `?teamId=${teamId}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${vercelToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: domain }),
      });
      const data = await response.json();
      if (!response.ok) return res.status(response.status).json({ error: data.error?.message });
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // API Route: Remove Custom Domain from Vercel
  app.delete("/api/tenant/remove-domain", async (req: any, res: any) => {
    const domain = req.query.domain;
    if (!domain) return res.status(400).json({ error: 'Domain is required' });

    const vercelToken = process.env.VERCEL_API_TOKEN;
    const projectId = process.env.VERCEL_PROJECT_ID;
    const teamId = process.env.VERCEL_TEAM_ID;

    if (!vercelToken || !projectId) return res.status(500).json({ error: 'Vercel API credentials missing.' });

    try {
      let url = `https://api.vercel.com/v9/projects/${projectId}/domains/${domain}`;
      if (teamId) url += `?teamId=${teamId}`;
      const response = await fetch(url, { method: 'DELETE', headers: { 'Authorization': `Bearer ${vercelToken}` } });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        return res.status(response.status).json({ error: data.error?.message });
      }
      res.status(200).json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // API Route: Creem.io Subscription Checkout Session
  app.post("/api/billing/checkout", async (req: any, res: any) => {
    try {
      const { productId, successUrl, email, tenantId } = req.body;
      if (!productId || !successUrl || !email || !tenantId) {
        return res.status(400).json({ error: "Missing required parameters (productId, successUrl, email, tenantId)" });
      }

      console.log(`[Billing API] Creating Creem checkout for tenant: ${tenantId}, product: ${productId}`);
      const data = await createCreemCheckoutSession({
        productId,
        successUrl,
        email,
        tenantId
      });

      res.json({ url: data.checkout_url || data.url });
    } catch (error: any) {
      console.error("[Billing Checkout Error]:", error);
      res.status(500).json({ error: error.message || "Failed to generate checkout link" });
    }
  });

  // API Route: Tripay Payment Gateway Checkout Link Creation
  app.post("/api/billing/tripay-checkout", async (req: any, res: any) => {
    try {
      const { productId, successUrl, email, tenantId, companyName, phone, channel } = req.body;
      if (!productId || !successUrl || !email || !tenantId) {
        return res.status(400).json({ error: "Missing required parameters (productId, successUrl, email, tenantId)" });
      }

      console.log(`[Tripay API] Generating checkout for Tenant: ${tenantId}, Product: ${productId}, Channel: ${channel}`);

      // Convert pricing Plan ID to IDR
      let amountIdr = 784000; // default Starter: Rp 784.000 (approx $49)
      const prodLower = (productId || '').toLowerCase();
      if (prodLower.includes('professional') || prodLower.includes('pro')) {
        amountIdr = 1584000; // Rp 1.584.000 (approx $99)
      } else if (prodLower.includes('business') || prodLower.includes('growth')) {
        amountIdr = 3184000; // Rp 3.184.000 (approx $199)
      } else if (prodLower.includes('enterprise')) {
        amountIdr = 7984000; // Rp 7.984.000 (approx $499)
      }

      // Fetch global Tripay configuration from Firestore
      getAdminApp();
      const db = getAdminDb();
      let tripayMerchantCode = "";
      let tripayApiKey = "";
      let tripayPrivateKey = "";
      let tripayMode = "sandbox";

      if (db) {
        try {
          const globalSnap = await db.collection('communicationSettings').doc('global').get();
          if (globalSnap.exists) {
            const data = globalSnap.data() || {};
            tripayMerchantCode = data.tripayMerchantCode || "";
            tripayApiKey = data.tripayApiKey || "";
            tripayPrivateKey = data.tripayPrivateKey || "";
            tripayMode = data.tripayMode || "sandbox";
          }
        } catch (dbErr) {
          console.warn("[Tripay API] Firestore settings fetch failed, falling back to mock sandbox:", dbErr);
        }
      }

      const hasValidKeys = tripayMerchantCode && tripayApiKey && tripayPrivateKey &&
                           !tripayMerchantCode.includes('placeholder') && !tripayApiKey.includes('placeholder');

      // ⚠️ Developer Sandbox Fallback
      if (!hasValidKeys) {
        console.log("[Tripay API] Tripay keys are not configured. Launching Sandbox Checkout Simulator.");
        const mockUrl = `/api/billing/tripay-mock-checkout?productId=${encodeURIComponent(productId)}&tenantId=${encodeURIComponent(tenantId)}&email=${encodeURIComponent(email)}&successUrl=${encodeURIComponent(successUrl)}&companyName=${encodeURIComponent(companyName || 'Tripbone Store')}&phone=${encodeURIComponent(phone || '081234567890')}&channel=${encodeURIComponent(channel || 'QRISC')}&amountIdr=${amountIdr}`;
        return res.json({ url: mockUrl });
      }

      // Real Tripay API Integration
      const merchantRef = `TRIP-${tenantId}-${Date.now()}`;
      const signatureString = tripayMerchantCode + merchantRef + amountIdr;
      const signature = crypto.createHmac('sha256', tripayPrivateKey).update(signatureString).digest('hex');

      const tripayUrl = tripayMode === 'live' 
        ? 'https://tripay.co.id/api/transaction/create'
        : 'https://tripay.co.id/api-sandbox/transaction/create';

      const payload = {
        method: channel || 'QRISC',
        merchant_ref: merchantRef,
        amount: amountIdr,
        customer_name: companyName || 'Tripbone Tenant',
        customer_email: email,
        customer_phone: phone || '081234567890',
        order_items: [
          {
            name: `Tripbone Workspace ${productId || 'Starter'} Plan`,
            price: amountIdr,
            quantity: 1
          }
        ],
        callback_url: `${req.protocol}://${req.get('host')}/api/billing/tripay-webhook`,
        return_url: successUrl,
        signature: signature
      };

      console.log(`[Tripay API] Sending request to Tripay (${tripayMode}):`, tripayUrl);
      const apiRes = await axios.post(tripayUrl, payload, {
        headers: {
          'Authorization': `Bearer ${tripayApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      if (apiRes.data && apiRes.data.success && apiRes.data.data) {
        const checkoutUrl = apiRes.data.data.checkout_url;
        console.log(`[Tripay API] Transaction created successfully. Checkout URL: ${checkoutUrl}`);
        res.json({ url: checkoutUrl });
      } else {
        throw new Error(apiRes.data?.message || "Failed to create transaction on Tripay gateway.");
      }
    } catch (error: any) {
      console.error("[Tripay Checkout Creation Error]:", error?.response?.data || error);
      // Gracefully fallback to Mock Sandbox on actual connection or API key error to prevent breaking user flow
      const { productId, successUrl, email, tenantId, companyName, phone, channel } = req.body;
      let amountIdr = 784000;
      if (productId && productId.toLowerCase().includes('professional')) amountIdr = 1584000;
      if (productId && productId.toLowerCase().includes('business')) amountIdr = 3184000;
      if (productId && productId.toLowerCase().includes('enterprise')) amountIdr = 7984000;

      console.log("[Tripay API Fallback] Triggering Sandbox checkout fallback due to upstream error.");
      const mockUrl = `/api/billing/tripay-mock-checkout?productId=${encodeURIComponent(productId || 'starter')}&tenantId=${encodeURIComponent(tenantId || 'tenant')}&email=${encodeURIComponent(email || '')}&successUrl=${encodeURIComponent(successUrl || '')}&companyName=${encodeURIComponent(companyName || 'Tripbone Store')}&phone=${encodeURIComponent(phone || '')}&channel=${encodeURIComponent(channel || 'QRISC')}&amountIdr=${amountIdr}&error=${encodeURIComponent(error.message || 'Upstream Error')}`;
      res.json({ url: mockUrl });
    }
  });

  // API Route: Tripay Local Sandbox Checkout Simulator
  app.get("/api/billing/tripay-mock-checkout", async (req: any, res: any) => {
    const { productId, tenantId, email, successUrl, companyName, phone, channel, amountIdr, error } = req.query;
    
    const formattedAmount = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(amountIdr || 784000));
    const randomVaNumber = "8806" + Math.floor(100000000000 + Math.random() * 900000000000);

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tripay Sandbox Closed-Payment Simulator</title>
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'Space Grotesk', sans-serif;
            background-color: #060913;
        }
        .font-mono-custom {
            font-family: 'JetBrains Mono', monospace;
        }
    </style>
</head>
<body class="min-h-screen text-slate-100 flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full mx-auto space-y-8 bg-slate-900/65 backdrop-blur-lg border border-emerald-500/10 p-8 sm:p-10 rounded-3xl shadow-2xl mt-8">
        <div class="text-center space-y-2">
            <!-- Simulated Indonesian Logo -->
            <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-7 h-7">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75-3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5h15a2.25 2.25 0 0 0 2.25-2.25V14" />
                </svg>
            </div>
            <h2 class="text-2xl font-black tracking-tight text-white">Tripay.co.id Sandbox</h2>
            <p class="text-xs text-emerald-400 font-semibold tracking-wider uppercase font-mono-custom">Indonesian Closed-Payment Gateway</p>
        </div>

        ${error ? `
        <div class="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl text-center text-xs leading-relaxed">
            <strong>⚠️ API Key Offline:</strong> Loaded simulator because real credentials failed or are unconfigured.
        </div>
        ` : ''}

        <div class="space-y-4 bg-slate-950/65 border border-slate-800/80 p-5 rounded-2xl">
            <h3 class="text-xs font-mono-custom font-semibold text-gray-400 uppercase tracking-wider pb-2 border-b border-slate-800">Payment Invoice Details</h3>
            
            <div class="space-y-3 text-xs leading-normal">
                <div class="flex justify-between">
                    <span class="text-slate-400">Workspace / Merchant</span>
                    <span class="font-bold text-white">${companyName}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-slate-400">Tenant Slug</span>
                    <span class="font-bold text-white font-mono-custom">${tenantId}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-slate-400">Email Address</span>
                    <span class="font-bold text-white font-mono-custom">${email}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-slate-400">Selected Plan</span>
                    <span class="font-bold text-indigo-400 capitalize">${productId || 'Starter'}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-slate-400">Indonesian Channel</span>
                    <span class="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold font-mono-custom">${channel || 'QRISC'}</span>
                </div>
                <div class="border-t border-slate-800/60 my-2 pt-2 flex justify-between items-center text-sm">
                    <span class="text-slate-200 font-bold">Total Bill (IDR)</span>
                    <span class="text-lg font-black text-emerald-400 font-mono-custom">${formattedAmount}</span>
                </div>
            </div>
        </div>

        <!-- Simulated Payment Method Output -->
        <div class="p-5 bg-indigo-950/30 border border-indigo-500/15 rounded-2xl text-center space-y-3">
            <p class="text-xs font-bold text-indigo-300 uppercase tracking-widest">Simulation Guide</p>
            
            ${channel && channel.includes('QRIS') ? `
                <div class="w-32 h-32 bg-white rounded-xl mx-auto flex items-center justify-center p-2 border-4 border-emerald-500/40">
                    <!-- High quality Mock QRIS Code -->
                    <svg class="w-full h-full text-slate-900" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                        <rect x="10" y="10" width="20" height="20" fill="currentColor"/>
                        <rect x="70" y="10" width="20" height="20" fill="currentColor"/>
                        <rect x="10" y="70" width="20" height="20" fill="currentColor"/>
                        <rect x="40" y="40" width="20" height="20" fill="currentColor"/>
                        <rect x="15" y="15" width="10" height="10" fill="white"/>
                        <rect x="75" y="15" width="10" height="10" fill="white"/>
                        <rect x="15" y="75" width="10" height="10" fill="white"/>
                        <rect x="45" y="45" width="10" height="10" fill="white"/>
                        <!-- random details -->
                        <rect x="35" y="15" width="5" height="15" fill="currentColor"/>
                        <rect x="50" y="20" width="15" height="5" fill="currentColor"/>
                        <rect x="10" y="40" width="15" height="5" fill="currentColor"/>
                        <rect x="70" y="40" width="10" height="5" fill="currentColor"/>
                        <rect x="40" y="70" width="15" height="5" fill="currentColor"/>
                        <rect x="75" y="70" width="15" height="5" fill="currentColor"/>
                    </svg>
                </div>
                <p class="text-[11px] text-gray-400 leading-normal">
                    Please open your Indonesian E-Wallet (DANA, OVO, GoPay, LinkAja) and scan the QR code above.
                </p>
            ` : `
                <div class="space-y-1">
                    <p class="text-[10px] text-gray-400 uppercase font-mono-custom">Simulated Virtual Account Number</p>
                    <p class="text-xl font-black text-white font-mono-custom tracking-wider select-all">${randomVaNumber}</p>
                </div>
                <p class="text-[11px] text-gray-400 leading-normal">
                    Transfer the exact bill amount using local bank m-banking or ATM.
                </p>
            `}
        </div>

        <div class="space-y-3 pt-2">
            <form action="/api/billing/tripay-mock-checkout/activate" method="POST" class="space-y-3">
                <input type="hidden" name="productId" value="${productId || ''}">
                <input type="hidden" name="tenantId" value="${tenantId || ''}">
                <input type="hidden" name="email" value="${email || ''}">
                <input type="hidden" name="successUrl" value="${successUrl || ''}">
                <input type="hidden" name="actionType" value="success">

                <button type="submit" class="w-full flex items-center justify-center px-4 py-3 border border-transparent text-sm font-bold rounded-2xl text-white bg-emerald-600 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition duration-150 cursor-pointer">
                    Simulate Tripay Payment Success
                </button>
            </form>

            <a href="/" class="w-full flex items-center justify-center px-4 py-3 border border-slate-800 text-sm font-medium rounded-2xl text-slate-300 bg-slate-950/20 hover:bg-slate-900 hover:text-white transition duration-150">
                Cancel Checkout & Return
            </a>
        </div>
    </div>

    <div class="text-center text-xs text-slate-600 font-mono-custom">
        Tripbone SaaS Engine • Tripay Closed-Payment Simulator
    </div>
</body>
</html>
    `;
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
  });

  // API Route: Handle sandbox Tripay mock checkout activation
  app.post("/api/billing/tripay-mock-checkout/activate", async (req: any, res: any) => {
    try {
      const { productId, tenantId, email, successUrl, actionType } = req.body;
      console.log(`[Tripay Sandbox] Simulating payment success for tenant: ${tenantId}, plan: ${productId}`);
      
      if (actionType === 'success' && tenantId) {
        getAdminApp();
        const db = getAdminDb();
        if (db) {
          await db.collection('tenants').doc(tenantId).update({
            status: 'active',
            subscriptionId: `sub_tripay_mock_${Math.random().toString(36).substring(2, 10)}`,
            plan: productId || 'starter',
            updatedAt: new Date().toISOString()
          });
          console.log(`[Tripay Sandbox] Tenant ${tenantId} activated directly in Firestore database!`);
        } else {
          console.warn(`[Tripay Sandbox] Firestore database not initialized. Direct activation skipped.`);
        }
      }
      
      res.redirect(303, successUrl || '/');
    } catch (err: any) {
      console.error("[Tripay Sandbox Activation Error]:", err);
      res.status(500).send(`Failed to process simulated subscription activation: ${err.message}`);
    }
  });

  // API Route: Tripay Webhook Receiver
  app.post("/api/billing/tripay-webhook", async (req: any, res: any) => {
    try {
      const { merchant_ref, reference, status, payment_method } = req.body;
      console.log(`[Tripay Webhook] Callback received for transaction: ${merchant_ref}, Status: ${status}`);

      if (!merchant_ref) {
        return res.status(400).json({ error: "Missing merchant_ref" });
      }

      // Fetch private key to verify signature
      getAdminApp();
      const db = getAdminDb();
      let tripayPrivateKey = "";

      if (db) {
        try {
          const globalSnap = await db.collection('communicationSettings').doc('global').get();
          if (globalSnap.exists) {
            tripayPrivateKey = globalSnap.data()?.tripayPrivateKey || "";
          }
        } catch (dbErr) {
          console.error("[Tripay Webhook] Failed to fetch private key from Firestore:", dbErr);
        }
      }

      // Verify HMAC Signature (only if key is configured, otherwise log notice)
      const incomingSignature = req.headers['x-callback-signature'] || req.headers['X-Callback-Signature'];
      if (tripayPrivateKey && incomingSignature) {
        const rawBodyString = JSON.stringify(req.body);
        const expectedSignature = crypto.createHmac('sha256', tripayPrivateKey).update(rawBodyString).digest('hex');
        const expectedSignatureNoSpacing = crypto.createHmac('sha256', tripayPrivateKey).update(JSON.stringify(req.body, null, 0)).digest('hex');

        if (incomingSignature !== expectedSignature && incomingSignature !== expectedSignatureNoSpacing) {
          console.error("[Tripay Webhook] Signature mismatch! Security validation failed.");
          return res.status(401).json({ error: "Signature mismatch" });
        }
        console.log("[Tripay Webhook] HMAC Signature verified successfully.");
      } else {
        console.warn("[Tripay Webhook] Callback Signature verification skipped (private key not found).");
      }

      // If PAID, activate workspace
      if (status === 'PAID') {
        // Extract tenant ID from merchant_ref (e.g. TRIP-tenant_slug-123456789)
        const tenantId = merchant_ref.substring(5, merchant_ref.lastIndexOf('-'));
        console.log(`[Tripay Webhook] Payment Successful. Activating Tenant ID: ${tenantId}`);

        if (db) {
          await db.collection('tenants').doc(tenantId).update({
            status: 'active',
            subscriptionId: reference || `tripay_${merchant_ref}`,
            updatedAt: new Date().toISOString()
          });
          console.log(`[Tripay Webhook] Firestore Tenant workspace ${tenantId} activated successfully!`);
        }
      }

      // Tripay expects JSON response containing {"success": true}
      res.status(200).json({ success: true });
    } catch (error: any) {
      console.error("[Tripay Webhook Error]:", error);
      res.status(500).json({ error: error.message || "Webhook processing failed" });
    }
  });

  // API Route: Sandbox Mock Checkout Simulator (when CREEM_API_KEY is not configured)
  app.get("/api/billing/mock-checkout", async (req: any, res: any) => {
    const { productId, tenantId, email, successUrl } = req.query;
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Creem.io Sandbox Checkout Simulator</title>
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'Inter', sans-serif;
            background-color: #030f0c;
        }
        .font-mono-custom {
            font-family: 'JetBrains Mono', monospace;
        }
    </style>
</head>
<body class="min-h-screen text-slate-100 flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full mx-auto space-y-8 bg-slate-900/60 backdrop-blur-md border border-emerald-500/10 p-8 sm:p-10 rounded-3xl shadow-2xl mt-12">
        <div class="text-center space-y-2">
            <!-- Simulated Logo -->
            <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-7 h-7">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5h.007v.008H3.75V4.5Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3 11.25h18.25M3 16.5h18.25" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3" />
                </svg>
            </div>
            <h2 class="text-2xl font-black tracking-tight text-white">Creem.io Sandbox</h2>
            <p class="text-xs text-emerald-400 font-semibold tracking-wider uppercase font-mono-custom">Checkout Simulator</p>
        </div>

        <div class="space-y-4 bg-slate-950/40 border border-slate-800 p-5 rounded-2xl">
            <h3 class="text-xs font-mono-custom font-semibold text-gray-400 uppercase tracking-wider">Checkout Session Parameters</h3>
            
            <div class="space-y-3 text-sm">
                <div class="flex justify-between py-1 border-b border-slate-800/60">
                    <span class="text-slate-400">Tenant Workspace</span>
                    <span class="font-semibold text-white font-mono-custom text-xs">${tenantId}</span>
                </div>
                <div class="flex justify-between py-1 border-b border-slate-800/60">
                    <span class="text-slate-400">Admin Email</span>
                    <span class="font-semibold text-white font-mono-custom text-xs">${email}</span>
                </div>
                <div class="flex justify-between py-1 border-b border-slate-800/60">
                    <span class="text-slate-400">Subscription Plan ID</span>
                    <span class="font-semibold text-white font-mono-custom text-xs">${productId}</span>
                </div>
                <div class="flex justify-between py-1">
                    <span class="text-slate-400">Checkout Mode</span>
                    <span class="px-2 py-0.5 rounded text-[10px] bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 font-bold uppercase tracking-wider font-mono-custom">Sandbox / Offline</span>
                </div>
            </div>
        </div>

        <!-- Alert context -->
        <div class="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl text-xs text-emerald-400/90 leading-relaxed">
            <p class="font-semibold mb-1">💡 Notice to Developer</p>
            This simulator loaded because <code class="bg-slate-950 text-emerald-300 px-1 py-0.5 rounded font-mono-custom text-[11px]">CREEM_API_KEY</code> is not set or is a placeholder in your environment variables. In production, this step redirects to Creem.io's secure checkout page.
        </div>

        <div class="space-y-3 pt-2">
            <form action="/api/billing/mock-checkout/activate" method="POST" class="space-y-3">
                <input type="hidden" name="productId" value="${productId || ''}">
                <input type="hidden" name="tenantId" value="${tenantId || ''}">
                <input type="hidden" name="email" value="${email || ''}">
                <input type="hidden" name="successUrl" value="${successUrl || ''}">
                <input type="hidden" name="actionType" value="success">

                <button type="submit" class="w-full flex items-center justify-center px-4 py-3 border border-transparent text-sm font-bold rounded-2xl text-white bg-emerald-600 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition duration-150 cursor-pointer">
                    Simulate Payment Success
                </button>
            </form>

            <a href="/" class="w-full flex items-center justify-center px-4 py-3 border border-slate-800 text-sm font-medium rounded-2xl text-slate-300 bg-slate-950/20 hover:bg-slate-900 hover:text-white transition duration-150">
                Cancel Checkout & Return
            </a>
        </div>
    </div>

    <div class="text-center text-xs text-slate-600 font-mono-custom">
        Tripbone SaaS Engine • Sandbox Gate
    </div>
</body>
</html>
    `;
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
  });

  // API Route: Handle sandbox Mock checkout activation
  app.post("/api/billing/mock-checkout/activate", async (req: any, res: any) => {
    try {
      const { productId, tenantId, email, successUrl, actionType } = req.body;
      console.log(`[Mock Checkout Sandbox] Activating subscription for tenant: ${tenantId}, plan: ${productId}`);
      
      if (actionType === 'success' && tenantId) {
        getAdminApp();
        const db = getAdminDb();
        if (db) {
          await db.collection('tenants').doc(tenantId).update({
            status: 'active',
            subscriptionId: `sub_mock_${Math.random().toString(36).substring(2, 10)}`,
            plan: productId || 'starter',
            updatedAt: new Date().toISOString()
          });
          console.log(`[Mock Checkout Sandbox] Successfully activated tenant ${tenantId} directly in Firestore database!`);
        } else {
          console.warn(`[Mock Checkout Sandbox] Firestore database not initialized. Direct activation skipped.`);
        }
      }
      
      res.redirect(303, successUrl || '/');
    } catch (err: any) {
      console.error("[Mock Checkout Activation Error]:", err);
      res.status(500).send(`Failed to process mock subscription activation: ${err.message}`);
    }
  });

  // API Route: Creem.io Webhook Receiver
  app.post("/api/billing/webhook", async (req: any, res: any) => {
    try {
      const event = req.body;
      const eventType = event.type;
      const data = event.data || {};
      const metadata = data.metadata || event.metadata || {};
      const tenantId = metadata.tenantId;

      console.log(`[Billing Webhook] Received event: ${eventType} for Tenant: ${tenantId}`);

      if (!tenantId) {
        return res.status(400).json({ error: "No tenantId metadata found in payload" });
      }

      getAdminApp();
      const db = getAdminDb();

      let updatePayload: any = {};
      if (eventType === 'subscription.active') {
        updatePayload = {
          status: 'active',
          subscriptionId: data.id || null,
          plan: data.plan_id || data.product_id || 'growth',
          updatedAt: new Date().toISOString()
        };
      } else if (eventType === 'subscription.canceled' || eventType === 'subscription.expired') {
        updatePayload = {
          status: 'suspended',
          updatedAt: new Date().toISOString()
        };
      } else if (eventType === 'subscription.past_due') {
        updatePayload = {
          status: 'past_due',
          updatedAt: new Date().toISOString()
        };
      }

      if (Object.keys(updatePayload).length > 0) {
        await db.collection('tenants').doc(tenantId).update(updatePayload);
        console.log(`[Billing Webhook] Updated Firestore tenant ${tenantId} to status: ${updatePayload.status}`);
      }

      res.status(200).json({ success: true });
    } catch (error: any) {
      console.error("[Billing Webhook Error]:", error);
      res.status(500).json({ error: error.message || "Webhook processing failed" });
    }
  });

  // API Route: Secure Single Sign-On (SSO) Custom Token Generator
  app.post("/api/auth/sso", async (req: any, res: any) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Missing or invalid authorization token" });
      }

      const idToken = authHeader.split("Bearer ")[1];
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const uid = decodedToken.uid;
      const tenantSlug = req.body.tenantSlug || req.query.tenantSlug;
      const customDomain = req.body.customDomain || req.query.customDomain;

      if (!tenantSlug) {
        return res.status(400).json({ error: "Missing target tenantSlug" });
      }

      console.log(`[SSO API] Creating custom login token for UID: ${uid} targeting tenant: ${tenantSlug}`);
      const customToken = await admin.auth().createCustomToken(uid);

      const host = req.headers.host || 'localhost:3000';
      const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';

      let ssoUrl = '';
      if (customDomain) {
        ssoUrl = `https://${customDomain}/login?token=${customToken}&redirect=/admin`;
      } else if (host.includes('run.app')) {
        ssoUrl = `${protocol}://${host}/login?token=${customToken}&tenant=${tenantSlug}&redirect=/admin`;
      } else {
        let targetHost = host;
        if (host.includes('app.localhost')) {
          targetHost = host.replace('app.localhost', `${tenantSlug}.localhost`);
        } else if (host.includes('localhost')) {
          targetHost = host.replace('localhost', `${tenantSlug}.localhost`);
        } else if (host.includes('app.')) {
          targetHost = host.replace('app.', `${tenantSlug}.`);
        } else {
          targetHost = `${tenantSlug}.${host}`;
        }
        
        const targetProtocol = targetHost.includes('localhost') ? 'http' : 'https';
        ssoUrl = `${targetProtocol}://${targetHost}/login?token=${customToken}&redirect=/admin`;
      }

      res.json({ success: true, url: ssoUrl });
    } catch (error: any) {
      console.error("[SSO Custom Token Error]:", error);
      res.status(500).json({ error: error.message || "Failed to generate SSO redirect URL" });
    }
  });

  // --- MAILJET NOTIFICATION ENDPOINTS ---
  
  app.post("/api/mail/test", async (req: any, res: any) => {
    try {
      const { toEmail, subject, textPart, htmlPart } = req.body;
      if (!toEmail) return res.status(400).json({ error: "Missing toEmail" });
      const result = await sendEmail({ toEmail, subject, textPart, htmlPart });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/mail/welcome", async (req: any, res: any) => {
    try {
      const { email, name } = req.body;
      if (!email) return res.status(400).json({ error: "Missing email" });
      const result = await sendWelcomeEmail(email, name || 'User');
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Mailjet Event Webhook (Real-time Notifications)
  // https://dev.mailjet.com/email/guides/#event-api-real-time-notifications
  app.post("/api/mailjet-webhook", async (req: any, res: any) => {
    try {
      const events = req.body;
      if (!Array.isArray(events)) {
        return res.status(400).send("Expected array of events");
      }

      console.log(`[Mailjet Webhook] Received ${events.length} events:`);
      
      const db = getAdminDb();
      const batch = db.batch();

      for (const event of events) {
        const { event: eventType, email, error_related_to, error, id, CustomID } = event;
        
        console.log(`- [${eventType.toUpperCase()}] to ${email}`);
        if (error) console.log(`  Reason: ${error}`);
        if (error_related_to) console.log(`  Related To: ${error_related_to}`);

        // Store webhook event in Firestore for debugging
        const eventRef = db.collection('mailjet_events').doc();
        batch.set(eventRef, {
          ...event,
          receivedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      await batch.commit();
      res.status(200).send("OK");
    } catch (err: any) {
      console.error("[Mailjet Webhook] Error processing events:", err);
      res.status(500).send("Internal Server Error");
    }
  });

  app.post("/api/mail/verify", async (req: any, res: any) => {
    try {
      const { email, link } = req.body;
      // In a real scenario, you might generate the link here using admin.auth().generateEmailVerificationLink(email)
      // and then send it. For now, we accept the link from the client or fallback.
      if (!email) return res.status(400).json({ error: "Missing email" });
      
      let verificationLink = link;
      if (!verificationLink) {
         try {
           verificationLink = await admin.auth().generateEmailVerificationLink(email);
         } catch(e) {
           console.error('Failed to generate verification link via admin sdk', e);
         }
      }

      if (!verificationLink) return res.status(400).json({ error: "Could not generate or find verification link" });

      const result = await sendVerificationEmail(email, verificationLink);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/mail/invoice", async (req: any, res: any) => {
    try {
      const { email, plan, amount, invoiceId, dueDate, type } = req.body;
      if (!email) return res.status(400).json({ error: "Missing email" });
      
      let result;
      if (type === 'due') {
        result = await sendPaymentDueEmail(email, plan || 'Starter', amount, dueDate || 'Soon');
      } else {
        result = await sendPaymentSuccessEmail(email, plan || 'Starter', amount, invoiceId || 'INV-0000');
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Helper to log all incoming and outgoing WhatsApp messages recursively into Firestore for robust CRM syncing
  const logMessageToFirestore = async (msg: {
    id: string;
    chatId: string;
    from: string;
    to: string;
    body: string;
    direction: 'incoming' | 'outgoing';
    timestamp: any;
    fromMe?: boolean;
    senderName?: string;
    session?: string;
  }) => {
    try {
      const chatId = msg.chatId;
      if (!chatId) return;

      const msgDocId = msg.id || `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const messageRef = db.collection('whatsapp_messages').doc(msgDocId);

      // Declare epoch seconds timestamp standard
      let ts = typeof msg.timestamp === 'number' ? msg.timestamp : Math.floor(Date.now() / 1000);
      if (ts > 9999999999) { // convert millisecond epoch to second epoch
        ts = Math.floor(ts / 1000);
      }

      const payload = {
        id: msgDocId,
        chatId: chatId,
        from: msg.from,
        to: msg.to,
        body: msg.body || '',
        direction: msg.direction,
        fromMe: msg.fromMe ?? (msg.direction === 'outgoing'),
        timestamp: ts,
        createdAt: new Date().toISOString(),
        session: msg.session || 'baliadventours'
      };

      await messageRef.set(payload, { merge: true });

      // Update or Create the Chat/Contact record in Firestore so the chat list shows it
      const chatRef = db.collection('whatsapp_chats').doc(chatId);
      const chatSnap = await chatRef.get();
      
      const chatName = msg.senderName || chatId.split('@')[0];

      const chatPayload = {
        chatId: chatId,
        name: chatName,
        updatedAt: new Date().toISOString(),
        session: msg.session || 'baliadventours',
        lastMessage: {
          id: payload.id,
          body: payload.body,
          fromMe: payload.fromMe,
          timestamp: payload.timestamp,
          direction: payload.direction,
          createdAt: payload.createdAt
        }
      };

      if (!chatSnap.exists) {
        await chatRef.set(chatPayload);
      } else {
        const currentData = chatSnap.data();
        const currentTS = currentData?.lastMessage?.timestamp || 0;
        if (payload.timestamp >= currentTS) {
          await chatRef.update({
            updatedAt: chatPayload.updatedAt,
            lastMessage: chatPayload.lastMessage,
            session: msg.session || 'baliadventours'
          });
        }
      }
    } catch (err) {
      console.error("[logMessageToFirestore Error]:", err);
    }
  };

  // Helper to find session key case-insensitively in any JSON object hierarchy
  const findSessionIdCaseInsensitive = (obj: any): string | undefined => {
    if (!obj || typeof obj !== 'object') return undefined;
    
    // Check keys of the current object level
    const keys = Object.keys(obj);
    for (const key of keys) {
      const lowerKey = key.toLowerCase();
      if (lowerKey === 'session' || 
          lowerKey === 'sessionid' || 
          lowerKey === 'sessionname' || 
          lowerKey === 'session_id') {
        const val = obj[key];
        if (val && typeof val === 'string') return val.trim();
        if (val && typeof val === 'number') return String(val).trim();
      }
    }

    // Recursively check common sub-structures (avoid infinite loops by choosing specific keys)
    const candidates = ['data', 'payload', 'message', 'object'];
    for (const cand of candidates) {
      if (obj[cand]) {
        const result = findSessionIdCaseInsensitive(obj[cand]);
        if (result) return result;
      }
    }

    return undefined;
  };

  // API Route: Webhook verification handshake for Meta WABA (WhatsApp Cloud API)
  app.get("/api/whatsapp/webhook", async (req, res) => {
    try {
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];

      console.log(`[WhatsApp Webhook GET] Verification handshake requested. Mode: ${mode}, Token: ${token}`);

      if (mode && token) {
        if (mode === 'subscribe') {
          let settings: any = {};
          try {
            const settingsDoc = await db.collection('communicationSettings').doc('global').get();
            if (settingsDoc.exists) {
              settings = settingsDoc.data();
            }
          } catch (dbErr) {
            console.error("[WhatsApp Webhook GET] Settings DB Fetch failed:", dbErr);
          }

          const expectedVerifyToken = settings.wabaVerifyToken || 'baliadventours';

          if (token === expectedVerifyToken) {
            console.log("[WhatsApp Webhook GET] Handshake SUCCESSFUL! Echoing challenge back.");
            return res.status(200).send(challenge);
          } else {
            console.warn(`[WhatsApp Webhook GET] Handshake FAILED: Verify token mismatch. Expected: ${expectedVerifyToken}, Received: ${token}`);
            return res.status(403).send("Forbidden: Verification token mismatch");
          }
        }
      }
      return res.status(400).send("Bad Request: Missing hub.mode or hub.verify_token");
    } catch (error: any) {
      console.error("[WhatsApp Webhook GET Error]:", error);
      return res.status(500).send("Internal Server Error");
    }
  });

  // API Route: Webhook receiver for OpenWA gateway events (capture any inbound and outbound messages live)
  app.post("/api/whatsapp/webhook", async (req, res) => {
    try {
      if (req.body?.object === "whatsapp_business_account" && req.body?.entry) {
        console.log("[WhatsApp Webhook] WABA Cloud API Event triggered:", JSON.stringify(req.body).substring(0, 600));
        const entries = req.body.entry;
        for (const entry of entries) {
          const changes = entry.changes;
          if (!changes) continue;
          for (const change of changes) {
            if (change.field === "messages") {
              const value = change.value;
              if (value && value.messages && value.messages.length > 0) {
                const message = value.messages[0];
                const fromPhone = message.from;
                const msgId = message.id;
                const contact = value.contacts?.[0];
                const senderName = contact?.profile?.name || "Customer";
                let textBody = "";

                if (message.type === "text" && message.text) {
                  textBody = message.text.body;
                } else if (message.type === "interactive") {
                  const interactive = message.interactive;
                  if (interactive.type === "button_reply") {
                    textBody = interactive.button_reply?.title || "";
                  } else if (interactive.type === "list_reply") {
                    textBody = interactive.list_reply?.title || "";
                  }
                } else {
                  textBody = `[Received ${message.type} message]`;
                }

                console.log(`[WhatsApp WABA Webhook] Message from +${fromPhone} (${senderName}): ${textBody}`);
                
                try {
                  await db.collection('email_logs').add({
                    type: 'WABA Message Received',
                    to: `+${fromPhone} (${senderName})`,
                    provider: 'waba',
                    status: 'success',
                    createdAt: new Date(),
                    errorMessage: `Incoming WhatsApp: "${textBody}" (Message ID: ${msgId})`
                  });
                } catch (logErr: any) {
                  console.error("[WhatsApp Webhook] Logging received message to firestore failed:", logErr.message);
                }
              } else if (value && value.statuses && value.statuses.length > 0) {
                const status = value.statuses[0];
                console.log(`[WhatsApp WABA Webhook] Message status update. Recipient: ${status.recipient_id}, Status: ${status.status}, ID: ${status.id}`);
                
                try {
                  await db.collection('email_logs').add({
                    type: `WABA Delivery Status: ${status.status.toUpperCase()}`,
                    to: `+${status.recipient_id}`,
                    provider: 'waba',
                    status: status.status === 'failed' ? 'skipped' : 'success',
                    createdAt: new Date(),
                    errorMessage: `Status ID: ${status.id}`
                  });
                } catch (logErr: any) {
                  console.error("[WhatsApp Webhook] Logging status update to firestore failed:", logErr.message);
                }
              }
            }
          }
        }
        return res.status(200).json({ success: true, message: "WABA webhook processed successfully" });
      }

      console.log("[WhatsApp Webhook] Event triggered:", req.body?.event, JSON.stringify(req.body).substring(0, 400));
      
      // Look up our active setup session
      let settings: any = {};
      try {
        const settingsDoc = await db.collection('communicationSettings').doc('global').get();
        if (settingsDoc.exists) {
          settings = settingsDoc.data();
        }
      } catch (dbErr) {
        console.error("[WhatsApp Webhook] Settings DB Fetch failed:", dbErr);
      }
      const activeSession = settings.openwaSessionId || 'baliadventours';

      // Load active session metadata to get its UUID on the gateway for webhook validation
      let activeSessionId = settings.resolvedSessionId || '';
      const baseUrl = settings.openwaBaseUrl || 'https://openwa-dashboard-production-b24e.up.railway.app';
      const token = settings.openwaApiKey;
      if (!activeSessionId && token) {
        try {
          const resolved = await resolveOpenWaSession(baseUrl, token, activeSession);
          if (resolved && resolved.id) {
            activeSessionId = String(resolved.id).trim();
          }
        } catch (resolveErr: any) {
          console.log(`[WhatsApp Webhook] Active session UUID resolve failed: ${resolveErr.message}`);
        }
      }

      // Extract incoming session ID case-insensitively and defensively
      let incomingSession = findSessionIdCaseInsensitive(req.body) || '';
      
      // Fallback searches in query or headers
      if (!incomingSession) {
        incomingSession = String(
          req.query?.session || 
          req.query?.sessionId || 
          req.headers?.['x-session-id'] || 
          req.headers?.['session'] || 
          ''
        ).trim();
      }

      const cleanIncoming = incomingSession.trim().toLowerCase();
      const cleanActiveName = activeSession.trim().toLowerCase();
      const cleanActiveId = activeSessionId.trim().toLowerCase();

      // Verify the incoming session to filter out noise from other instances on the shared gateway url
      if (cleanIncoming && cleanActiveName) {
        const matchesName = cleanIncoming === cleanActiveName;
        const matchesId = cleanActiveId ? (cleanIncoming === cleanActiveId) : false;
        
        if (!matchesName && !matchesId) {
          console.log(`[WhatsApp Webhook] Ignored event for session "${incomingSession}". Configured: name="${activeSession}", id="${activeSessionId}".`);
          return res.status(200).json({ success: true, message: `Ignored message from foreign session: ${incomingSession}` });
        }
      }

      let msgData = req.body;
      if (req.body?.data) {
        msgData = req.body.data;
      } else if (req.body?.payload) {
        msgData = req.body.payload;
      } else if (req.body?.message) {
        msgData = req.body.message;
      }

      const from = msgData.from || msgData.senderId || msgData.chatId || msgData.from_jid || 'unknown';
      const to = msgData.to || msgData.receiverId || msgData.to_jid || 'unknown';
      const body = msgData.body || msgData.text || msgData.message || msgData.payload || '';
      const id = msgData.id || msgData.messageId || msgData.msg_id || `msg-${Date.now()}`;
      const fromMe = msgData.fromMe ?? msgData.from_me ?? (msgData.direction === 'outgoing') ?? false;
      const senderName = msgData.sender?.name || msgData.sender?.formattedName || msgData.sender?.pushname || msgData.contact?.name || msgData.pushname;

      let chatId = msgData.chatId || msgData.chat?.id || (fromMe ? to : from);
      if (chatId) {
        chatId = String(chatId);
        if (!chatId.includes('@') && /^\d+$/.test(chatId)) {
          chatId = `${chatId}@c.us`;
        }
      }

      if (chatId && chatId !== 'unknown' && body) {
        // WhatsApp CRM is disabled at user's request. Bypass storing to Firestore entirely to conserve quota.
        console.log(`[WhatsApp Webhook] CRM is disabled. Bypassing Firestore writes for JID: ${chatId}`);
        return res.status(200).json({ success: true, message: "CRM is disabled, database write bypassed." });
      }

      res.status(200).json({ success: true, message: "Webhook payload processed securely" });
    } catch (err: any) {
      console.error("[WhatsApp Webhook Router Error]:", err.message);
      res.status(200).json({ success: false, error: err.message });
    }
  });

  // Helper for resolving friendly session names to UUIDs on OpenWA
  const resolveOpenWaSession = async (baseUrl: string, token: string, sessionNameOrId: string) => {
    const cleanToken = token.replace('Bearer ', '').trim();
    const headers = {
      'Authorization': `Bearer ${cleanToken}`,
      'X-API-Key': cleanToken,
      'X-Api-Key': cleanToken,
      'api-key': cleanToken,
      'Content-Type': 'application/json'
    };

    // 1. Get List of all active sessions
    const response = await axios.get(`${baseUrl.replace(/\/$/, '')}/api/sessions`, {
      headers,
      timeout: 5000
    });

    if (Array.isArray(response.data)) {
      // 2. Locate by name or database UUID id case-insensitively
      const match = response.data.find((s: any) => {
        const sName = String(s.name || '').trim().toLowerCase();
        const sId = String(s.id || '').trim().toLowerCase();
        const searchVal = String(sessionNameOrId || '').trim().toLowerCase();
        return sName === searchVal || sId === searchVal;
      });
      if (match) {
        console.log(`[WhatsApp Server Resolve] Resolved "${sessionNameOrId}" to UUID "${match.id}" with status "${match.status}"`);
        // Silently persist the resolved UUID for hot-path webhook checks
        db.collection('communicationSettings').doc('global').get().then(doc => {
          if (doc.exists) {
            const data = doc.data();
            if (data && data.openwaSessionId === sessionNameOrId && data.resolvedSessionId !== match.id) {
              db.collection('communicationSettings').doc('global').update({
                resolvedSessionId: match.id,
                resolvedSessionStatus: match.status || 'unknown'
              }).catch(dbErr => console.error("[resolveOpenWaSession Cache Save Error]:", dbErr));
            }
          }
        }).catch(() => {});
        return match;
      }
    }
    
    // Fallback to direct GET call if not found in list
    const fallbackRes = await axios.get(`${baseUrl.replace(/\/$/, '')}/api/sessions/${sessionNameOrId}`, {
      headers,
      timeout: 5000
    });
    const fallbackData = fallbackRes.data;
    if (fallbackData && fallbackData.id) {
      // Silently persist session in fallback case too
      db.collection('communicationSettings').doc('global').get().then(doc => {
        if (doc.exists) {
          const data = doc.data();
          if (data && data.openwaSessionId === sessionNameOrId && data.resolvedSessionId !== fallbackData.id) {
            db.collection('communicationSettings').doc('global').update({
              resolvedSessionId: fallbackData.id,
              resolvedSessionStatus: fallbackData.status || 'unknown'
            }).catch(dbErr => console.error("[resolveOpenWaSession Fallback Cache Save Error]:", dbErr));
          }
        }
      }).catch(() => {});
    }
    return fallbackData;
  };

  // Helper to dynamically align OpenWA Webhook to our running backend instance
  const registerWebhookOnGateway = async (baseUrl: string, token: string, sessionNameOrId: string, reqHost: string) => {
    try {
      const cleanToken = token.replace('Bearer ', '').trim();
      const headers = {
        'Authorization': `Bearer ${cleanToken}`,
        'X-API-Key': cleanToken,
        'X-Api-Key': cleanToken,
        'api-key': cleanToken,
        'Content-Type': 'application/json'
      };

      let uuid = sessionNameOrId;
      try {
        const resolved = await resolveOpenWaSession(baseUrl, token, sessionNameOrId);
        uuid = resolved.id || sessionNameOrId;
      } catch (err: any) {
        console.log(`[WhatsApp Webhook Register] Session resolve warning during registration: ${err.message}`);
      }

      const protocol = reqHost.includes('localhost') || reqHost.includes('127.0.0.1') ? 'http' : 'https';
      const currentWebhookUrl = `${protocol}://${reqHost}/api/whatsapp/webhook`;
      console.log(`[WhatsApp Webhook Register] Harmonizing gateway to push events to: "${currentWebhookUrl}" on session: "${uuid}"`);

      const methodPath = `${baseUrl.replace(/\/$/, '')}/api/sessions/${uuid}`;
      let setSuccess = false;

      // Pathway 1: setWebhook RPC invocation
      try {
        const resRPC = await axios.post(methodPath, {
          method: "setWebhook",
          args: [currentWebhookUrl]
        }, { headers, timeout: 5000 });
        console.log(`[WhatsApp Webhook Register] Pathway 1 (setWebhook RPC) response status: ${resRPC.status}`);
        setSuccess = true;
      } catch (err1: any) {
        console.log(`[WhatsApp Webhook Register] Pathway 1 failed: ${err1.message}`);
      }

      // Pathway 2: Configure route
      if (!setSuccess) {
        try {
          const resConfig = await axios.post(`${baseUrl.replace(/\/$/, '')}/api/sessions/${uuid}/configure`, {
            webhookUrl: currentWebhookUrl
          }, { headers, timeout: 5000 });
          console.log(`[WhatsApp Webhook Register] Pathway 2 (/configure) response status: ${resConfig.status}`);
          setSuccess = true;
        } catch (err2: any) {
          console.log(`[WhatsApp Webhook Register] Pathway 2 failed: ${err2.message}`);
        }
      }

      // Pathway 3: Webhooks list
      if (!setSuccess) {
        try {
          const resWebhooks = await axios.post(`${baseUrl.replace(/\/$/, '')}/api/sessions/${uuid}/webhooks`, {
            url: currentWebhookUrl
          }, { headers, timeout: 5000 });
          console.log(`[WhatsApp Webhook Register] Pathway 3 (/webhooks) response status: ${resWebhooks.status}`);
          setSuccess = true;
        } catch (err3: any) {
          console.log(`[WhatsApp Webhook Register] Pathway 3 failed: ${err3.message}`);
        }
      }

      if (setSuccess) {
        console.log(`[WhatsApp Webhook Register] Successfully synchronized webhook alignment on Gateway to point to: "${currentWebhookUrl}"`);
      } else {
        console.warn(`[WhatsApp Webhook Register] Alignment warning: Webhook registration could not be fully reconciled.`);
      }
    } catch (gErr: any) {
      console.error("[WhatsApp Webhook Register Global Error]:", gErr.message);
    }
  };

  // API Route: Get WhatsApp Session Status
  app.get("/api/whatsapp-status", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const idToken = authHeader?.startsWith('Bearer ') ? authHeader.split('Bearer ')[1] : undefined;
      const authResult = await verifyAdmin(idToken);
      if (!authResult.isAdmin) {
        return res.status(403).json({ error: "Forbidden: Admin access required." });
      }

      // Fetch settings
      let settings: any = {};
      try {
        const settingsDoc = await db.collection('communicationSettings').doc('global').get();
        if (settingsDoc.exists) {
          settings = settingsDoc.data();
        }
      } catch (dbErr) {
        console.error("[WhatsApp Status Error] DB Fetch failed:", dbErr);
      }

      const baseUrl = settings.openwaBaseUrl || 'https://openwa-dashboard-production-b24e.up.railway.app';
      const session = settings.openwaSessionId || 'baliadventours';
      const token = settings.openwaApiKey;

      if (!token) {
        return res.json({ success: false, error: "OpenWA API Token is not configured in settings." });
      }

      const resolved = await resolveOpenWaSession(baseUrl, token, session);

      // Register / Align webhook dynamically under high reliability
      const reqHost = req.get('host');
      if (reqHost) {
        registerWebhookOnGateway(baseUrl, token, session, reqHost).catch(autoErr => {
          console.error("[WhatsApp Status] Auto register webhook error:", autoErr.message);
        });
      }

      res.json({ success: true, data: resolved });
    } catch (error: any) {
      console.error("[WhatsApp Status Proxy Error]:", error.response?.data || error.message);
      res.json({ 
        success: false, 
        error: error.response?.data?.message || error.message || "Failed to fetch status" 
      });
    }
  });

  // API Route: Get WhatsApp Messages
  app.get("/api/whatsapp-messages", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const idToken = authHeader?.startsWith('Bearer ') ? authHeader.split('Bearer ')[1] : undefined;
      const authResult = await verifyAdmin(idToken);
      if (!authResult.isAdmin) {
        return res.status(403).json({ error: "Forbidden: Admin access required." });
      }

      // Fetch settings
      let settings: any = {};
      try {
        const settingsDoc = await db.collection('communicationSettings').doc('global').get();
        if (settingsDoc.exists) {
          settings = settingsDoc.data();
        }
      } catch (dbErr) {
        console.error("[WhatsApp Messages Proxy Error] DB Fetch failed:", dbErr);
      }

      const baseUrl = settings.openwaBaseUrl || 'https://openwa-dashboard-production-b24e.up.railway.app';
      const session = settings.openwaSessionId || 'baliadventours';
      const token = settings.openwaApiKey;

      if (!token) {
        return res.json({ success: false, error: "OpenWA API Token is not configured in settings." });
      }

      const cleanToken = token.replace('Bearer ', '').trim();
      const headers = {
        'Authorization': `Bearer ${cleanToken}`,
        'X-API-Key': cleanToken,
        'X-Api-Key': cleanToken,
        'api-key': cleanToken,
        'Content-Type': 'application/json'
      };

      let uuid = session;
      try {
        const resolved = await resolveOpenWaSession(baseUrl, token, session);
        uuid = resolved.id || session;
      } catch (err: any) {
        console.log(`[WhatsApp Messages] Session resolve failed for "${session}": ${err.message}`);
      }

      const { chatId, limit, offset } = req.query;
      const queryLimit = limit ? Number(limit) : 100;
      let liveMessages: any[] = [];

      if (chatId) {
        console.log(`[WhatsApp Messages] Specific chat messages requested for JID: ${chatId}`);
        let formattedChatId = String(chatId);
        if (!formattedChatId.includes('@') && /^\d+$/.test(formattedChatId)) {
          formattedChatId = `${formattedChatId}@c.us`;
        }

        const methodPath = `${baseUrl.replace(/\/$/, '')}/api/sessions/${uuid}`;
        
        let response;
        try {
          console.log(`[WhatsApp Messages] Strategy 1: getMessages for JID on ${methodPath}`);
          response = await axios.post(methodPath, {
            method: "getMessages",
            args: [formattedChatId, { limit: queryLimit }]
          }, { headers, timeout: 6000 });
        } catch (err1: any) {
          console.log(`[WhatsApp Messages] Strategy 1 failed: ${err1.message}. Trying Strategy 2: getAllMessagesInChat...`);
          try {
            response = await axios.post(methodPath, {
              method: "getAllMessagesInChat",
              args: [formattedChatId, true, true]
            }, { headers, timeout: 6000 });
          } catch (err2: any) {
            console.log(`[WhatsApp Messages] Strategy 2 failed: ${err2.message}. Trying Strategy 3: chats/messages path...`);
            try {
              const pathFallback1 = `${baseUrl.replace(/\/$/, '')}/api/sessions/${uuid}/chats/${formattedChatId}/messages`;
              response = await axios.get(pathFallback1, { headers, timeout: 6000 });
            } catch (err3: any) {
              console.log(`[WhatsApp Messages] Strategy 3 failed: ${err3.message}. Trying Strategy 4: /messages ...`);
              try {
                const pathGlobal = `${baseUrl.replace(/\/$/, '')}/api/sessions/${uuid}/messages`;
                response = await axios.get(pathGlobal, {
                  headers,
                  params: { chatId: formattedChatId, limit: queryLimit },
                  timeout: 6000
                });
              } catch (err4: any) {
                console.log(`[WhatsApp Messages] Live gateway fetch warning: ${err4.message}`);
              }
            }
          }
        }

        if (response && response.data) {
          const dataNode = response.data;
          let messagesArray = Array.isArray(dataNode) ? dataNode : (dataNode?.response || dataNode?.data || dataNode?.messages || dataNode?.result);
          if (!messagesArray && dataNode && typeof dataNode === 'object') {
            const arrayProp = Object.values(dataNode).find(Array.isArray);
            if (arrayProp) {
              messagesArray = arrayProp;
            }
          }
          if (messagesArray && Array.isArray(messagesArray)) {
            liveMessages = messagesArray;
            // Persist newly retrieved live messages to Firestore cache
            for (const m of liveMessages) {
              const msgId = m.id || m.messageId || `sync-msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
              const fromStr = getJidString(m.from);
              const toStr = getJidString(m.to);
              
              const isSelf = m.fromMe === true || 
                             String(m.fromMe) === 'true' || 
                             m.from_me === true || 
                             String(m.from_me) === 'true' || 
                             m.direction === 'outgoing' ||
                             m.isSelf === true ||
                             String(m.isSelf) === 'true' ||
                             m.sender?.isMe === true ||
                             String(m.sender?.isMe) === 'true';

              const direction = isSelf ? 'outgoing' : 'incoming';
              const bodyText = m.body || m.text || m.message || '';

              if (bodyText) {
                await logMessageToFirestore({
                  id: String(msgId),
                  chatId: formattedChatId,
                  from: fromStr || (isSelf ? 'user' : formattedChatId),
                  to: toStr || (isSelf ? formattedChatId : 'user'),
                  body: bodyText,
                  direction,
                  timestamp: m.timestamp || m.time || Math.floor(Date.now() / 1000),
                  fromMe: isSelf,
                  senderName: m.sender?.name || m.contact?.name || formattedChatId.split('@')[0],
                  session: session
                }).catch(err => console.error("[WhatsApp Messages] Firestore cache log failed:", err));
              }
            }
          }
        }

        // Fetch local archived messages from Firestore
        let localMessages: any[] = [];
        try {
          const snap = await db.collection('whatsapp_messages')
            .where('chatId', '==', formattedChatId)
            .limit(queryLimit)
            .get();
          snap.forEach(docSnap => {
            localMessages.push(docSnap.data());
          });
          // Filter local messages in memory per session and exclude the foreign spam number
          localMessages = localMessages.filter((msg: any) => {
            const mSess = String(msg.session || '').trim().toLowerCase();
            const configSess = String(session || '').trim().toLowerCase();
            const resolvedSess = String(uuid || '').trim().toLowerCase();
            const matchesSession = !msg.session || mSess === configSess || mSess === resolvedSess;
            return matchesSession && 
              msg.chatId !== "32246832590961@c.us" && 
              msg.from !== "32246832590961@c.us";
          });
          console.log(`[WhatsApp Messages] Retrieved ${localMessages.length} archived messages from Firestore for session "${session}".`);
        } catch (dbErr) {
          console.error(`[WhatsApp Messages] Firestore query failed:`, dbErr);
        }

        // Merge messages smoothly by unique ID
        const mergedMap = new Map<string, any>();

        // 1. Put Firestore messages
        localMessages.forEach((msg) => {
          const msgId = msg.id || msg.messageId;
          if (msgId) {
            mergedMap.set(String(msgId), msg);
          }
        });

        // 2. Put Gateway messages
        liveMessages.forEach((msg) => {
          const msgId = msg.id || msg.messageId;
          if (msgId) {
            const currentObj = mergedMap.get(String(msgId)) || {};
            mergedMap.set(String(msgId), {
              ...currentObj,
              ...msg,
              id: msgId,
              chatId: formattedChatId
            });
          }
        });

        const mergedList = Array.from(mergedMap.values())
          .filter((msg: any) => {
            const jid = String(msg.chatId || msg.from || '').toLowerCase();
            const isGroup = jid.endsWith('@g.us') || jid.endsWith('@g.id') || jid.endsWith('@temp');
            const isBroadcast = jid.includes('broadcast') || jid.includes('status');
            const isBelgiumSpam = jid.includes('32246832590961');
            return !isGroup && !isBroadcast && !isBelgiumSpam;
          })
          .sort((a, b) => {
            const timeA = new Date(a.createdAt || (a.timestamp ? a.timestamp * 1000 : 0)).getTime();
            const timeB = new Date(b.createdAt || (b.timestamp ? b.timestamp * 1000 : 0)).getTime();
            return timeA - timeB; // ascending chronological order
          });

        return res.json({ success: true, data: mergedList });
      } else {
        // Global timeline sequence requested
        let limitNum = limit ? Number(limit) : 100;
        let response;
        try {
          let path = `${baseUrl.replace(/\/$/, '')}/api/sessions/${uuid}/messages`;
          response = await axios.get(path, {
            headers,
            params: { limit: limitNum, offset: offset ? Number(offset) : 0 },
            timeout: 6000
          });
        } catch (err: any) {
          console.log(`[WhatsApp Messages] Global fetch failed: ${err.message}. Trying get-all-messages...`);
          try {
            const pathFallbackAll = `${baseUrl.replace(/\/$/, '')}/api/sessions/${uuid}/get-all-messages`;
            response = await axios.get(pathFallbackAll, { headers, timeout: 6000 });
          } catch (errAll: any) {
            console.log(`[WhatsApp Messages] Live global timeline failed: ${errAll.message}`);
          }
        }

        if (response && response.data) {
          const dataNode = response.data;
          let messagesArray = Array.isArray(dataNode) ? dataNode : (dataNode?.response || dataNode?.data || dataNode?.messages || dataNode?.result);
          if (!messagesArray && dataNode && typeof dataNode === 'object') {
            const arrayProp = Object.values(dataNode).find(Array.isArray);
            if (arrayProp) {
              messagesArray = arrayProp;
            }
          }
          if (messagesArray && Array.isArray(messagesArray)) {
            liveMessages = messagesArray;
            // Persist global timeline messages to Firestore cache
            for (const m of liveMessages) {
              const msgId = m.id || m.messageId || `sync-msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
              const fromStr = getJidString(m.from);
              const toStr = getJidString(m.to);
              const msgChatId = getJidString(m.chatId || m.chat?.id || fromStr);
              if (!msgChatId) continue;

              const isSelf = m.fromMe === true || 
                             String(m.fromMe) === 'true' || 
                             m.from_me === true || 
                             String(m.from_me) === 'true' || 
                             m.direction === 'outgoing' ||
                             m.isSelf === true ||
                             String(m.isSelf) === 'true' ||
                             m.sender?.isMe === true ||
                             String(m.sender?.isMe) === 'true';

              const direction = isSelf ? 'outgoing' : 'incoming';
              const bodyText = m.body || m.text || m.message || '';

              if (bodyText) {
                await logMessageToFirestore({
                  id: String(msgId),
                  chatId: msgChatId,
                  from: fromStr || (isSelf ? 'user' : msgChatId),
                  to: toStr || (isSelf ? msgChatId : 'user'),
                  body: bodyText,
                  direction,
                  timestamp: m.timestamp || m.time || Math.floor(Date.now() / 1000),
                  fromMe: isSelf,
                  senderName: m.sender?.name || m.contact?.name || msgChatId.split('@')[0],
                  session: session
                }).catch(err => console.error("[WhatsApp Global] Firestore cache log failed:", err));
              }
            }
          }
        }

        // Fetch latest messages from Firestore
        let localMessages: any[] = [];
        try {
          const dbSnap = await db.collection('whatsapp_messages')
            .orderBy('createdAt', 'desc')
            .limit(limitNum)
            .get();
          dbSnap.forEach(docSnap => {
            localMessages.push(docSnap.data());
          });
          // Filter local messages in memory per session and exclude the foreign spam number
          localMessages = localMessages.filter((msg: any) => {
            const mSess = String(msg.session || '').trim().toLowerCase();
            const configSess = String(session || '').trim().toLowerCase();
            const resolvedSess = String(uuid || '').trim().toLowerCase();
            const matchesSession = !msg.session || mSess === configSess || mSess === resolvedSess;
            return matchesSession && 
              msg.chatId !== "32246832590961@c.us" && 
              msg.from !== "32246832590961@c.us";
          });
        } catch (dbErr) {
          console.error(`[WhatsApp Global Messages] Firestore fetch failed:`, dbErr);
        }

        // Merge global history
        const mergedMap = new Map<string, any>();
        localMessages.forEach((msg) => {
          const msgId = msg.id || msg.messageId;
          if (msgId) {
            mergedMap.set(String(msgId), msg);
          }
        });
        liveMessages.forEach((msg) => {
          const msgId = msg.id || msg.messageId;
          if (msgId) {
            const currentObj = mergedMap.get(String(msgId)) || {};
            mergedMap.set(String(msgId), {
              ...currentObj,
              ...msg,
              id: msgId
            });
          }
        });

        const mergedList = Array.from(mergedMap.values())
          .filter((msg: any) => {
            const jid = String(msg.chatId || msg.from || '').toLowerCase();
            const isGroup = jid.endsWith('@g.us') || jid.endsWith('@g.id') || jid.endsWith('@temp');
            const isBroadcast = jid.includes('broadcast') || jid.includes('status');
            const isBelgiumSpam = jid.includes('32246832590961');
            return !isGroup && !isBroadcast && !isBelgiumSpam;
          })
          .sort((a, b) => {
            const timeA = new Date(a.createdAt || (a.timestamp ? a.timestamp * 1000 : 0)).getTime();
            const timeB = new Date(b.createdAt || (b.timestamp ? b.timestamp * 1000 : 0)).getTime();
            return timeB - timeA; // descending chronological order for timeline feeds
          });

        return res.json({ success: true, data: mergedList });
      }
    } catch (error: any) {
      console.error("[WhatsApp Messages Proxy Error]:", error.response?.data || error.message);
      res.json({ 
        success: false, 
        error: error.response?.data?.message || error.message || "Failed to fetch messages" 
      });
    }
  });

  // API Route: Get WhatsApp Chats (Live from gateway merged with Firestore archives)
  app.get("/api/whatsapp-chats", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const idToken = authHeader?.startsWith('Bearer ') ? authHeader.split('Bearer ')[1] : undefined;
      const authResult = await verifyAdmin(idToken);
      if (!authResult.isAdmin) {
        return res.status(403).json({ error: "Forbidden: Admin access required." });
      }

      // WhatsApp CRM is disabled at user's request to prioritize Firestore quota
      return res.json({ success: true, data: [] });
      let settings: any = {};
      try {
        const settingsDoc = await db.collection('communicationSettings').doc('global').get();
        if (settingsDoc.exists) {
          settings = settingsDoc.data();
        }
      } catch (dbErr) {
        console.error("[WhatsApp Chats Proxy Error] DB Fetch failed:", dbErr);
      }

      const baseUrl = settings.openwaBaseUrl || 'https://openwa-dashboard-production-b24e.up.railway.app';
      const session = settings.openwaSessionId || 'baliadventours';
      const token = settings.openwaApiKey;

      if (!token) {
        return res.json({ success: false, error: "OpenWA API Token is not configured in settings." });
      }

      const cleanToken = token.replace('Bearer ', '').trim();
      const headers = {
        'Authorization': `Bearer ${cleanToken}`,
        'X-API-Key': cleanToken,
        'X-Api-Key': cleanToken,
        'api-key': cleanToken,
        'Content-Type': 'application/json'
      };

      let uuid = session;
      try {
        const resolved = await resolveOpenWaSession(baseUrl, token, session);
        uuid = resolved.id || session;
      } catch (err: any) {
        console.log(`[WhatsApp Chats] Session resolve failed for "${session}": ${err.message}`);
      }

      const path1 = `${baseUrl.replace(/\/$/, '')}/api/sessions/${uuid}/chats`;
      const path2 = `${baseUrl.replace(/\/$/, '')}/api/sessions/${uuid}/get-chats`;

      let response;
      let liveChats: any[] = [];
      try {
        response = await axios.get(path1, { headers, timeout: 6000 });
      } catch (err: any) {
        console.log(`[WhatsApp Chats] Path ${path1} failed: ${err.message}. Trying Strategy 2...`);
        try {
          response = await axios.get(path2, { headers, timeout: 6000 });
        } catch (fallbackErr: any) {
          console.log(`[WhatsApp Chats] Strategy 2 failed: ${fallbackErr.message}. Trying Strategy 3...`);
          try {
            const fallbackPath = `${baseUrl.replace(/\/$/, '')}/api/sessions/${uuid}`;
            response = await axios.post(fallbackPath, { method: "getChats" }, { headers, timeout: 6000 });
          } catch (errAll) {
            console.log(`[WhatsApp Chats] Live fetch from gateway warning:`, errAll);
          }
        }
      }

      if (response && response.data) {
        const dataNode = response.data;
        let arr = Array.isArray(dataNode) ? dataNode : (dataNode?.response || dataNode?.data || dataNode?.chats || dataNode?.result);
        if (!arr && dataNode && typeof dataNode === 'object') {
          const arrayProp = Object.values(dataNode).find(Array.isArray);
          if (arrayProp) arr = arrayProp;
        }
        if (arr && Array.isArray(arr)) {
          liveChats = arr;
        }
      }

      // Safe cleanup of any leftover strange Belgium numbers in Firestore cache
      try {
        const queryChatId = "32246832590961@c.us";
        const cleanChatsSnap = await db.collection('whatsapp_chats').where('chatId', '==', queryChatId).get();
        for (const docSnap of cleanChatsSnap.docs) {
          await docSnap.ref.delete();
          console.log(`[WhatsApp Backend Cleanup] Deleted cached foreign chat document ${docSnap.id}`);
        }

        const cleanMessagesSnap = await db.collection('whatsapp_messages').where('chatId', '==', queryChatId).get();
        for (const docSnap of cleanMessagesSnap.docs) {
          await docSnap.ref.delete();
          console.log(`[WhatsApp Backend Cleanup] Deleted cached foreign message document ${docSnap.id}`);
        }
      } catch (cleanErr: any) {
        console.error(`[WhatsApp Backend Cleanup Error]:`, cleanErr.message);
      }

      // Fetch Firestore cached chats
      let localChats: any[] = [];
      try {
        const dbSnap = await db.collection('whatsapp_chats').get();
        dbSnap.forEach(docSnap => {
          localChats.push(docSnap.data());
        });
        // Filter local chats in memory per session and exclude the foreign spam number
        localChats = localChats.filter((chat: any) => {
          const cSess = String(chat.session || '').trim().toLowerCase();
          const configSess = String(session || '').trim().toLowerCase();
          const resolvedSess = String(uuid || '').trim().toLowerCase();
          const matchesSession = !chat.session || cSess === configSess || cSess === resolvedSess;
          return matchesSession && 
            chat.chatId !== "32246832590961@c.us" && 
            chat.id !== "32246832590961@c.us";
        });
        console.log(`[WhatsApp Chats] Loaded ${localChats.length} cached chats from Firestore for session "${session}".`);
      } catch (dbErr) {
        console.error(`[WhatsApp Chats] Firestore fetch failed:`, dbErr);
      }

      // Merge chats cleanly by JID (chatId)
      const chatsMap = new Map<string, any>();

      // 1. Add Firestore cached chats
      localChats.forEach((chat) => {
        const jid = chat.chatId || chat.id;
        if (jid) {
          chatsMap.set(String(jid), {
            id: jid,
            chatId: jid,
            name: chat.name,
            lastMessage: chat.lastMessage,
            updatedAt: chat.updatedAt
          });
        }
      });

      // 2. Add Live Gateway chats
      liveChats.forEach((chat) => {
        const jid = chat.id || chat.chatId || chat.jid;
        if (jid) {
          const jidStr = String(jid);
          const currentRecord = chatsMap.get(jidStr) || {};
          
          let lastMsg = chat.lastMessage || chat.last_message;
          if (!lastMsg && chat.messages && chat.messages.length > 0) {
            lastMsg = chat.messages[chat.messages.length - 1];
          }

          const chatName = chat.name || chat.formattedTitle || chat.contact?.name || currentRecord.name || jidStr.split('@')[0];

          chatsMap.set(jidStr, {
            ...currentRecord,
            ...chat,
            id: jidStr,
            chatId: jidStr,
            name: chatName,
            lastMessage: lastMsg || currentRecord.lastMessage
          });

          // Background persist to Firestore cache to ensure real-time CRM updates
          if (lastMsg) {
            const bodyText = lastMsg.body || lastMsg.text || 'Media / Info message';
            const isSelf = lastMsg.fromMe === true || 
                           String(lastMsg.fromMe) === 'true' || 
                           lastMsg.from_me === true || 
                           String(lastMsg.from_me) === 'true' || 
                           lastMsg.direction === 'outgoing' ||
                           lastMsg.isSelf === true ||
                           String(lastMsg.isSelf) === 'true' ||
                           lastMsg.sender?.isMe === true ||
                           String(lastMsg.sender?.isMe) === 'true';

            const direction = isSelf ? 'outgoing' : 'incoming';
            const msgId = lastMsg.id || lastMsg.messageId || `sync-msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

            logMessageToFirestore({
              id: String(msgId),
              chatId: jidStr,
              from: getJidString(lastMsg.from) || (isSelf ? 'user' : jidStr),
              to: getJidString(lastMsg.to) || (isSelf ? jidStr : 'user'),
              body: bodyText,
              direction,
              timestamp: lastMsg.timestamp || lastMsg.time || Math.floor(Date.now() / 1000),
              fromMe: isSelf,
              senderName: chatName,
              session: session
            }).catch(extErr => console.error("[whatsapp-chats-bg] Sync warning:", extErr.message));
          }
        }
      });

      const mergedChats = Array.from(chatsMap.values())
        .filter((chat: any) => {
          const jid = String(chat.chatId || chat.id || '').toLowerCase();
          const isGroup = jid.endsWith('@g.us') || jid.endsWith('@g.id') || jid.endsWith('@temp');
          const isBroadcast = jid.includes('broadcast') || jid.includes('status');
          const isBelgiumSpam = jid.includes('32246832590961');
          return !isGroup && !isBroadcast && !isBelgiumSpam;
        })
        .sort((a, b) => {
          const timeA = new Date(a.updatedAt || (a.lastMessage?.createdAt) || (a.lastMessage?.timestamp ? a.lastMessage.timestamp * 1000 : 0)).getTime();
          const timeB = new Date(b.updatedAt || (b.lastMessage?.createdAt) || (b.lastMessage?.timestamp ? b.lastMessage.timestamp * 1000 : 0)).getTime();
          return timeB - timeA; // Descending order (newest chat activity at top)
        });

      res.json({ success: true, data: mergedChats });
    } catch (error: any) {
      console.error("[WhatsApp Chats Proxy Error]:", error.response?.data || error.message);
      res.json({ 
        success: false, 
        error: error.response?.data?.message || error.message || "Failed to fetch chats" 
      });
    }
  });

  const getJidString = (val: any): string => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object') {
      return val._serialized || val.id || val.jid || val.user || '';
    }
    return String(val);
  };

  // API Route: Deep sync WhatsApp Inbox (pull chats and recent messages from gateway into Firestore)
  app.post("/api/whatsapp-sync", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const idToken = authHeader?.startsWith('Bearer ') ? authHeader.split('Bearer ')[1] : undefined;
      const authResult = await verifyAdmin(idToken);
      if (!authResult.isAdmin) {
        return res.status(403).json({ error: "Forbidden: Admin access required." });
      }

      // WhatsApp CRM is disabled at user's request to prioritize Firestore quota
      return res.json({ success: true, chatsSynced: 0, messagesSynced: 0, message: "WhatsApp CRM is disabled" });
      // Fetch communication settings
      let settings: any = {};
      try {
        const settingsDoc = await db.collection('communicationSettings').doc('global').get();
        if (settingsDoc.exists) {
          settings = settingsDoc.data();
        }
      } catch (dbErr) {
        console.error("[WhatsApp Sync Error] DB Fetch failed:", dbErr);
      }

      const baseUrl = settings.openwaBaseUrl || 'https://openwa-dashboard-production-b24e.up.railway.app';
      const session = settings.openwaSessionId || 'baliadventours';
      const token = settings.openwaApiKey;

      if (!token) {
        return res.json({ success: false, error: "OpenWA API Token is not configured in settings." });
      }

      const cleanToken = token.replace('Bearer ', '').trim();
      const headers = {
        'Authorization': `Bearer ${cleanToken}`,
        'X-API-Key': cleanToken,
        'X-Api-Key': cleanToken,
        'api-key': cleanToken,
        'Content-Type': 'application/json'
      };

      let uuid = session;
      try {
        const resolved = await resolveOpenWaSession(baseUrl, token, session);
        uuid = resolved.id || session;
      } catch (err: any) {
        console.log(`[WhatsApp Sync] Session resolve failed for "${session}": ${err.message}`);
      }

      console.log(`[WhatsApp Sync] Starting Deep Inbox Sync on session: ${uuid}`);

      // Automatically register/align the webhook when syncing to ensure real-time messages are delivered
      const reqHost = req.get('host');
      if (reqHost) {
        await registerWebhookOnGateway(baseUrl, token, session, reqHost);
      }

      // 1. Fetch live chats from physical device
      const path1 = `${baseUrl.replace(/\/$/, '')}/api/sessions/${uuid}/chats`;
      const path2 = `${baseUrl.replace(/\/$/, '')}/api/sessions/${uuid}/get-chats`;

      let response;
      let liveChats: any[] = [];
      try {
        response = await axios.get(path1, { headers, timeout: 8000 });
      } catch (err: any) {
        console.log(`[WhatsApp Sync] Path ${path1} failed: ${err.message}. Trying Strategy 2...`);
        try {
          response = await axios.get(path2, { headers, timeout: 8000 });
        } catch (fallbackErr: any) {
          console.log(`[WhatsApp Sync] Strategy 2 failed: ${fallbackErr.message}. Trying Strategy 3...`);
          try {
            const fallbackPath = `${baseUrl.replace(/\/$/, '')}/api/sessions/${uuid}`;
            response = await axios.post(fallbackPath, { method: "getChats" }, { headers, timeout: 8000 });
          } catch (errAll) {
            console.log(`[WhatsApp Sync] Live chats query failed:`, errAll);
          }
        }
      }

      if (response && response.data) {
        const dataNode = response.data;
        let arr = Array.isArray(dataNode) ? dataNode : (dataNode?.response || dataNode?.data || dataNode?.chats || dataNode?.result);
        if (!arr && dataNode && typeof dataNode === 'object') {
          const arrayProp = Object.values(dataNode).find(Array.isArray);
          if (arrayProp) arr = arrayProp;
        }
        if (arr && Array.isArray(arr)) {
          liveChats = arr;
        }
      }

      // Filter and pick the top active chats
      const filteredChats = liveChats.filter((chat: any) => {
        const jid = String(chat.id || chat.chatId || chat.jid || '').toLowerCase();
        const isGroup = jid.endsWith('@g.us') || jid.endsWith('@g.id') || jid.endsWith('@temp');
        const isBroadcast = jid.includes('broadcast') || jid.includes('status');
        const isBelgiumSpam = jid.includes('32246832590961');
        return !isGroup && !isBroadcast && !isBelgiumSpam;
      });

      console.log(`[WhatsApp Sync] Found ${filteredChats.length} active chats to sync. Syncing recent messages for top 12 active ones...`);

      // Sync top 12 active chats (with limited concurrency to prevent rate limit blocks)
      const topChats = filteredChats.slice(0, 12);
      let totalChatsSynced = 0;
      let totalMessagesSynced = 0;

      for (const chat of topChats) {
        const chatId = chat.id || chat.chatId || chat.jid;
        if (!chatId) continue;

        const formattedChatId = String(chatId);
        let lastMsg = chat.lastMessage || chat.last_message;
        if (!lastMsg && chat.messages && chat.messages.length > 0) {
          lastMsg = chat.messages[chat.messages.length - 1];
        }

        const chatName = chat.name || chat.formattedTitle || chat.contact?.name || chat.contact?.formattedName || formattedChatId.split('@')[0];

        // Ensure chat metadata itself is saved to Firestore
        try {
          const chatRef = db.collection('whatsapp_chats').doc(formattedChatId);
          await chatRef.set({
            chatId: formattedChatId,
            name: chatName,
            updatedAt: new Date().toISOString(),
            session: session,
            lastMessage: lastMsg ? {
              id: lastMsg.id || `msg-${Date.now()}`,
              body: lastMsg.body || lastMsg.text || 'Media / Info message',
              fromMe: lastMsg.fromMe ?? (lastMsg.direction === 'outgoing'),
              timestamp: lastMsg.timestamp || Math.floor(Date.now() / 1000),
              direction: lastMsg.direction || (lastMsg.fromMe ? 'outgoing' : 'incoming'),
              createdAt: new Date().toISOString()
            } : null
          }, { merge: true });
          totalChatsSynced++;
        } catch (chatSaveErr) {
          console.warn(`[WhatsApp Sync] Failed to save chat entry for ${formattedChatId}:`, chatSaveErr);
        }

        // Now, fetch last 20 messages for this contact from physical phone
        const methodPath = `${baseUrl.replace(/\/$/, '')}/api/sessions/${uuid}`;
        let msgResponse;
        try {
          msgResponse = await axios.post(methodPath, {
            method: "getMessages",
            args: [formattedChatId, { limit: 20 }]
          }, { headers, timeout: 6000 });
        } catch (errFetchMsg) {
          console.log(`[WhatsApp Sync] getMessages for ${formattedChatId} failed, trying getAllMessagesInChat...`);
          try {
            msgResponse = await axios.post(methodPath, {
              method: "getAllMessagesInChat",
              args: [formattedChatId, true, true]
            }, { headers, timeout: 6000 });
          } catch (errFallbackMsg) {
            console.log(`[WhatsApp Sync] Message fetching failed for chat ${formattedChatId}:`, errFallbackMsg.message);
          }
        }

        if (msgResponse && msgResponse.data) {
          const mNode = msgResponse.data;
          let msgsArr = Array.isArray(mNode) ? mNode : (mNode?.response || mNode?.data || mNode?.messages || mNode?.result);
          if (!msgsArr && mNode && typeof mNode === 'object') {
            const arrayProp = Object.values(mNode).find(Array.isArray);
            if (arrayProp) msgsArr = arrayProp;
          }

          if (msgsArr && Array.isArray(msgsArr)) {
            // Log each retrieved message to Firestore cache
            for (const m of msgsArr) {
              const msgId = m.id || m.messageId || `sync-msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
              const fromStr = getJidString(m.from);
              const toStr = getJidString(m.to);
              const isSelf = m.fromMe === true || 
                             String(m.fromMe) === 'true' || 
                             m.from_me === true || 
                             String(m.from_me) === 'true' || 
                             m.direction === 'outgoing' ||
                             m.isSelf === true ||
                             String(m.isSelf) === 'true' ||
                             m.sender?.isMe === true ||
                             String(m.sender?.isMe) === 'true';

              const direction = isSelf ? 'outgoing' : 'incoming';
              const bodyText = m.body || m.text || m.message || '';

              if (bodyText) {
                await logMessageToFirestore({
                  id: String(msgId),
                  chatId: formattedChatId,
                  from: fromStr || (isSelf ? 'me' : formattedChatId),
                  to: toStr || (isSelf ? formattedChatId : 'me'),
                  body: bodyText,
                  direction,
                  timestamp: m.timestamp || m.time || Math.floor(Date.now() / 1000),
                  fromMe: isSelf,
                  senderName: m.sender?.name || m.contact?.name || chatName,
                  session: session
                });
                totalMessagesSynced++;
              }
            }
          }
        }
      }

      console.log(`[WhatsApp Sync] Successfully completed inbox sync! Saved ${totalChatsSynced} conversations & ${totalMessagesSynced} messages.`);
      res.json({
        success: true,
        message: "Successfully synchronized live inbox with local CRM.",
        chatsSynced: totalChatsSynced,
        messagesSynced: totalMessagesSynced
      });
    } catch (error: any) {
      console.error("[WhatsApp CRM Sync Error]:", error.response?.data || error.message);
      res.json({ 
        success: false, 
        error: error.response?.data?.message || error.message || "Failed to fully synchronize WhatsApp Inbox." 
      });
    }
  });

  // API Route: Send Direct WhatsApp Message
  app.post("/api/whatsapp-send", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const idToken = authHeader?.startsWith('Bearer ') ? authHeader.split('Bearer ')[1] : undefined;
      const authResult = await verifyAdmin(idToken);
      if (!authResult.isAdmin) {
        return res.status(403).json({ error: "Forbidden: Admin access required." });
      }

      // Fetch settings
      let settings: any = {};
      try {
        const settingsDoc = await db.collection('communicationSettings').doc('global').get();
        if (settingsDoc.exists) {
          settings = settingsDoc.data();
        }
      } catch (dbErr) {
        console.error("[WhatsApp Send Proxy Error] DB Fetch failed:", dbErr);
      }

      const baseUrl = settings.openwaBaseUrl || 'https://openwa-dashboard-production-b24e.up.railway.app';
      const session = settings.openwaSessionId || 'baliadventours';
      const token = settings.openwaApiKey;

      if (!token) {
        return res.json({ success: false, error: "OpenWA API Token is not configured in settings." });
      }

      const cleanToken = token.replace('Bearer ', '').trim();
      const headers = {
        'Authorization': `Bearer ${cleanToken}`,
        'X-API-Key': cleanToken,
        'X-Api-Key': cleanToken,
        'api-key': cleanToken,
        'Content-Type': 'application/json'
      };

      let uuid = session;
      try {
        const resolved = await resolveOpenWaSession(baseUrl, token, session);
        uuid = resolved.id || session;
      } catch (err: any) {
        console.log(`[WhatsApp Send] Session resolve failed for "${session}": ${err.message}`);
      }

      const { chatId, text } = req.body;
      if (!chatId || !text) {
        return res.status(400).json({ error: "chatId and text are required fields." });
      }

      let path = `${baseUrl.replace(/\/$/, '')}/api/sessions/${uuid}/messages/send-text`;

      const response = await axios.post(path, { chatId, text }, {
        headers,
        timeout: 10000
      });

      // Log sent message to Firestore to guarantee immediate display on CRM reload/sync
      try {
        let sentId = response?.data?.id || response?.data?.response?.id || response?.data?.result?.id || `msg-${Date.now()}`;
        if (typeof sentId === 'object') {
          sentId = sentId._serialized || sentId.id || `msg-${Date.now()}`;
        }
        await logMessageToFirestore({
          id: String(sentId),
          chatId: chatId,
          from: 'me',
          to: chatId,
          body: text,
          direction: 'outgoing',
          timestamp: Math.floor(Date.now() / 1000),
          fromMe: true,
          session: session
        });
      } catch (logErr: any) {
        console.error("[WhatsApp Send] Firestore logging warning:", logErr.message);
      }

      res.json({ success: true, data: response.data });
    } catch (error: any) {
      console.error("[WhatsApp Send Proxy Error]:", error.response?.data || error.message);
      res.json({ 
        success: false, 
        error: error.response?.data?.message || error.message || "Failed to send message" 
      });
    }
  });

  // API Route: Start WhatsApp Session
  app.post("/api/whatsapp-start", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const idToken = authHeader?.startsWith('Bearer ') ? authHeader.split('Bearer ')[1] : undefined;
      const authResult = await verifyAdmin(idToken);
      if (!authResult.isAdmin) {
        return res.status(403).json({ error: "Forbidden: Admin access required." });
      }

      // Fetch settings
      let settings: any = {};
      try {
        const settingsDoc = await db.collection('communicationSettings').doc('global').get();
        if (settingsDoc.exists) {
          settings = settingsDoc.data();
        }
      } catch (dbErr) {
        console.error("[WhatsApp Start Error] DB Fetch failed:", dbErr);
      }

      const baseUrl = settings.openwaBaseUrl || 'https://openwa-dashboard-production-b24e.up.railway.app';
      const session = settings.openwaSessionId || 'baliadventours';
      const token = settings.openwaApiKey;

      if (!token) {
        return res.json({ success: false, error: "OpenWA API Token is not configured in settings." });
      }

      const cleanToken = token.replace('Bearer ', '').trim();
      const headers = {
        'Authorization': `Bearer ${cleanToken}`,
        'X-API-Key': cleanToken,
        'X-Api-Key': cleanToken,
        'api-key': cleanToken,
        'Content-Type': 'application/json'
      };

      let uuid = session;
      try {
        const resolved = await resolveOpenWaSession(baseUrl, token, session);
        uuid = resolved.id || session;
      } catch (err: any) {
        console.log(`[WhatsApp Start] Direct metadata lookup failed for "${session}". Will try inline start/create.`);
      }
      
      try {
        console.log(`[WhatsApp Start] Attempting start using UUID: "${uuid}"...`);
        const response = await axios.post(`${baseUrl.replace(/\/$/, '')}/api/sessions/${uuid}/start`, {}, {
          headers: headers,
          timeout: 10000
        });

        const reqHost = req.get('host');
        if (reqHost) {
          registerWebhookOnGateway(baseUrl, token, session, reqHost).catch(() => {});
        }

        return res.json({ success: true, data: response.data });
      } catch (startErr: any) {
        const status = startErr.response?.status;
        const msg = startErr.response?.data?.message || startErr.message || "";
        console.log(`[WhatsApp Start] Direct start failed for UUID "${uuid}". Status: ${status}, Msg: ${msg}`);

        // If not found, attempt to create it
        if (status === 404 || msg.toLowerCase().includes("not found")) {
          console.log(`[WhatsApp Start] Session "${session}" not found. Attempting auto-creation...`);
          try {
            const createRes = await axios.post(`${baseUrl.replace(/\/$/, '')}/api/sessions`, { name: session }, {
              headers: headers,
              timeout: 10000
            });
            uuid = createRes.data?.id || uuid;
            console.log(`[WhatsApp Start] Session created. New UUID: "${uuid}". Booting...`);
          } catch (createErr: any) {
            const createStatus = createErr.response?.status;
            // 409 Conflict means the session/name already exists, which is safe to proceed
            if (createStatus !== 409) {
              throw createErr;
            }
          }

          // Try starting again
          const response = await axios.post(`${baseUrl.replace(/\/$/, '')}/api/sessions/${uuid}/start`, {}, {
            headers: headers,
            timeout: 10000
          });

          const reqHost = req.get('host');
          if (reqHost) {
            registerWebhookOnGateway(baseUrl, token, session, reqHost).catch(() => {});
          }

          return res.json({ success: true, data: response.data });
        } else {
          // If already started, it might return 400 "session already started"
          if (status === 400 && msg.toLowerCase().includes("already")) {
            const reqHost = req.get('host');
            if (reqHost) {
              registerWebhookOnGateway(baseUrl, token, session, reqHost).catch(() => {});
            }
            return res.json({ success: true, message: "Session already active/started", status: "ready" });
          }
          throw startErr;
        }
      }
    } catch (error: any) {
      console.error("[WhatsApp Start Proxy Error]:", error.response?.data || error.message);
      res.json({ 
        success: false, 
        error: error.response?.data?.message || error.message || "Failed to start session" 
      });
    }
  });

  // API Route: Get WhatsApp Session QR Code
  app.get("/api/whatsapp-qr", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const idToken = authHeader?.startsWith('Bearer ') ? authHeader.split('Bearer ')[1] : undefined;
      const authResult = await verifyAdmin(idToken);
      if (!authResult.isAdmin) {
        return res.status(403).json({ error: "Forbidden: Admin access required." });
      }

      // Fetch settings
      let settings: any = {};
      try {
        const settingsDoc = await db.collection('communicationSettings').doc('global').get();
        if (settingsDoc.exists) {
          settings = settingsDoc.data();
        }
      } catch (dbErr) {
        console.error("[WhatsApp QR Error] DB Fetch failed:", dbErr);
      }

      const baseUrl = settings.openwaBaseUrl || 'https://openwa-dashboard-production-b24e.up.railway.app';
      const session = settings.openwaSessionId || 'baliadventours';
      const token = settings.openwaApiKey;

      if (!token) {
        return res.json({ success: false, error: "OpenWA API Token is not configured in settings." });
      }

      const cleanToken = token.replace('Bearer ', '').trim();
      let uuid = session;
      try {
        const resolved = await resolveOpenWaSession(baseUrl, token, session);
        uuid = resolved.id || session;
      } catch (err: any) {
        console.log(`[WhatsApp QR] Direct metadata lookup failed for "${session}". Trying fallback QR fetch.`);
      }
      
      const response = await axios.get(`${baseUrl.replace(/\/$/, '')}/api/sessions/${uuid}/qr`, {
        headers: {
          'Authorization': `Bearer ${cleanToken}`,
          'X-API-Key': cleanToken,
          'X-Api-Key': cleanToken,
          'api-key': cleanToken
        },
        timeout: 5000
      });

      res.json({ success: true, data: response.data });
    } catch (error: any) {
      console.error("[WhatsApp QR Proxy Error]:", error.response?.data || error.message);
      res.json({ 
        success: false, 
        error: error.response?.data?.message || error.message || "Failed to fetch QR code" 
      });
    }
  });

  // --- ROBUST SEO ENGINE (PERMISSION-PROOF) ---
  const getSEOContent = async (req: any, type?: 'tour' | 'blog') => {
    const db = getAdminDb();
    const reqPath = req.path;

    // 1. Core Defaults (The "Zero-Failure" Layer)
    // Default to Master SaaS marketing details
    let siteName = 'Tripbone';
    let siteDescription = 'Tripbone is an enterprise multi-tenant SaaS platform for tour operators and agencies. Built with AI-powered trip planning, secure billing, and modern booking workflows.';
    let defaultTitle = 'Tripbone - Enterprise Multi Tenant SaaS Platform';
    
    try {
      const metaPath = path.join(process.cwd(), 'metadata.json');
      if (fs.existsSync(metaPath)) {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
        siteName = meta.name || siteName;
        siteDescription = meta.description || siteDescription;
      }
    } catch (e) {}

    // Resolve tenant based on request domain or query param (identical to Client-Side TenantContext)
    let tenantDoc: any = null;
    let resolvedSlug: string | null = null;
    let resolvedCustomDomain: string | null = null;
    try {
      let hostname = '';
      const forwardedHost = req.headers['x-forwarded-host'] || req.get?.('x-forwarded-host');
      const hostHeader = req.get?.('host') || '';
      if (forwardedHost) {
        hostname = (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost).split(',')[0].trim().split(':')[0];
      } else if (hostHeader) {
        hostname = hostHeader.split(':')[0]; // remove port
      } else {
        hostname = req.hostname || '';
      }

      const queryTenant = req.query.tenant;
      const mainDomains = ['tripbone.com', 'localhost', '127.0.0.1'];
      const isMainDomain = mainDomains.some(domain => hostname === domain || hostname.endsWith('.' + domain));
      const isAppSubdomain = hostname.startsWith('app.') || hostname.startsWith('app-');
      const isAiStudio = hostname.includes('run.app') && !forwardedHost;

      if (queryTenant && !isAppSubdomain) {
        resolvedSlug = (queryTenant as string).toLowerCase();
      } else if (!isAppSubdomain) {
        if (!isAiStudio) {
          if (isMainDomain) {
            const parts = hostname.split('.');
            if (parts.length > 1 && parts[parts.length - 1] === 'localhost') {
              if (parts[0] !== 'www' && parts[0] !== 'localhost' && parts[0] !== 'app') {
                resolvedSlug = parts[0].toLowerCase();
              }
            } else if (parts.length > 2) {
              const subdomain = parts[0];
              if (subdomain !== 'www' && subdomain !== 'app') {
                resolvedSlug = subdomain.toLowerCase();
              }
            }
          } else {
            resolvedCustomDomain = hostname.toLowerCase();
          }
        }
      }

      if (resolvedSlug) {
        try {
          const tenantsSnap = await db.collection('tenants').where('slug', '==', resolvedSlug).limit(1).get();
          if (!tenantsSnap.empty) {
            tenantDoc = { id: tenantsSnap.docs[0].id, ...tenantsSnap.docs[0].data() };
            console.log(`[SEO Server] Resolved tenant ${resolvedSlug} (ID: ${tenantDoc.id}) via Admin SDK`);
          }
        } catch (e) {
          try {
            const docs = await fetchFromREST('tenants', undefined, {
              whereFilters: [{ field: 'slug', op: 'EQUAL', value: resolvedSlug }],
              limit: 1
            });
            if (docs && docs.length > 0) {
              tenantDoc = docs[0];
              console.log(`[SEO Server] Resolved tenant ${resolvedSlug} (ID: ${tenantDoc.id}) via REST API`);
            }
          } catch (restE) {}
        }
      } else if (resolvedCustomDomain) {
        const cleanDomain = resolvedCustomDomain.replace(/^www\./i, '');
        const domainsToSearch = [cleanDomain, 'www.' + cleanDomain];
        try {
          const tenantsSnap = await db.collection('tenants').where('customDomain', 'in', domainsToSearch).limit(1).get();
          if (!tenantsSnap.empty) {
            tenantDoc = { id: tenantsSnap.docs[0].id, ...tenantsSnap.docs[0].data() };
            console.log(`[SEO Server] Resolved tenant from custom domain ${resolvedCustomDomain} (ID: ${tenantDoc.id}) via Admin SDK`);
          }
        } catch (e) {
          try {
            const docs = await fetchFromREST('tenants', undefined, {
              whereFilters: [{ field: 'customDomain', op: 'IN', value: domainsToSearch }],
              limit: 1
            });
            if (docs && docs.length > 0) {
              tenantDoc = docs[0];
              console.log(`[SEO Server] Resolved tenant from custom domain ${resolvedCustomDomain} (ID: ${tenantDoc.id}) via REST API`);
            }
          } catch (restE) {}
        }
      }
    } catch (err: any) {
      console.error("[SEO Server Tenant Resolve Error]:", err.message || err);
    }

    if (tenantDoc) {
      siteName = tenantDoc.companyName || 'Bali Adventours';
      siteDescription = tenantDoc.description || `Book Tour and Adventours in Bali - ${siteName}`;
      defaultTitle = `Book Tour and Adventours - ${siteName}`;
    }

    const seo = {
      title: defaultTitle,
      description: siteDescription,
      image: tenantDoc?.logo || 'https://i.ibb.co.com/pvLCVYkM/ALAS-HARUM8-optimized.webp',
      siteName: siteName,
      isProduct: false,
      isArticle: false,
      status: tenantDoc ? `tenant-${tenantDoc.slug}` : 'master-default',
      preloadedData: null as any,
      keywords: ''
    };

    // 2. Specialized Logic (The "Known Pages" Layer)
    const segments = reqPath.split('/').filter(Boolean);
    const slug = segments.length > 0 ? segments[segments.length - 1] : '';
    
    // Explicit mappings for main dynamic-static pages
    const pageMappings: Record<string, { title: string; desc: string }> = {
      'tours': { 
        title: `Experience Tours with ${siteName}`, 
        desc: `Discover Bali's most extraordinary expeditions. Explore our curated collection of premium tours from majestic peaks to coastal sanctuaries.`
      },
      'blog': { 
        title: `Adventure Stories & Travel Guides | ${siteName}`, 
        desc: `Read our latest travel guides, tips and stories about exploring the beautiful island of Bali.`
      },
      'about': { 
        title: `About us | ${siteName}`, 
        desc: `Learn about our mission to provide the most authentic and premium experiences in Bali.`
      },
      'contact': { 
        title: `Contact Us | ${siteName}`, 
        desc: `Have questions? We're here to help you plan your perfect Bali adventure.`
      },
      'destinations': { 
        title: `Explore Bali Destinations | ${siteName}`, 
        desc: `Discover the best places to visit in Bali, from Ubud to Canggu and beyond.`
      },
      'planner': { 
        title: `AI-Powered Bali Trip Planner | ${siteName}`, 
        desc: `Create your personalized Bali itinerary in seconds with our advanced AI travel planner.`
      },
      'ai-hub': { 
        title: `AI Bali Travel Hub & Search-Grounded FAQs | ${siteName}`, 
        desc: `Consult our grounded AI Bali Concierge, browse semantic FAQs and smart packing/culture traveler tips compiled by local travel experts.`
      }
    };

    if (pageMappings[slug]) {
        seo.title = pageMappings[slug].title;
        seo.description = pageMappings[slug].desc;
        seo.status = 'static-page-mapped';
    } else if (slug && (type || segments.length > 0)) {
       const pretty = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
       seo.title = `${pretty} | ${siteName}`;
       seo.description = `Experience ${pretty} with ${siteName}. Special offers and easy booking available.`;
       seo.status = 'slug-parsed';
    }

    if (reqPath === '/') {
       if (tenantDoc) {
         seo.title = `Book Tour and Adventours in Bali - ${siteName}`;
         seo.description = siteDescription;
         seo.status = 'tenant-home-default';
       } else {
         seo.title = defaultTitle;
         seo.description = siteDescription;
         seo.status = 'master-home-default';
       }
    }

    // 3. Database Fetch (The "Gold Standard" Layer - with resilient permission-proof REST fallback)
    const settingsDocId = tenantDoc ? tenantDoc.id : 'general';
    let settings: any = null;
    try {
      // Fetch site-wide settings first
      const settingsSnap = await db.collection('settings').doc(settingsDocId).get();
      if (settingsSnap.exists) {
        settings = settingsSnap.data() || {};
        console.log(`[SEO Admin] Successfully fetched ${settingsDocId} settings via Admin SDK`);
      }
    } catch (e: any) {
      try {
        settings = await fetchFromREST('settings', settingsDocId);
        if (settings) {
          console.log(`[SEO Channel] Successfully matched ${settingsDocId} settings`);
        }
      } catch (restErr: any) {
        // Fallback silently to defaults
      }
    }

    if (settings) {
      seo.siteName = settings.siteName || tenantDoc?.companyName || seo.siteName;
      seo.image = settings.ogImage || tenantDoc?.logo || seo.image;
      if (settings.siteKeywords) {
        seo.keywords = settings.siteKeywords;
      }
      if (reqPath === '/') {
        let derivedTitle = settings.metaTitle;
        if (!derivedTitle && settings.homeTitleFormat) {
          derivedTitle = settings.homeTitleFormat.replace(/\{\{siteName\}\}/gi, seo.siteName);
        }
        seo.title = derivedTitle || (tenantDoc ? `Book Tour and Adventours in Bali - ${seo.siteName}` : defaultTitle);
        seo.description = settings.siteDescription || settings.metaDescription || seo.description;
      }
    }

    try {
      // Determine content type and collection
      let collection = '';
      let isSingleDoc = false;

      if (reqPath.startsWith('/tour/')) {
        collection = 'tours';
        isSingleDoc = true;
      } else if (reqPath.startsWith('/blog/')) {
        collection = 'posts';
        isSingleDoc = true;
      } else if (reqPath === '/') {
        // PRELOAD HOME CONTENT: Fetch featured tours and categories for the home page
        let featured: any[] = [];
        let categories: any[] = [];
        
        const pruneTour = (t: any) => {
          if (!t) return null;
          return {
            id: t.id,
            slug: t.slug || "",
            title: t.title || "",
            duration: t.duration || "",
            regularPrice: t.regularPrice || 0,
            discountPrice: t.discountPrice || null,
            featuredImage: t.featuredImage || "",
            gallery: Array.isArray(t.gallery) && t.gallery.length > 0 ? [t.gallery[0]] : [],
            imageLabelId: t.imageLabelId || null,
            belowTitleLabelId: t.belowTitleLabelId || null,
            priceLabelId: t.priceLabelId || null,
            location: t.location || "",
            rating: t.rating ?? null,
            reviewsCount: t.reviewsCount ?? null,
            status: t.status || null,
            createdAt: t.createdAt || null
          };
        };

        try {
          let toursQuery = db.collection('tours').where('status', 'in', ['published', 'active']);
          if (tenantDoc) {
            toursQuery = toursQuery.where('tenantId', '==', tenantDoc.id);
          }
          const [featuredToursSnap, categoriesSnap] = await Promise.all([
            toursQuery.orderBy('createdAt', 'desc').limit(12).get(),
            db.collection('categories').orderBy('name', 'asc').get()
          ]);
          
          featured = featuredToursSnap.docs.map(doc => pruneTour({ id: doc.id, ...doc.data() })).filter(Boolean);
          categories = categoriesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          console.log("[SEO Admin] Successfully preloaded and pruned home content via Admin SDK");
        } catch (adminHomeErr: any) {
          try {
            const whereFilters: any[] = [{ field: 'status', op: 'IN', value: ['published', 'active'] }];
            if (tenantDoc) {
              whereFilters.push({ field: 'tenantId', op: 'EQUAL', value: tenantDoc.id });
            }
            const [featuredRest, categoriesRest] = await Promise.all([
              fetchFromREST('tours', undefined, {
                whereFilters,
                orderByField: 'createdAt',
                direction: 'DESCENDING',
                limit: 12
              }),
              fetchFromREST('categories', undefined, {
                orderByField: 'name',
                direction: 'ASCENDING'
              })
            ]);
            featured = (featuredRest || []).map(pruneTour).filter(Boolean);
            categories = categoriesRest || [];
            console.log("[SEO Channel] Successfully preloaded and pruned dynamic home content list");
          } catch (restHomeErr: any) {
            // Silently fallback to standard empty arrays
          }
        }
        
        seo.preloadedData = { 
          featuredTours: featured,
          categories: categories
        };
        seo.status = tenantDoc ? `tenant-${tenantDoc.slug}-hydrated` : 'db-home-hydrated';
      }

      if (isSingleDoc && slug) {
        let docData: any = null;
        try {
          const querySnap = await db.collection(collection).where('slug', '==', slug).limit(1).get();
          if (!querySnap.empty) {
            docData = { id: querySnap.docs[0].id, ...querySnap.docs[0].data() };
            console.log(`[SEO Admin] Successfully fetched single doc (${collection}/${slug}) via Admin SDK`);
          }
        } catch (adminDocErr: any) {
          try {
            // Retrieve the resource strictly by slug, matching the equivalent Admin SDK query.
            // This prevents mismatching statuses where tours use 'active' and posts use 'published'.
            const docsList = await fetchFromREST(collection, undefined, {
              whereFilters: [
                { field: 'slug', op: 'EQUAL', value: slug }
              ],
              limit: 1
            });
            if (docsList && docsList.length > 0) {
              docData = docsList[0];
              console.log(`[SEO Channel] Successfully matched single resource: ${collection}/${slug}`);
            }
          } catch (restDocErr: any) {
            // Silently fallback
          }
        }

        if (docData) {
          seo.preloadedData = docData;

          // 3a. Use Explicit SEO fields if they exist
          if (docData.seo) {
            seo.title = docData.seo.title || (docData.title + ' | ' + seo.siteName);
            seo.description = docData.seo.description || docData.excerpt || docData.description || seo.description;
            seo.image = docData.seo.ogImage || docData.featuredImage || (docData.gallery && docData.gallery[0]) || seo.image;
          } else {
            // Fallback to basic fields
            seo.title = docData.title + ' | ' + seo.siteName;
            seo.description = docData.excerpt || docData.description || seo.description;
            seo.image = docData.featuredImage || (docData.gallery && docData.gallery[0]) || seo.image;
          }

          seo.isProduct = collection === 'tours';
          seo.isArticle = collection === 'posts';
          seo.status = 'db-verified-hydrated';
        }
      }
    } catch (dbErr: any) {
      // Quiet fallback
    }

    return seo;
  };

  const applySEO = (html: string, seo: any) => {
    const safeTitle = (seo.title || seo.siteName || 'Tripbone').replace(/"/g, '&quot;');
    const safeDesc = (seo.description || '').replace(/"/g, '&quot;');
    const safeKeywords = (seo.keywords || '').replace(/"/g, '&quot;');
    const safeImage = seo.image || 'https://i.ibb.co.com/pvLCVYkM/ALAS-HARUM8-optimized.webp';
    const safeType = seo.isProduct ? 'product' : (seo.isArticle ? 'article' : 'website');
    const safeSiteName = (seo.siteName || 'Tripbone').replace(/"/g, '&quot;');

    const debugTag = `\n    <!-- SEO INJECTED BY SERVER (${seo.status}) - ${new Date().toISOString()} -->\n    <meta name="seo-engine" content="express-ssr-v4" />\n    <meta name="seo-status" content="${seo.status}" />`;

    // Data injection for hydration
    const dataScript = seo.preloadedData ? `\n    <script id="preloaded-data" type="application/json">${JSON.stringify(seo.preloadedData)}</script>\n    <script>window.__PRELOADED_DATA__ = JSON.parse(document.getElementById('preloaded-data').innerHTML);</script>` : '';

    const preloadTags = safeImage ? `\n    <link rel="preload" as="image" href="${safeImage}" />` : '';

    let modified = html;

    // 1. Direct placeholder replacements
    modified = modified.replace(/__SEO_TITLE__/g, safeTitle);
    modified = modified.replace(/__SEO_DESCRIPTION__/g, safeDesc);
    modified = modified.replace(/__SEO_KEYWORDS__/g, safeKeywords);
    modified = modified.replace(/__SEO_IMAGE__/g, safeImage);
    modified = modified.replace(/__SEO_TYPE__/g, safeType);
    modified = modified.replace(/__SEO_SITE_NAME__/g, safeSiteName);

    // 2. Clear out any legacy/hardcoded elements just in case the template hasn't been updated
    // Strip existing title
    modified = modified.replace(/<title>.*?<\/title>/gi, '');
    // Strip existing meta descriptions
    modified = modified.replace(/<meta\s+[^>]*name=["']description["'][^>]*\/?>/gi, '');
    // Strip existing keywords
    modified = modified.replace(/<meta\s+[^>]*name=["']keywords["'][^>]*\/?>/gi, '');
    // Strip existing og:* tags
    modified = modified.replace(/<meta\s+[^>]*property=["']og:[^"']*["'][^>]*\/?>/gi, '');
    // Strip existing twitter:* tags
    modified = modified.replace(/<meta\s+[^>]*name=["']twitter:[^"']*["'][^>]*\/?>/gi, '');

    // 3. Inject fully compiled fresh tags right before </head>
    const ogTags = `
    <title>${safeTitle}</title>
    <meta name="description" content="${safeDesc}" />
    <meta name="keywords" content="${safeKeywords}" />
    <meta property="og:title" content="${safeTitle}" />
    <meta property="og:description" content="${safeDesc}" />
    <meta property="og:image" content="${safeImage}" />
    <meta property="og:type" content="${safeType}" />
    <meta property="og:site_name" content="${safeSiteName}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${safeTitle}" />
    <meta name="twitter:description" content="${safeDesc}" />
    <meta name="twitter:image" content="${safeImage}" />${dataScript}${preloadTags}${debugTag}`;

    return modified.replace('</head>', `${ogTags}</head>`);
  };

  // Fallback for non-API POST requests: redirect to GET using 303 to prevent HTTP 405 Method Not Allowed errors
  app.post('*', (req: any, res: any, next: any) => {
    if (req.path.startsWith('/api/')) {
      return next();
    }
    console.log(`[POST Fallback] Redirecting non-API POST to GET: ${req.originalUrl}`);
    res.redirect(303, req.originalUrl);
  });

  const isProd = 
    process.env.NODE_ENV === "production" || 
    (typeof __filename !== "undefined" && (__filename.includes("server.cjs") || __filename.includes("dist"))) ||
    (typeof import.meta !== "undefined" && import.meta.url && (import.meta.url.includes("server.cjs") || import.meta.url.includes("dist")));

  if (!isProd) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom",
    });

    // Mount Vite development middleware FIRST to handle assets, sourcemaps, and client websockets correctly
    app.use(vite.middlewares);

    app.get('*', async (req, res, next) => {
      // Skip API and logic for file extensions (images, scripts, etc)
      if (req.path.startsWith('/api/') || (req.path.includes('.') && !req.path.endsWith('.html'))) {
        return next();
      }

      try {
        const url = req.originalUrl;
        let type: 'tour' | 'blog' | undefined;
        if (url.startsWith('/tour/')) type = 'tour';
        if (url.startsWith('/blog/')) type = 'blog';

        const seo = await getSEOContent(req, type);
        let template = await fs.promises.readFile(path.join(process.cwd(), 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        const html = applySEO(template, seo);
        res.status(200).set({ 
          'Content-Type': 'text/html',
          'X-SEO-Engine': 'express-ssr',
          'X-SEO-Status': seo.status 
        }).end(html);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    let distPath = path.join(process.cwd(), 'dist');
    
    // Auto-detect correct dist folder in serverless or standard container environments
    const hasIndexFile = (dir: string) => fs.existsSync(path.join(dir, 'index.html')) || fs.existsSync(path.join(dir, 'index.template.html'));
    
    if (!fs.existsSync(distPath) || !hasIndexFile(distPath)) {
      const currentFilename = typeof import.meta !== 'undefined' && import.meta.url ? fileURLToPath(import.meta.url) : (typeof __filename !== 'undefined' ? __filename : '');
      const currentDirname = currentFilename ? path.dirname(currentFilename) : (typeof __dirname !== 'undefined' ? __dirname : '');
      const candidates = [
        path.resolve(currentDirname, 'dist'),
        path.resolve(currentDirname, '..', 'dist'),
        path.resolve(currentDirname, '..', '..', 'dist'),
        '/var/task/dist',
        '/var/task/app/dist',
        path.resolve(process.cwd(), 'dist'),
        process.cwd()
      ];
      for (const cand of candidates) {
        if (fs.existsSync(cand) && hasIndexFile(cand)) {
          distPath = cand;
          break;
        }
      }
    }

    app.use('/assets', express.static(path.join(distPath, 'assets'), {
      maxAge: '1y',
      immutable: true
    }));

    app.get('*', async (req, res, next) => {
      // 1. Fast protection against malicious bot scanners probing WordPress or other server exploits.
      // This saves massive network traffic (solving 5GB/12hr bandwidth spikes) and prevents useless database lookups.
      const lowercasePath = req.path.toLowerCase();
      const isBotProbe = 
        lowercasePath.includes('/wp-') ||
        lowercasePath.includes('/xmlrpc') ||
        lowercasePath.includes('/administrator') ||
        lowercasePath.includes('/phpmyadmin') ||
        lowercasePath.includes('/cgi-bin') ||
        lowercasePath.includes('/.env') ||
        lowercasePath.includes('/.git') ||
        lowercasePath.endsWith('.php') ||
        lowercasePath.endsWith('.asp') ||
        lowercasePath.endsWith('.aspx') ||
        lowercasePath.endsWith('.jsp') ||
        lowercasePath.endsWith('.ini') ||
        lowercasePath.endsWith('.sql') ||
        lowercasePath.endsWith('.env') ||
        lowercasePath.endsWith('.yml') ||
        lowercasePath.endsWith('.yaml') ||
        lowercasePath.endsWith('.bak');

      if (isBotProbe) {
        return res.status(404).set({
          'Content-Type': 'text/plain',
          'Cache-Control': 'public, max-age=86400' // cache bad paths at Vercel edge for 1 day
        }).send('Not Found');
      }

      // Skip API and files (images, fonts, etc)
      if (req.path.startsWith('/api/') || (req.path.includes('.') && !req.path.endsWith('.html'))) {
        return next();
      }

      try {
        let type: 'tour' | 'blog' | undefined;
        if (req.path.startsWith('/tour/')) type = 'tour';
        if (req.path.startsWith('/blog/')) type = 'blog';

        const seo = await getSEOContent(req, type);
        
        // Find correct index.template.html or index.html path resolving dynamically
        let htmlPath = path.join(distPath, 'index.template.html');
        if (!fs.existsSync(htmlPath)) {
          htmlPath = path.join(distPath, 'index.html');
        }
        
        if (!fs.existsSync(htmlPath)) {
          const currentFilename = typeof import.meta !== 'undefined' && import.meta.url ? fileURLToPath(import.meta.url) : (typeof __filename !== 'undefined' ? __filename : '');
          const currentDirname = currentFilename ? path.dirname(currentFilename) : (typeof __dirname !== 'undefined' ? __dirname : '');
          const htmlCandidates = [
            path.resolve(process.cwd(), 'dist', 'index.template.html'),
            path.resolve(process.cwd(), 'dist', 'index.html'),
            path.resolve(currentDirname, 'dist', 'index.template.html'),
            path.resolve(currentDirname, 'dist', 'index.html'),
            path.resolve(currentDirname, '..', 'dist', 'index.template.html'),
            path.resolve(currentDirname, '..', 'dist', 'index.html'),
            path.resolve(currentDirname, '..', '..', 'dist', 'index.template.html'),
            path.resolve(currentDirname, '..', '..', 'dist', 'index.html'),
            '/var/task/dist/index.template.html',
            '/var/task/dist/index.html',
            '/var/task/app/dist/index.template.html',
            '/var/task/app/dist/index.html'
          ];
          for (const cand of htmlCandidates) {
            if (fs.existsSync(cand)) {
              htmlPath = cand;
              break;
            }
          }
        }

        // Calculate optimized Cache-Control header for Edge CDN caching of public user-facing routes.
        // This ensures pages are served instantly by the CDN with 0% database or CPU overhead on subsequent hits.
        let cacheHeader = 'no-store, no-cache, must-revalidate, proxy-revalidate';
        const isPublicPage = req.path === '/' || 
                             req.path.startsWith('/tour/') || 
                             req.path.startsWith('/blog/') || 
                             ['/tours', '/blog', '/about', '/contact', '/destinations', '/planner', '/ai-hub', '/price-list', '/track-booking'].includes(req.path);
        
        if (isPublicPage) {
          cacheHeader = 'public, max-age=0, s-maxage=600, stale-while-revalidate=1200';
        }

        if (fs.existsSync(htmlPath)) {
          const template = await fs.promises.readFile(htmlPath, 'utf-8');
          const html = applySEO(template, seo);
          res.status(200).set({ 
            'Content-Type': 'text/html',
            'Cache-Control': cacheHeader,
            'X-SEO-Engine': 'express-ssr',
            'X-SEO-Status': seo.status 
          }).send(html);
        } else {
          // If index.html is still missing in compilation bundle, send a compliant inline HTML from fallback template.
          // This keeps client-side SPA routing entirely functioning and loads correct bundle files.
          const html = applySEO(fallbackHtmlTemplate, seo);
          res.status(200).set({ 
            'Content-Type': 'text/html',
            'Cache-Control': cacheHeader,
            'X-SEO-Engine': 'express-ssr-inline-fallback',
            'X-SEO-Status': 'fallback' 
          }).send(html);
        }
      } catch (error) {
        console.error("[SEO Prod Error]:", error);
        try {
          const fallbackSeo = {
            title: 'Tripbone - Enterprise Multi Tenant SaaS Platform',
            description: 'Tripbone is an enterprise multi-tenant SaaS platform for tour operators and agencies. Built with AI-powered trip planning, secure billing, and modern booking workflows.',
            image: 'https://i.ibb.co.com/pvLCVYkM/ALAS-HARUM8-optimized.webp',
            siteName: 'Tripbone',
            isProduct: false,
            isArticle: false,
            status: 'prod-error-fallback',
            preloadedData: null,
            keywords: 'saas, travel, tour operator, booking software, multi tenant'
          };
          
          let rawHtml = fallbackHtmlTemplate;
          const fallbackPath = fs.existsSync(path.join(distPath, 'index.template.html'))
            ? path.join(distPath, 'index.template.html')
            : path.join(distPath, 'index.html');
          
          if (fs.existsSync(fallbackPath)) {
            rawHtml = await fs.promises.readFile(fallbackPath, 'utf-8');
          }
          
          const html = applySEO(rawHtml, fallbackSeo);
          res.status(200).set({
            'Content-Type': 'text/html',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'X-SEO-Engine': 'express-ssr-error-fallback',
            'X-SEO-Status': 'fallback'
          }).send(html);
        } catch (sendErr) {
          res.status(200).set({
            'Content-Type': 'text/html',
            'Cache-Control': 'no-store, no-cache, must-revalidate'
          }).send(fallbackHtmlTemplate);
        }
      }
    });

    app.use(express.static(distPath, {
      index: false,
      maxAge: '1h'
    }));
  }


  return app;
}

// Start the server
if (!process.env.VERCEL) {
  createServer().then(app => {
    const PORT = Number(process.env.PORT) || 3000;
    app.listen(PORT, "0.0.0.0", async () => {
      console.log(`Server running on http://localhost:${PORT}`);

      // Auto-initialize Default Admins for easy testing and access
      try {
        if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
          console.log("[SaaS Superadmin Boot] Skipping backend Admin auto-provision because FIREBASE_SERVICE_ACCOUNT is not set. Client-side auto-provisioning will seamlessly assign the 'superadmin' role during first sign-in.");
        } else {
          console.log("[SaaS Superadmin Boot] Checking default Admin accounts...");
          const adminsToProvision = [
            { email: "baliadventours@gmail.com", name: "SaaS Superadmin" },
            { email: "admin@tripbone.com", name: "Tripbone Admin" },
            { email: "kuotabox@gmail.com", name: "Kuota Box Admin" }
          ];
          const adminPass = "admin123";

          getAdminApp();
          const db = getAdminDb();

          for (const adminObj of adminsToProvision) {
            let uid: string;
            try {
              const userRec = await admin.auth().getUserByEmail(adminObj.email);
              uid = userRec.uid;
              console.log(`[SaaS Superadmin Boot] Admin user ${adminObj.email} already exists in Firebase Auth. Synchronizing password...`);
              await admin.auth().updateUser(uid, {
                password: adminPass,
                displayName: adminObj.name
              });
            } catch (authErr: any) {
              if (authErr.code === 'auth/user-not-found') {
                try {
                  const newUser = await admin.auth().createUser({
                    email: adminObj.email,
                    password: adminPass,
                    displayName: adminObj.name,
                    emailVerified: true
                  });
                  uid = newUser.uid;
                  console.log(`[SaaS Superadmin Boot] Created admin ${adminObj.email} with UID: ${uid}`);
                } catch (createErr: any) {
                  console.warn(`[SaaS Superadmin Boot] Firebase Auth user creation failed for ${adminObj.email} (possibly due to disabled Identity Toolkit API): ${createErr.message || createErr}. Falling back to deterministic UID in Firestore.`);
                  uid = "det_" + adminObj.email.replace(/[^a-zA-Z0-9]/g, "_");
                }
              } else {
                console.warn(`[SaaS Superadmin Boot] Firebase Auth check failed for ${adminObj.email} (possibly due to disabled Identity Toolkit API): ${authErr.message || authErr}. Falling back to deterministic UID in Firestore.`);
                uid = "det_" + adminObj.email.replace(/[^a-zA-Z0-9]/g, "_");
              }
            }

            // Ensure user profile document exists in Firestore for Superadmin role
            const profile = {
              uid: uid,
              email: adminObj.email,
              displayName: adminObj.name,
              role: "superadmin",
              status: "active",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };

            try {
              if (db) {
                await db.collection("users").doc(uid).set(profile);
                console.log(`[SaaS Superadmin Boot] Wrote Firestore document for ${adminObj.email}`);
              } else {
                throw new Error("SDK DB not initialized");
              }
            } catch (writeErr: any) {
              console.warn(`[SaaS Superadmin Boot] SDK Firestore write failed for ${adminObj.email}: ${writeErr.message}. Falling back to REST.`);
              await writeDocViaRest("users", uid, profile);
            }
          }

          console.log(`
==============================================================
[SaaS Superadmin Boot] ALL ADMIN ACCOUNTS PROVISIONED AND READY!
Emails: baliadventours@gmail.com, admin@tripbone.com, kuotabox@gmail.com
Default Password: ${adminPass}
==============================================================
          `);
        }
      } catch (err: any) {
        console.log("[SaaS Superadmin Boot] Informational: Backend admin auto-provision was skipped or could not complete:", err.message || err);
      }
    });
  }).catch(err => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });
}
