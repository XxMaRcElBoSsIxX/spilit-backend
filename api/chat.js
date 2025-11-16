const axios = require("axios");
const { clerkClient } = require("@clerk/clerk-sdk-node");

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

    // Handle OPTIONS request
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Verify Clerk authentication
        const token = req.headers.authorization?.replace("Bearer ", "");
        
        if (!token) {
            return res.status(401).json({ error: "No authentication token" });
        }

        // Verify the token with Clerk
        const session = await clerkClient.verifyToken(token);
        const userId = session.sub;
        
        console.log(`User ${userId} sent: ${req.body.message}`);

        // Call Groq API
        const response = await axios.post(
            "https://api.groq.com/openai/v1/chat/completions",
            {
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "user", content: req.body.message }
                ]
            },
            {
                headers: {
                    "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
                    "Content-Type": "application/json"
                }
            }
        );

        const reply = response.data.choices?.[0]?.message?.content;
        
        console.log("Groq response received");
        
        return res.status(200).json({ reply });
        
    } catch (error) {
        console.error("Error:", error.response?.data || error.message);
        return res.status(500).json({ 
            error: error.response?.data || "Unknown error" 
        });
    }
};