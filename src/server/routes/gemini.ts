import express from "express";
import { getAdminDb } from "../../services/firebaseAdmin.js";
import { handleChatbotRequest } from "../../services/chatbotHandler.js";
import { 
  generateContentWithFallback, 
  resolveTenantGeminiKey, 
  fetchFromREST 
} from "../../services/apiHelpers.js";

const router = express.Router();

// Helper helper to get database
const getDb = () => getAdminDb();

// API Route: AI Grounded Concierge Search & Chat (Public)
router.post("/ask-concierge", async (req, res) => {
  try {
    const { query, tenantId } = req.body;
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: "Missing query or invalid input." });
    }

    const tenantApiKey = await resolveTenantGeminiKey(tenantId);
    const apiKey = tenantApiKey || process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return res.status(400).json({ error: "Gemini API service is currently not configured on this server." });
    }

    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });

    let response;
    let fellBack = false;

    try {
      response = await generateContentWithFallback(ai, {
        model: "gemini-3.5-flash",
        contents: query,
        config: {
          systemInstruction: `You are the Grounded AI Travel Concierge for "Bali Adventours", an ultra-premium tour operator, private driver service, and local adventure curator in Bali, Indonesia. 
          Your goal is to answer tourist questions with absolute accuracy, providing real-world context gathered from search results.
          
          STYLE & GUIDELINES:
          - Use a warm, authentic, local-expert Balinese-friendly tone (e.g. "Suksma!", "Selamat Siang!").
          - Avoid generic or vague advice. Quote prices in Indonesian Rupiah (IDR) where appropriate.
          - Structure your answer cleanly with paragraphs. Do not use complex tables.
          - Keep your response friendly and highly informative.`,
          tools: [{ googleSearch: {} }]
        }
      });
    } catch (err: any) {
      const errMsg = (err.message || "").toLowerCase();
      // If the query exceeds quota, rate limits (429), or says resource is exhausted, fall back to core AI model
      if (
        errMsg.includes("quota") || 
        errMsg.includes("exhausted") || 
        errMsg.includes("rate") || 
        errMsg.includes("429") || 
        errMsg.includes("limit") ||
        errMsg.includes("experiencing high demand") ||
        errMsg.includes("unavailable")
      ) {
        console.warn("[Grounded Concierge Warning] Google Search Grounding quota or access limited. Falling back to Core Knowledge AI generation...");
        fellBack = true;

        response = await generateContentWithFallback(ai, {
          model: "gemini-3.5-flash",
          contents: query,
          config: {
            systemInstruction: `You are the AI Travel Concierge for "Bali Adventours", an ultra-premium tour operator, private driver service, and local adventure curator in Bali, Indonesia. 
            Your goal is to answer tourist questions with absolute accuracy, using your core knowledge.
            
            STYLE & GUIDELINES:
            - Use a warm, authentic, local-expert Balinese-friendly tone (e.g. "Suksma!", "Selamat Siang!").
            - Avoid generic or vague advice. Quote prices in Indonesian Rupiah (IDR) where appropriate.
            - Structure your answer cleanly with paragraphs. Do not use complex tables.
            - Keep your response friendly and highly informative.`
          }
        });
      } else {
        // If it is another kind of error entirely, bubble it
        throw err;
      }
    }

    // Extract the answer content
    const answer = response.text || "I was unable to search for this information. Please try rephrasing.";

    // Extract search grounding metadata sources/citations if present
    const sources: { title: string; url: string }[] = [];
    const candidate = response.candidates?.[0];
    const groundingMetadata = candidate?.groundingMetadata;
    const groundingChunks = groundingMetadata?.groundingChunks;

    if (Array.isArray(groundingChunks)) {
      groundingChunks.forEach(chunk => {
        const web = chunk.web;
        if (web && web.uri) {
          sources.push({
            title: web.title || "Reference Source",
            url: web.uri
          });
        }
      });
    }

    // De-duplicate sources
    const uniqueSources = Array.from(new Map(sources.map(item => [item.url, item])).values());

    res.status(200).json({ 
      answer,
      sources: uniqueSources,
      fellBack
    });

  } catch (error: any) {
    console.error("[Grounded Concierge Error]:", error);
    res.status(500).json({ error: error.message || "Failed to process chat consultation." });
  }
});

// API Route: Generate Tour Data (Public/Admin proxy)
router.post("/generate-tour", async (req, res) => {
  try {
    const { prompt, apiKey, tenantId } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Missing required field: prompt" });
    }

    const tenantApiKey = await resolveTenantGeminiKey(tenantId);
    const finalKey = tenantApiKey || apiKey?.trim() || process.env.GEMINI_API_KEY?.trim();
    if (!finalKey) {
      return res.status(400).json({ error: "Gemini API Key is not configured on the server." });
    }

    const { GoogleGenAI, Type } = await import("@google/genai");
    const ai = new GoogleGenAI({
      apiKey: finalKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const response = await generateContentWithFallback(ai, {
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: `You are a professional travel tour designer for a luxury tour company in Bali called "Bali Adventours".
Your task is to take a rough prompt or itinerary list and transform it into a highly detailed, professional tour description.

VOICE & STYLE:
- Avoid "corporate" or overly polished "marketing" speak.
- Use a storytelling, authentic, and conversational tone, as if a local friend is explaining the experience.
- Focus on the sensory details—the sounds, sights, and feelings—of the experience.
- Keep the language inviting and warm, not just a list of facts.

ITINERARY RULES:
- The first item in the itinerary MUST ALWAYS be "Pick up from the hotel" with a professional description of the meeting and transport.
- The last item in the itinerary MUST ALWAYS be "Back to hotel" with a description of the return journey and drop-off.
- Ensure the middle items flow logically like a real day's adventure.

The output MUST be in valid JSON format according to the schema provided.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Catchy and professional tour title" },
            description: { type: Type.STRING, description: "Detailed and engaging tour description" },
            duration: { type: Type.STRING, description: "Estimated duration e.g. '8 Hours' or 'Full Day'" },
            highlights: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "Top 4-6 key features or highlights of the tour"
            },
            inclusions: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "What's included (e.g. Private transport, Entrance fees, Mineral water)"
            },
            exclusions: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "What's NOT included (e.g. Personal expenses, Tips, Lunch)"
            },
            itinerary: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  day: { type: Type.NUMBER },
                  title: { type: Type.STRING },
                  description: { type: Type.STRING }
                },
                required: ["day", "title", "description"]
              },
              description: "Chronological list of activities"
            },
            importantInfo: { type: Type.STRING, description: "Brief important notes for the traveler" }
          },
          required: ["title", "description", "duration", "highlights", "inclusions", "exclusions", "itinerary"]
        }
      }
    });

    let text = response.text || "";
    if (text.includes("```json")) {
      text = text.split("```json")[1].split("```")[0].trim();
    } else if (text.includes("```")) {
      text = text.split("```")[1].split("```")[0].trim();
    }

    res.json(JSON.parse(text));
  } catch (error: any) {
    console.error("[Generate Tour Server Error]:", error);
    res.status(500).json({ error: error.message || "Failed to generate tour" });
  }
});

// API Route: Generate Blog Post Data (Public/Admin proxy)
router.post("/generate-blog", async (req, res) => {
  try {
    const { prompt, apiKey, tenantId } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Missing required field: prompt" });
    }

    const tenantApiKey = await resolveTenantGeminiKey(tenantId);
    const finalKey = tenantApiKey || apiKey?.trim() || process.env.GEMINI_API_KEY?.trim();
    if (!finalKey) {
      return res.status(400).json({ error: "Gemini API Key is not configured on the server." });
    }

    const { GoogleGenAI, Type } = await import("@google/genai");
    const ai = new GoogleGenAI({
      apiKey: finalKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const response = await generateContentWithFallback(ai, {
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: `You are a professional travel blogger and SEO expert writing for "Bali Adventours".
Your task is to write high-quality, engaging, and SEO-optimized blog posts about Bali and travel.

VOICE & STYLE:
- Use an inspiring, adventurous, yet helpful tone.
- Write in English but feel free to use local Balinese/Indonesian terms with brief explanations where appropriate (e.g., "Canang Sari").
- The content should be informative, providing real value to travelers (tips, hidden gems, cultural etiquette).
- Use proper HTML formatting inside the 'content' field (h2, h3, p, ul, li) for readability.
- The content should be at least 600-800 words long.

The output MUST be in valid JSON format including title, excerpt, full HTML content, category, and tags.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Captivating SEO-friendly blog title" },
            excerpt: { type: Type.STRING, description: "A short, intriguing 2-sentence summary to encourage clicks" },
            content: { type: Type.STRING, description: "Full blog post content with HTML tags (h2, h3, p, ul, li)" },
            category: { type: Type.STRING, description: "Best matching category (e.g., Adventure, Culture, Food, Guide, News)" },
            tags: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "4-6 relevant SEO tags"
            }
          },
          required: ["title", "excerpt", "content", "category", "tags"]
        }
      }
    });

    let text = response.text || "";
    if (text.includes("```json")) {
      text = text.split("```json")[1].split("```")[0].trim();
    } else if (text.includes("```")) {
      text = text.split("```")[1].split("```")[0].trim();
    }

    res.json(JSON.parse(text));
  } catch (error: any) {
    console.error("[Generate Blog Server Error]:", error);
    res.status(500).json({ error: error.message || "Failed to generate blog post" });
  }
});

// API Route: Generate Itinerary (Public/Admin proxy)
router.post("/generate-itinerary", async (req, res) => {
  try {
    const { userData, apiKey, tenantId } = req.body;
    if (!userData) {
      return res.status(400).json({ error: "Missing required field: userData" });
    }

    const tenantApiKey = await resolveTenantGeminiKey(tenantId);
    const finalKey = tenantApiKey || apiKey?.trim() || process.env.GEMINI_API_KEY?.trim();
    if (!finalKey) {
      return res.status(400).json({ error: "Gemini API Key is not configured on the server." });
    }

    const db = getDb();
    // Fetch active tours context from Admin SDK or REST fallback
    let availableTours: any[] = [];
    try {
      const toursSnap = await db.collection('tours').where('status', '==', 'active').limit(20).get();
      if (!toursSnap.empty) {
        availableTours = toursSnap.docs.map(doc => ({
          id: doc.id,
          title: doc.data().title,
          slug: doc.data().slug,
          category: doc.data().category,
          highlights: doc.data().highlights?.join(', ') || ''
        }));
      }
    } catch (sdkErr: any) {
      console.warn("[Itinerary Fetch Admin SDK failed, using REST fallback]:", sdkErr.message);
      try {
        const toursRest = await fetchFromREST('tours', undefined, {
          whereFilters: [{ field: 'status', op: 'EQUAL', value: 'active' }],
          limit: 20
        });
        availableTours = (toursRest || []).map((t: any) => ({
          id: t.id,
          title: t.title,
          slug: t.slug,
          category: t.category,
          highlights: Array.isArray(t.highlights) ? t.highlights.join(', ') : ''
        }));
      } catch (restErr: any) {
        console.error("[Itinerary Fetch REST fallback failed]:", restErr.message);
      }
    }

    const { GoogleGenAI, Type } = await import("@google/genai");
    const ai = new GoogleGenAI({
      apiKey: finalKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const prompt = `
      Create a detailed Bali travel itinerary for:
      Name: ${userData.name}
      From: ${userData.from}
      Dates/Trip Timing: ${userData.tripTiming}
      Duration: ${userData.duration} Days
      Travelers: ${userData.persons} Persons
      Interests: ${userData.interests}
      Preferred Places: ${userData.places}
      Food Preferences: ${userData.food}
      Must-visit Spots: ${userData.hotspots}
      Experience Type: ${userData.experience}
      Hotel Preference: ${userData.hotelType}
      Budget Range: ${userData.budget}

      Context - Available Tours from Bali Adventours:
      ${JSON.stringify(availableTours)}

      Please design a realistic, high-quality, and personalized itinerary from airport pickup to airport drop-off.
      Recommend specific hotels that match their preference.
      Match their interests with our existing tours listed above where appropriate.
      Provide a day-by-day breakdown with various activity types (activity, hotel, meal, transport).
    `;

    const response = await generateContentWithFallback(ai, {
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: `You are "Didi", the expert AI Travel Planner for Bali Adventours. 
Your goal is to create a dream Bali vacation plan that feels authentic, luxurious, and perfectly tailored.

RULES:
1. Use a warm, professional, yet adventurous tone.
2. Ensure the flow of the trip makes geographical sense (e.g., don't jump from South Bali to North Bali twice in one day).
3. Recommend our actual tours (from the provided list) where they fit the user's interests.
4. Include estimated budgets in the local currency (IDR) or USD if more appropriate for the user's origin.
5. The output MUST be valid JSON.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            planTitle: { type: Type.STRING },
            summary: { type: Type.STRING },
            dailyPlans: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  day: { type: Type.NUMBER },
                  title: { type: Type.STRING },
                  activities: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        time: { type: Type.STRING },
                        title: { type: Type.STRING },
                        description: { type: Type.STRING },
                        type: { type: Type.STRING, enum: ['activity', 'hotel', 'meal', 'transport'] }
                      },
                      required: ["time", "title", "description", "type"]
                    }
                  },
                  accommodationRecommendation: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      reason: { type: Type.STRING },
                      estimatedPrice: { type: Type.STRING }
                    },
                    required: ["name", "reason"]
                  }
                },
                required: ["day", "title", "activities", "accommodationRecommendation"]
              }
            },
            recommendedTours: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  tourId: { type: Type.STRING },
                  title: { type: Type.STRING },
                  reason: { type: Type.STRING },
                  slug: { type: Type.STRING }
                }
              }
            },
            estimatedTotalBudget: {
              type: Type.OBJECT,
              properties: {
                amount: { type: Type.STRING },
                breakdown: { type: Type.STRING }
              }
            },
            travelTips: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["planTitle", "summary", "dailyPlans", "recommendedTours", "estimatedTotalBudget", "travelTips"]
        }
      }
    });

    let text = response.text || "";
    if (text.includes("```json")) {
      text = text.split("```json")[1].split("```")[0].trim();
    } else if (text.includes("```")) {
      text = text.split("```")[1].split("```")[0].trim();
    }

    res.json(JSON.parse(text));
  } catch (error: any) {
    console.error("[Generate Itinerary Server Error]:", error);
    res.status(500).json({ error: error.message || "Failed to generate itinerary" });
  }
});

// API Route: Extract Booking From Email (Public/Admin proxy)
router.post("/extract-booking", async (req, res) => {
  try {
    const { emailText, apiKey, tenantId } = req.body;
    if (!emailText) {
      return res.status(400).json({ error: "Missing required field: emailText" });
    }

    const tenantApiKey = await resolveTenantGeminiKey(tenantId);
    const finalKey = tenantApiKey || apiKey?.trim() || process.env.GEMINI_API_KEY?.trim();
    if (!finalKey) {
      return res.status(400).json({ error: "Gemini API Key is not configured on the server." });
    }

    const { GoogleGenAI, Type } = await import("@google/genai");
    const ai = new GoogleGenAI({
      apiKey: finalKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const response = await generateContentWithFallback(ai, { 
      model: "gemini-3.5-flash",
      contents: `EXTRACT BOOKING DATA FROM THE FOLLOWING EMAIL TEXT.
      
      EMAIL TEXT:
      """
      ${emailText}
      """
      
      INSTRUCTIONS:
      - Identify the customer name, email, and phone.
      - Identify the tour title / activity name.
      - Identify the booking date (format: YYYY-MM-DD). Use today's year if not specified but the month/day is.
      - Identify the number of adults and children.
      - Identify the total amount paid and currency.
      - Identify the booking platform (Klook, Viator, GetYourGuide, etc.).
      - If any field is missing, leave it as null or 0.
      
      Output MUST be valid JSON matching the schema provided.`,
      config: {
        systemInstruction: `You are a specialized booking data extractor for Bali Adventours. 
        You handle emails from Klook, Viator, GetYourGuide, and other OTAs.
        Extract every detail accurately. If a phone number is present with a country code, preserve the full number.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            customerName: { type: Type.STRING },
            customerEmail: { type: Type.STRING },
            customerPhone: { type: Type.STRING },
            tourTitle: { type: Type.STRING },
            date: { type: Type.STRING, description: "Format: YYYY-MM-DD" },
            time: { type: Type.STRING },
            adults: { type: Type.NUMBER },
            children: { type: Type.NUMBER },
            totalAmount: { type: Type.NUMBER },
            currency: { type: Type.STRING },
            packageName: { type: Type.STRING },
            specialRequirements: { type: Type.STRING },
            bookingReference: { type: Type.STRING },
            source: { type: Type.STRING, description: "The platform name (e.g., Klook, Viator)" }
          },
          required: ["customerName", "tourTitle", "date", "adults", "totalAmount", "source"]
        }
      }
    });

    let text = response.text || "";
    if (text.includes("```json")) {
      text = text.split("```json")[1].split("```")[0].trim();
    } else if (text.includes("```")) {
      text = text.split("```")[1].split("```")[0].trim();
    }

    res.json(JSON.parse(text));
  } catch (error: any) {
    console.error("[Extract Booking Server Error]:", error);
    res.status(500).json({ error: error.message || "Failed to extract booking data" });
  }
});

// API Route: Chatbot Endpoint
router.post("/chatbot", async (req, res) => {
  try {
    const { messages, origin: reqOrigin, tenantId } = req.body;
    const origin = reqOrigin || req.headers.origin || `https://${req.headers.host}`;
    const result = await handleChatbotRequest(messages, origin, tenantId);
    res.json(result);
  } catch (error: any) {
    console.error("[Server Chatbot API Error]:", error);
    res.status(500).json({ error: error.message || "Failed to process chatbot request" });
  }
});

export default router;
