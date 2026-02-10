# Push this project to Git

## 1. One-time setup (if not already done)

```powershell
cd "c:\Users\SubrahmanyamPillalam\Downloads\Chat-bot 2.0"

# Initialize repo (skip if .git already exists)
git init

# Stage all files (.env is ignored and will NOT be committed)
git add -A
git status

# First commit
git commit -m "IT Help Desk Chatbot - RAG + Streamlit"
```

## 2. Push to GitHub/GitLab/etc.

Create a new empty repository on GitHub (or your Git host), then:

```powershell
# Add your remote (replace with your repo URL)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Push (use main or master depending on your default branch)
git branch -M main
git push -u origin main
```

**Important:** `.env` is in `.gitignore`, so your API keys will **not** be pushed. After cloning, copy `env_template.txt` to `.env` and add your keys.
