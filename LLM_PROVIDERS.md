# LLM Provider Options 🤖

Your chatbot now supports multiple LLM providers! Choose the one that works best for you.

## 🚨 Current Issue with Grok

If you see this error:
```
Error code: 403 - Your newly created team doesn't have any credits or licenses yet
```

**Solution**: Either add credits to Grok, or use an alternative provider below.

---

## 🎯 Available Providers

### 1. **Groq** (Recommended - FREE Tier!) ⚡

**Best for**: Getting started quickly with no cost

**Pros**:
- ✅ **FREE tier available** with generous limits
- ✅ Very fast inference (fastest of all options)
- ✅ No credit card required for free tier
- ✅ Good model quality (Mixtral)

**Setup**:
1. Visit: [https://console.groq.com/](https://console.groq.com/)
2. Sign up (free)
3. Go to API Keys section
4. Create a new API key
5. Update your `.env` file:
```bash
LLM_PROVIDER=groq
GROQ_API_KEY=your_groq_api_key_here
```

**Free Tier Limits**:
- 30 requests per minute
- 15,000 tokens per minute
- Perfect for testing and small-scale use

---

### 2. **OpenAI** (ChatGPT) 💚

**Best for**: High-quality responses with established service

**Pros**:
- ✅ Often comes with $5-18 free trial credits for new users
- ✅ Best model quality (GPT-4)
- ✅ Reliable and well-documented
- ✅ Large context window

**Cons**:
- 💰 Requires payment method (even for free tier)
- 💰 Pay-per-use after free credits

**Setup**:
1. Visit: [https://platform.openai.com/](https://platform.openai.com/)
2. Sign up and add payment method
3. Go to API Keys
4. Create a new secret key
5. Update your `.env` file:
```bash
LLM_PROVIDER=openai
OPENAI_API_KEY=your_openai_api_key_here
```

**Pricing** (after free tier):
- GPT-3.5-turbo: ~$0.0015 per 1K tokens (cheap!)
- GPT-4: ~$0.03 per 1K tokens

---

### 3. **Grok** (X.AI) 🔵

**Best for**: Latest from X.AI, but requires credits

**Pros**:
- ✅ Latest technology from X.AI
- ✅ Good performance
- ✅ Unique training data

**Cons**:
- 💰 Requires purchasing credits upfront
- 💰 No free tier

**Setup**:
1. Visit: [https://console.x.ai/](https://console.x.ai/)
2. Add payment method and purchase credits
3. Create API key
4. Update your `.env` file:
```bash
LLM_PROVIDER=grok
GROK_API_KEY=your_grok_api_key_here
```

---

## 🔧 How to Switch Providers

### Method 1: Edit `.env` file

Your `.env` file should look like this:

**For Groq (FREE)**:
```bash
LLM_PROVIDER=groq
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx
```

**For OpenAI**:
```bash
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxx
```

**For Grok**:
```bash
LLM_PROVIDER=grok
GROK_API_KEY=xai-xxxxxxxxxxxxxxxxxxxx
```

### Method 2: Keep Multiple Keys

You can have all keys configured and just switch the provider:

```bash
# Choose your provider
LLM_PROVIDER=groq

# Keep all keys (use whichever you want)
GROK_API_KEY=xai-xxxxxxxxxxxxxxxxxxxx
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxx
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx
```

Just change `LLM_PROVIDER` to switch between them!

---

## 📊 Quick Comparison

| Provider | Free Tier | Speed | Quality | Setup Difficulty |
|----------|-----------|-------|---------|------------------|
| **Groq** | ✅ Yes (generous) | ⚡ Very Fast | ⭐⭐⭐⭐ | Easy |
| **OpenAI** | 🟡 $5-18 trial credits | 🔄 Medium | ⭐⭐⭐⭐⭐ | Medium |
| **Grok** | ❌ No | 🔄 Medium | ⭐⭐⭐⭐ | Medium |

---

## 🚀 Quick Start with Groq (FREE)

**Complete setup in 2 minutes**:

```bash
# 1. Get Groq API key (free, no credit card)
# Visit: https://console.groq.com/keys

# 2. Update .env file
echo "LLM_PROVIDER=groq" >> .env
echo "GROQ_API_KEY=your_groq_key_here" >> .env

# 3. Restart your Streamlit app
# It will automatically use Groq!
```

---

## 🔍 Verify Your Setup

After updating `.env`:

1. Restart the Streamlit app
2. Check the sidebar - it will show:
   - Current LLM Provider
   - API Key status
3. Try asking a question

---

## 💡 Recommendations

### If you want FREE:
→ Use **Groq** (best free option)

### If you want BEST quality:
→ Use **OpenAI GPT-4** (costs money but excellent)

### If you want X.AI/Grok:
→ Add credits to your Grok account

---

## 🆘 Still Having Issues?

### Issue: API key not working
- Double-check the key is copied correctly
- Make sure there are no extra spaces
- Verify the key is for the correct provider

### Issue: 403/401 errors
- **403**: No credits/permissions → Add credits or switch provider
- **401**: Invalid API key → Check key is correct

### Issue: Rate limits
- Groq free tier: 30 requests/minute
- OpenAI: Varies by tier
- Solution: Wait a moment or upgrade plan

---

## 📝 Example .env File

Here's a complete example (replace with your actual keys):

```bash
# LLM Provider Configuration
LLM_PROVIDER=groq

# API Keys (get from respective platforms)
GROK_API_KEY=xai-1234567890abcdef
OPENAI_API_KEY=sk-proj-1234567890abcdef
GROQ_API_KEY=gsk_1234567890abcdef
```

---

**💚 Recommended: Start with Groq (it's free and fast!)**

Get your free Groq API key: [https://console.groq.com/keys](https://console.groq.com/keys)

