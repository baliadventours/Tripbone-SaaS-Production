import express from "express";
import { getAdminDb } from "../../services/firebaseAdmin.js";
import { handleChatbotRequest } from "../../services/chatbotHandler.js";
import { 
  generateContentWithFallback, 
  resolveTenantGeminiKey, 
  fetchFromREST 
} from "../../services/apiHelpers.js";
import { moderateCreemContent } from "../../services/creemService.js";

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

    // Call Creem Moderation API to comply with AI Wrapper policies
    try {
      await moderateCreemContent(query);
    } catch (modErr: any) {
      console.warn("[Moderation blocked query]:", modErr.message);
      return res.status(400).json({ error: "Query blocked by moderation policy." });
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

    // Call Creem Moderation API to comply with AI Wrapper policies
    try {
      await moderateCreemContent(prompt);
    } catch (modErr: any) {
      console.warn("[Moderation blocked prompt]:", modErr.message);
      return res.status(400).json({ error: "Prompt blocked by moderation policy." });
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
    const { prompt, topic, audience, tone, language, isSaaS, apiKey, tenantId } = req.body;
    const finalPrompt = prompt || topic || (topic ? `Write an article on: ${topic}` : null);
    if (!finalPrompt) {
      return res.status(400).json({ error: "Missing required field: prompt or topic" });
    }

    // Call Creem Moderation API to comply with AI Wrapper policies
    try {
      await moderateCreemContent(finalPrompt);
    } catch (modErr: any) {
      console.warn("[Moderation blocked prompt]:", modErr.message);
      return res.status(400).json({ error: "Prompt blocked by moderation policy." });
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

    const isSaaSSite = isSaaS || (finalPrompt.toLowerCase().includes('saas') || finalPrompt.toLowerCase().includes('tour operator') || finalPrompt.toLowerCase().includes('booking'));

    const systemInstruction = isSaaSSite
      ? `You are an expert SaaS content writer and B2B marketing specialist writing for "Tripbone", an all-in-one AI tour operator management system and booking platform.
Your task is to write high-quality, engaging, insightful, and SEO-optimized articles for tour operators, travel agencies, and activity providers.

TOPIC: ${finalPrompt}
AUDIENCE: ${audience || 'Tour Operators & Travel Agencies'}
TONE: ${tone || 'Authoritative, engaging, professional'}
LANGUAGE: ${language || 'English'}

VOICE & STYLE:
- Authoritative, clear, actionable, and encouraging.
- Focus on real operational insights, business growth, booking conversion, and modern technology.
- Use proper HTML formatting inside the 'content' field (h2, h3, p, ul, li, strong) for rich readability.
- The article should be thorough, informative, and around 500-800 words.

The output MUST be in valid JSON format including title, excerpt, full HTML content, category, and tags.`
      : `You are a professional travel blogger and SEO expert writing for "Bali Adventours".
Your task is to write high-quality, engaging, and SEO-optimized blog posts about Bali and travel.

VOICE & STYLE:
- Use an inspiring, adventurous, yet helpful tone.
- Write in English but feel free to use local Balinese/Indonesian terms with brief explanations where appropriate (e.g., "Canang Sari").
- The content should be informative, providing real value to travelers (tips, hidden gems, cultural etiquette).
- Use proper HTML formatting inside the 'content' field (h2, h3, p, ul, li) for readability.
- The content should be at least 600-800 words long.

The output MUST be in valid JSON format including title, excerpt, full HTML content, category, and tags.`;

    const response = await generateContentWithFallback(ai, {
      model: "gemini-3.5-flash",
      contents: finalPrompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Captivating SEO-friendly blog title" },
            excerpt: { type: Type.STRING, description: "A short, intriguing 2-sentence summary to encourage clicks" },
            content: { type: Type.STRING, description: "Full blog post content with HTML tags (h2, h3, p, ul, li)" },
            category: { type: Type.STRING, description: "Best matching category (e.g., Adventure, Culture, Software, Guide, News)" },
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

// API Route: Generate Custom Tour Proposal (SaaS Admin Tool)
router.post("/generate-proposal", async (req, res) => {
  try {
    const { 
      guestName, 
      email, 
      phone, 
      nationality, 
      paxCount, 
      durationDays, 
      selectedItems, 
      marginPercentage, 
      baseSubtotal, 
      totalPrice, 
      specialNotes,
      currency,
      apiKey, 
      tenantId 
    } = req.body;

    if (!guestName || !selectedItems || !Array.isArray(selectedItems)) {
      return res.status(400).json({ error: "Missing required fields: guestName and selectedItems" });
    }

    try {
      await moderateCreemContent(JSON.stringify({ guestName, nationality, selectedItems, specialNotes }));
    } catch (modErr: any) {
      console.warn("[Moderation blocked proposal prompt]:", modErr.message);
      return res.status(400).json({ error: "Proposal input blocked by moderation policy." });
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

    const itemsSummary = selectedItems.map((item: any, idx: number) => 
      `- Item ${idx + 1}: ${item.name} | Category: ${item.type} | Price: ${item.price} ${currency || 'IDR'} (${item.priceType}) | Qty: ${item.quantity} | Day: ${item.day || 'General'}`
    ).join('\n');

    const promptText = `
Generate a luxurious, highly professional travel itinerary and booking proposal for our client.

GUEST DETAILS:
- Name: ${guestName}
- Email: ${email || 'N/A'}
- Phone/WhatsApp: ${phone || 'N/A'}
- Nationality: ${nationality || 'International Guest'}
- Group Size: ${paxCount || 1} Person(s)
- Duration: ${durationDays || 1} Day(s)
- Special Requests/Notes: ${specialNotes || 'None'}

INVENTORY & LOGISTIC ITEMS SELECTED FOR THIS TRIP:
${itemsSummary}

PRICING STRUCTURE (INCLUDED IN PROPOSAL):
- Calculated Total Package Price: ${currency || 'IDR'} ${Number(totalPrice || 0).toLocaleString()} (Includes taxes & service charges)

INSTRUCTIONS FOR AI:
1. Craft an elegant, welcoming proposal title and client greeting personalized to ${guestName}.
2. Synthesize the selected inventory items into a cohesive, day-by-day rich narrative itinerary (${durationDays || 1} Day(s)).
3. Provide an itemDescriptions array containing an engaging, concise 1-sentence AI description for each inventory/logistic item provided (e.g. for "Lunch at Bebek Tepi Sawah": "A delicious lunch served in a traditional restaurant with rice terrace view", for "Airport Transfer": "Comfortable transfer to the airport with AC car").
4. Detail clear Inclusions and Exclusions based on the inventory items provided.
5. Add 3-4 valuable travel tips for a seamless experience in Bali/Indonesia.
6. Provide a warm closing call-to-action note inviting them to confirm the proposal.
`;

    const response = await generateContentWithFallback(ai, {
      model: "gemini-3.5-flash",
      contents: promptText,
      config: {
        systemInstruction: `You are an elite travel designer and tour operator manager at Tripbone Tour Operations.
You excel at writing captivating, transparent, and polished travel proposals for international and VIP guests.
Outputs MUST be in structured JSON conforming to the requested schema.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            proposalTitle: { type: Type.STRING, description: "Catchy, elegant title for the proposal" },
            welcomeMessage: { type: Type.STRING, description: "Personalized welcome greeting for the guest" },
            itineraryNarrative: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  dayNumber: { type: Type.NUMBER, description: "Day number (1, 2, 3...)" },
                  title: { type: Type.STRING, description: "Day title e.g. Arrival & East Bali Cultural Tour" },
                  summary: { type: Type.STRING, description: "Engaging 2-3 sentence overview of the day's experience" },
                  activities: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Detailed breakdown of activities, logistics, or highlights for the day"
                  }
                },
                required: ["dayNumber", "title", "summary", "activities"]
              }
            },
            itemDescriptions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  itemName: { type: Type.STRING, description: "Matching item name" },
                  aiDescription: { type: Type.STRING, description: "Concise, descriptive 1-sentence overview of this item" }
                },
                required: ["itemName", "aiDescription"]
              },
              description: "AI descriptions for each selected logistic/ticket item"
            },
            inclusions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of all included items based on the inventory"
            },
            exclusions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Standard or specific exclusions (e.g. personal expenses, flights, tipping)"
            },
            importantTips: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Useful travel tips for the guest"
            },
            closingNotes: { type: Type.STRING, description: "Closing call to action for booking confirmation" }
          },
          required: ["proposalTitle", "welcomeMessage", "itineraryNarrative", "inclusions", "exclusions", "importantTips", "closingNotes"]
        }
      }
    });

    const resultText = response.text || "{}";
    const parsedData = JSON.parse(resultText);

    res.json({
      success: true,
      data: parsedData
    });

  } catch (error: any) {
    console.error("Error generating proposal:", error);
    res.status(500).json({ error: error.message || "Failed to generate proposal" });
  }
});

// API Route: Generate Itinerary (Public/Admin proxy)
router.post("/generate-itinerary", async (req, res) => {
  try {
    const { userData, apiKey, tenantId } = req.body;
    if (!userData) {
      return res.status(400).json({ error: "Missing required field: userData" });
    }

    // Call Creem Moderation API to comply with AI Wrapper policies
    try {
      await moderateCreemContent(JSON.stringify(userData));
    } catch (modErr: any) {
      console.warn("[Moderation blocked prompt]:", modErr.message);
      return res.status(400).json({ error: "Prompt blocked by moderation policy." });
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

    // Call Creem Moderation API to comply with AI Wrapper policies
    try {
      await moderateCreemContent(emailText);
    } catch (modErr: any) {
      console.warn("[Moderation blocked email text]:", modErr.message);
      return res.status(400).json({ error: "Email text blocked by moderation policy." });
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

// API Route: Fetch Real External Reviews from TripAdvisor, Google Maps, or Airbnb
router.post("/fetch-external-reviews", async (req, res) => {
  try {
    const { platform, url, tenantId } = req.body;
    if (!platform) {
      return res.status(400).json({ error: "Missing required field: platform" });
    }

    const tenantApiKey = await resolveTenantGeminiKey(tenantId);
    const finalKey = tenantApiKey || process.env.GEMINI_API_KEY?.trim();
    if (!finalKey) {
      return res.status(400).json({ error: "Gemini API Key is not configured on the server." });
    }

    const targetUrl = url || (platform === 'tripadvisor'
      ? 'https://www.tripadvisor.com/Attraction_Review-g297694-d7939737-Reviews-Bali_Adventours-Denpasar_Bali.html'
      : platform === 'airbnb'
      ? 'https://www.airbnb.com/experiences/4127629?modal=reviews'
      : 'https://www.google.com/maps/place/Bali+Adventours/@-8.4655289,115.3440464,18z/data=!4m18!1m9!3m8!1s0x2dd240fe46cca75b:0xbd3a5e58ca91c8b5!2sBali+Adventours');

    // Attempt 1: Direct Page Content Scraping
    let directPageContent = "";
    try {
      const fetchRes = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        signal: AbortSignal.timeout(6000)
      });
      if (fetchRes.ok) {
        const html = await fetchRes.text();
        directPageContent = html
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .slice(0, 15000);
      }
    } catch (e: any) {
      console.log("[Direct page fetch info]:", e.message);
    }

    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey: finalKey });

    let reviews: any[] = [];

    // If direct page text was acquired, extract real reviews from it
    if (directPageContent && directPageContent.length > 200) {
      try {
        const response = await generateContentWithFallback(ai, {
          model: "gemini-3.5-flash",
          contents: `Scraped raw web page content for ${platform} (${targetUrl}):\n\n${directPageContent}\n\nTask: Extract 3 to 6 actual, real customer reviews for "Bali Adventours". Output strictly a JSON array of objects with keys: userName, nationality, rating (number 1-5), comment, platform ("${platform}").`,
          config: {
            systemInstruction: `You are an expert review parser. Output ONLY a valid JSON array of objects with keys: userName, nationality, rating, comment, platform. Do NOT include markdown code fences or extra words.`
          }
        });
        const rawText = (response.text || "").replace(/```json/gi, "").replace(/```/g, "").trim();
        const match = rawText.match(/\[\s*\{[\s\S]*\}\s*\]/);
        const jsonStr = match ? match[0] : rawText;
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed) && parsed.length > 0) {
          reviews = parsed;
        }
      } catch (err: any) {
        console.warn("[Direct content review extraction info]:", err.message);
      }
    }

    // Attempt 2: If direct scraping yielded no reviews, use Google Search Grounding with proper JSON prompt formatting
    if (!reviews || reviews.length === 0) {
      try {
        const searchPrompt = `Search the web using Google Search for actual, real customer reviews published for the tour operator business "Bali Adventours" in Bali, Indonesia on ${platform} (${targetUrl}).

Find real traveler reviews for Bali Adventours on ${platform}.

For each review, extract:
- userName: Name of reviewer
- nationality: Country or origin (e.g. "Australia", "United Kingdom", "United States", "Germany", "France", "Sweden", or "Global Traveler")
- rating: Integer star rating (1 to 5)
- comment: The actual text/quote of their review for Bali Adventours
- platform: "${platform}"

Output MUST be strictly a valid JSON array of review objects. No markdown backticks, no markdown code fence, no commentary before or after.
Example:
[{"userName":"Sarah Jenkins","nationality":"Australia","rating":5,"comment":"We booked Mount Batur sunrise trek with Bali Adventours. Wayan was our driver and Made was our guide. Unforgettable experience!","platform":"${platform}"}]
`;

        const response = await generateContentWithFallback(ai, {
          model: "gemini-3.5-flash",
          contents: searchPrompt,
          config: {
            systemInstruction: `You are a review search AI. Use Google Search to find real customer reviews for "Bali Adventours" on ${platform}. Output ONLY a raw valid JSON array. Do NOT wrap in \`\`\`json markdown blocks or include additional conversation.`,
            tools: [{ googleSearch: {} }]
          }
        });

        let text = (response.text || "").trim();
        text = text.replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/\s*```$/, "").trim();
        const match = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
        const jsonStr = match ? match[0] : text;
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed) && parsed.length > 0) {
          reviews = parsed;
        }
      } catch (aiErr: any) {
        console.error("[Search Grounding External Reviews Error]:", aiErr.message);
      }
    }

    // Format & validate extracted reviews
    reviews = (reviews || []).map((r: any) => ({
      userName: r.userName || 'Verified Traveler',
      nationality: r.nationality || 'Global Traveler',
      rating: Math.min(5, Math.max(1, Number(r.rating) || 5)),
      comment: r.comment || '',
      platform: r.platform || (platform === 'all' ? 'google' : platform)
    })).filter((r: any) => r.comment.length > 5);

    if (reviews.length === 0) {
      return res.status(404).json({
        error: `Could not fetch live reviews from ${platform}. Please check the review link in settings or try again.`
      });
    }

    res.json({ success: true, reviews });
  } catch (error: any) {
    console.error("[Fetch External Reviews Server Error]:", error);
    res.status(500).json({ error: error.message || "Failed to fetch external reviews" });
  }
});

// API Route: AI Blog Post Generator
router.post("/generate-blog", async (req, res) => {
  try {
    const { topic, audience, tone, language, tenantId, isSaaS } = req.body;
    if (!topic || typeof topic !== 'string') {
      return res.status(400).json({ error: "Missing required field: topic" });
    }

    try {
      await moderateCreemContent(topic);
    } catch (modErr: any) {
      console.warn("[Moderation blocked blog topic]:", modErr.message);
      return res.status(400).json({ error: "Topic blocked by moderation policy." });
    }

    const tenantApiKey = await resolveTenantGeminiKey(tenantId);
    const finalKey = tenantApiKey || process.env.GEMINI_API_KEY?.trim();
    if (!finalKey) {
      return res.status(400).json({ error: "Gemini API Key is not configured on the server." });
    }

    const { GoogleGenAI, Type } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey: finalKey });

    const systemContext = isSaaS 
      ? `You are an expert SaaS content strategist, B2B technology writer, and SEO specialist for 'Tripbone' (app.tripbone.com) — a modern, zero-commission, multi-tenant tour operator booking and reservation platform.
Write high-converting, deeply informative, and authoritative B2B SaaS articles for tour operators, travel agencies, DMCs, and experience providers.
Topics include comparisons (e.g., FareHarbor alternatives, Bokun alternatives), 'Why Tripbone', guides to choosing tour booking systems, direct booking growth tactics, and automated booking management.
Output MUST be valid JSON matching the schema.`
      : "You are an expert travel, SaaS, and tourism blog writer and SEO specialist. Output MUST be valid JSON matching the schema.";

    const prompt = `Write a high-quality, SEO-optimized, engaging blog article based on the following instructions.

TOPIC: "${topic}"
TARGET AUDIENCE: ${audience || (isSaaS ? "Tour Operators & Travel Agencies" : "Tour Operators, Travel Agencies, and Enthusiasts")}
TONE OF VOICE: ${tone || "Engaging, Professional, and Authoritative"}
LANGUAGE: ${language || "English"}
${isSaaS ? "BRAND FOCUS: Tripbone Tour Operator Booking & Management System" : ""}

REQUIREMENTS:
1. "title": A catchy, high-CTR blog headline.
2. "slug": Clean URL-friendly slug (e.g. "fareharbor-alternatives-2026-tripbone").
3. "excerpt": A 2-sentence captivating summary/hook.
4. "category": A single relevant category (e.g. "Comparisons & Software", "Platform Guide", "Operator Tips", "Growth Strategies", "Industry Insights").
5. "content": The complete, comprehensive blog article formatted in clean HTML. Use <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>, and <blockquote> tags. Make it deeply informative, readable, and structured with 4-6 detailed sections. Do NOT include <html>, <head>, or <body> tags.
6. "author": A professional author name/title (e.g. "Tripbone Editorial Team" or "Travel Tech Specialist").
7. "readTime": Estimated reading time (e.g. "5 min read").
8. "coverImageQuery": 2-3 English search keywords suitable for finding a relevant high-resolution cover photo on Unsplash.
9. "seoKeywords": An array of 5-8 relevant SEO keywords.`;

    const response = await generateContentWithFallback(ai, {
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: systemContext,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            slug: { type: Type.STRING },
            excerpt: { type: Type.STRING },
            category: { type: Type.STRING },
            content: { type: Type.STRING },
            author: { type: Type.STRING },
            readTime: { type: Type.STRING },
            coverImageQuery: { type: Type.STRING },
            seoKeywords: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["title", "slug", "excerpt", "category", "content", "author", "readTime", "coverImageQuery"]
        }
      }
    });

    let text = response.text || "";
    if (text.includes("```json")) {
      text = text.split("```json")[1].split("```")[0].trim();
    } else if (text.includes("```")) {
      text = text.split("```")[1].split("```")[0].trim();
    }

    const result = JSON.parse(text);
    res.json(result);
  } catch (error: any) {
    console.error("[Generate Blog Server Error]:", error);
    res.status(500).json({ error: error.message || "Failed to generate blog article" });
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

// API Route: Proposal Generator Endpoint
router.post("/generate-proposal", async (req, res) => {
  try {
    const {
      guestName,
      email,
      phone,
      nationality,
      paxCount,
      durationDays,
      selectedItems,
      marginPercentage,
      baseSubtotal,
      marginAmount,
      totalPrice,
      currency,
      specialNotes,
      tenantId
    } = req.body;

    if (!guestName) {
      return res.status(400).json({ success: false, error: "Guest name is required." });
    }

    const tenantApiKey = await resolveTenantGeminiKey(tenantId);
    const apiKey = tenantApiKey || process.env.GEMINI_API_KEY?.trim();

    const itemsSummary = (selectedItems || []).map((i: any) => 
      `- ${i.name} (${i.type}): ${i.quantity} x ${currency} ${Number(i.price).toLocaleString()} (${i.priceType}) [Day ${i.day || 1}]`
    ).join("\n");

    const prompt = `Generate an official, highly convincing, beautifully formatted tour & logistics proposal for guest: "${guestName}".
Guest Details:
- Pax Count: ${paxCount || 1} Person(s)
- Duration: ${durationDays || 1} Day(s)
- Nationality: ${nationality || 'International'}
- Currency: ${currency || 'IDR'}
- Total Investment Price: ${currency} ${Number(totalPrice || 0).toLocaleString()} (includes taxes & margins)
- Special Notes / Preferences: ${specialNotes || 'None'}

Selected Logistics & Inventory Items included in quote:
${itemsSummary}

Generate JSON output with:
1. "proposalTitle": Catchy title for this tour package.
2. "welcomeMessage": Warm, professional 2-3 sentence greeting welcoming the guest.
3. "itineraryNarrative": Array of objects for each day (${durationDays || 1} days), each with:
   - "dayNumber": number
   - "title": string (e.g. "Gates of Heaven & Cultural Discovery")
   - "summary": detailed narrative of what they will experience on this day
   - "activities": array of strings listing key highlights/stops
4. "inclusions": array of string bullet points of what's included in the package
5. "exclusions": array of string bullet points of standard exclusions (e.g., flight, personal expenses)
6. "importantTips": array of string helpful tips for the trip
7. "closingNotes": warm concluding statement encouraging them to confirm booking.`;

    if (!apiKey) {
      // Fallback structured generator if Gemini API key is not present
      const mockProposal = {
        proposalTitle: `${durationDays || 3}-Day Custom Exclusive ${nationality ? nationality + ' Guest ' : ''}Bali Experience`,
        welcomeMessage: `Dear ${guestName}, thank you for choosing our travel services. We are delighted to present this tailored itinerary designed for ${paxCount || 1} guest(s).`,
        itineraryNarrative: Array.from({ length: durationDays || 3 }, (_, idx) => ({
          dayNumber: idx + 1,
          title: `Day ${idx + 1}: ${idx === 0 ? 'Arrival & Cultural Highlights' : idx === 1 ? 'Scenic Exploration & Adventure' : 'Leisure & Departure'}`,
          summary: `Enjoy a curated experience featuring your selected inclusions and private transportation.`,
          activities: (selectedItems || [])
            .filter((i: any) => (i.day || 1) === idx + 1)
            .map((i: any) => `Visit / Experience: ${i.name}`)
        })),
        inclusions: (selectedItems || []).map((i: any) => `${i.name} (${i.quantity} x ${i.priceType})`),
        exclusions: ["International airfare", "Personal travel insurance", "Gratuities for guide & driver"],
        importantTips: ["Bring comfortable footwear and camera", "Sarongs provided for temple visits"],
        closingNotes: "Please contact our team via WhatsApp or email to finalize your dates."
      };

      return res.json({ success: true, data: mockProposal });
    }

    const { GoogleGenAI, Type } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });

    const response = await generateContentWithFallback(ai, {
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an expert luxury travel consultant and proposal writer for tour operators in Bali.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            proposalTitle: { type: Type.STRING },
            welcomeMessage: { type: Type.STRING },
            itineraryNarrative: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  dayNumber: { type: Type.INTEGER },
                  title: { type: Type.STRING },
                  summary: { type: Type.STRING },
                  activities: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["dayNumber", "title", "summary", "activities"]
              }
            },
            inclusions: { type: Type.ARRAY, items: { type: Type.STRING } },
            exclusions: { type: Type.ARRAY, items: { type: Type.STRING } },
            importantTips: { type: Type.ARRAY, items: { type: Type.STRING } },
            closingNotes: { type: Type.STRING }
          },
          required: ["proposalTitle", "welcomeMessage", "itineraryNarrative", "inclusions", "exclusions", "importantTips", "closingNotes"]
        }
      }
    });

    let text = response.text || "";
    if (text.includes("```json")) {
      text = text.split("```json")[1].split("```")[0].trim();
    } else if (text.includes("```")) {
      text = text.split("```")[1].split("```")[0].trim();
    }

    const proposalData = JSON.parse(text);
    return res.json({ success: true, data: proposalData });

  } catch (error: any) {
    console.error("[Generate Proposal Error]:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to generate proposal." });
  }
});

export default router;
