// Quick test script for NVIDIA NIM API
// Model: nvidia/nemotron-3.5-lightning-30b-a3b
// Run with: node test_nim.mjs

const API_KEY = "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";
const BASE_URL = "https://integrate.api.nvidia.com/v1";
const MODEL = "nvidia/nemotron-3.5-lightning-30b-a3b";

async function testNIM() {
  console.log("🚀 Testing NVIDIA NIM API...");
  console.log(`📦 Model: ${MODEL}\n`);

  const prompt = "In one sentence, what is your purpose as an AI assistant?";
  console.log(`🧑 Prompt: ${prompt}\n`);

  try {
    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "user", content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 256,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`API Error ${response.status}: ${err}`);
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content ?? "(no response)";

    console.log("🤖 NIM Response:");
    console.log("-".repeat(50));
    console.log(reply);
    console.log("-".repeat(50));
    console.log(`\n✅ Success! Tokens used: ${data.usage?.total_tokens ?? "N/A"}`);
  } catch (err) {
    console.error("❌ Test failed:", err.message);
  }
}

testNIM();
