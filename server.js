require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const { clerkClient } = require("@clerk/clerk-sdk-node");

const app = express();
app.use(cors({
    origin: ['http://localhost:8080', 'http://localhost:3000', 'https://spilit.app'],
    credentials: true
}));
app.use(express.json());

// Middleware to verify Clerk token
async function requireAuth(req, res, next) {
    try {
        const token = req.headers.authorization?.replace("Bearer ", "");
        
        if (!token) {
            return res.status(401).json({ error: "No authentication token" });
        }

        // Verify the token with Clerk
        const session = await clerkClient.verifyToken(token);
        req.userId = session.sub;
        next();
    } catch (err) {
        console.error("Auth error:", err);
        return res.status(401).json({ error: "Invalid authentication token" });
    }
}

// Chat endpoint (protected)
app.post("/api/chat", requireAuth, async (req, res) => {
    try {
        const userMessage = req.body.message;
        const userId = req.userId;
        
        console.log(`User ${userId} sent: ${userMessage}`);

        const response = await axios.post(
            "https://api.groq.com/openai/v1/chat/completions",
            {
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "user", content: userMessage }
                ]
            },
            {
                headers: {
                    "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
                    "Content-Type": "application/json"
                }
            }
        );

        console.log("Groq response received");
        const reply = response.data.choices?.[0]?.message?.content;
        res.json({ reply });
    } catch (error) {
        console.error("Groq ERROR:", error.response?.data || error.message);
        res.status(500).json({ error: error.response?.data || "Unknown error" });
    }
});

// Health check endpoint
app.get("/", (req, res) => {
    res.json({ status: "Spilit API running" });
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));