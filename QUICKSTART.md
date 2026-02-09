# Quick Start Guide 🚀

Get your IT Help Desk chatbot running in 5 minutes!

## Step 1: Install Dependencies ⬇️

```bash
pip install -r requirements.txt
```

Wait for all packages to install (~2-3 minutes on first run).

## Step 2: Get Grok API Key 🔑

1. Visit [https://console.x.ai/](https://console.x.ai/)
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key (you'll need it in the next step)

## Step 3: Configure Environment 🔧

Create a file named `.env` in the project root:

```bash
GROK_API_KEY=your_actual_api_key_here
```

Replace `your_actual_api_key_here` with the key you copied.

**Windows PowerShell**:
```powershell
echo "GROK_API_KEY=your_actual_api_key_here" > .env
```

**Mac/Linux**:
```bash
echo "GROK_API_KEY=your_actual_api_key_here" > .env
```

## Step 4: Index Documents 📚

Process the sample IT help desk documents:

```bash
python indexer.py
```

You should see:
```
Loading embedding model: all-MiniLM-L6-v2
Loaded: password_reset.txt
Loaded: vpn_access.txt
...
Created X chunks from 5 documents
Indexing Complete!
```

**First time**: The embedding model (~23MB) will be downloaded automatically.

## Step 5: Launch Chatbot 🚀

Start the Streamlit app:

```bash
streamlit run app.py
```

Your browser will automatically open to `http://localhost:8501`

## Step 6: Test It Out! 💬

Try asking:
- "How do I reset my password?"
- "My computer won't turn on"
- "How to setup VPN?"

## Common Issues 🔧

### Issue: "GROK_API_KEY not set"
**Solution**: Check that `.env` file exists and contains your API key

### Issue: "Index file not found"
**Solution**: Run `python indexer.py` first

### Issue: ModuleNotFoundError
**Solution**: Run `pip install -r requirements.txt`

## What's Next? 📖

- Add your own documents to `sample_documents/`
- Customize settings in `config.py`
- Read full documentation in `README.md`

## Need Help? 💡

- Check `README.md` for detailed documentation
- Verify all files are in place
- Ensure Python 3.8+ is installed

---

**That's it! You're ready to go! 🎉**

