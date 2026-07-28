# Quick Start - Deploy to Render or Railway

## 🚀 Choose Your Platform

### Option 1: Deploy to Render (Recommended)

1. **Push your code to GitHub**
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/uxplore-flask.git
git push -u origin main
```

2. **Create service on Render**
   - Visit [Render Dashboard](https://render.com/dashboard)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Enter:
     - **Name**: uxplore-flask
     - **Build Command**: `pip install -r requirements.txt`
     - **Start Command**: `gunicorn app:app`

3. **Add Database**
   - Click "New +" → "PostgreSQL"
   - Name: "uxplore-postgres"
   - The `DATABASE_URL` will be automatically set

4. **Set Environment Variables**
   - Go to Web Service → Environment
   - Add:
   ```
   SECRET_KEY=<generate a random 32+ char string>
   RESEND_API_KEY=<your-resend-api-key>
   RESEND_FROM_EMAIL=noreply@uxplores.com
   SITE_URL=https://<your-service>.onrender.com
   ADMIN_PASSWORD=<your-secure-password>
   ```

5. **Deploy**
   - Click "Deploy"
   - Wait 2-5 minutes
   - Access at: `https://your-service-name.onrender.com`

---

### Option 2: Deploy to Railway

1. **Push your code to GitHub**
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/uxplore-flask.git
git push -u origin main
```

2. **Create a new project on Railway**
   - Visit [Railway Dashboard](https://railway.app/dashboard)
   - Click "New Project"
   - Select "Deploy from GitHub"
   - Select your repository
   - Railway will auto-detect Python

3. **Add PostgreSQL Database**
   - Click "+ Add Service"
   - Select PostgreSQL
   - DB will be created automatically

4. **Set Environment Variables**
   - Click on your service → Variables
   - Add:
   ```
   SECRET_KEY=<generate a random 32+ char string>
   RESEND_API_KEY=<your-resend-api-key>
   RESEND_FROM_EMAIL=noreply@uxplores.com
   SITE_URL=https://<your-railway-domain>.railway.app
   ADMIN_PASSWORD=<your-secure-password>
   ```

5. **Deploy**
   - Deployment starts automatically
   - Wait 2-5 minutes
   - View live logs
   - Access at Railway-provided domain

---

## 📝 Generate SECRET_KEY

On your terminal (requires Python):
```python
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

Copy the output to use as your `SECRET_KEY`.

---

## ✅ Verify Deployment

After deployment completes:

1. **Visit your app** at the provided URL
2. **Go to Admin** at `https://your-domain/admin/login`
3. **Login** with `ADMIN_PASSWORD` you set
4. **Configure Email** in Admin Dashboard → Newsletter Settings
5. **Test newsletter** by subscribing on the homepage

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| App won't start | Check build logs for Python errors |
| Database error | Verify `DATABASE_URL` is set in environment |
| Static files missing | Commit the `static/` directory to Git |
| Email not working | Add valid `RESEND_API_KEY` in environment |

---

## 💾 Local Development

```bash
# Setup
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Run
python app.py

# Visit http://localhost:5000
```

---

## 📚 Full Documentation

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed setup instructions.

---

**Need help?** Check the platform documentation:
- [Render Docs](https://render.com/docs)
- [Railway Docs](https://docs.railway.app)
