# UXplore Flask Deployment Guide

## Quick Start Deployment

This application is configured for deployment on both **Render** and **Railway**.

### Prerequisites
- Git repository set up
- Account on [Render](https://render.com) or [Railway](https://railway.app)
- PostgreSQL database (provided by the platform)

## Deployment on Render

### Step 1: Push to Git
```bash
git init
git add .
git commit -m "Setup for Render deployment"
git push origin main
```

### Step 2: Create a New Web Service on Render
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" and select "Web Service"
3. Connect your GitHub repository
4. Select the repository and branch
5. Fill in the details:
   - **Name**: uxplore-flask
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app`
   - **Plan**: Free or Paid

### Step 3: Add Environment Variables
In the Render dashboard, add the following environment variables:

```
SECRET_KEY=your-very-long-random-secret-key-here
RESEND_API_KEY=your-resend-api-key
RESEND_FROM_EMAIL=noreply@uxplores.com
SITE_URL=https://your-render-domain.onrender.com
ADMIN_PASSWORD=your-secure-admin-password
```

### Step 4: Add PostgreSQL Database
1. Click "+ New"
2. Select "PostgreSQL"
3. Fill in database name and details
4. PostgreSQL connection URL will be automatically set as `DATABASE_URL`

### Step 5: Deploy
- Click "Deploy"
- Wait for the deployment to complete
- Your app will be live at: `https://your-service-name.onrender.com`

---

## Deployment on Railway

### Step 1: Push to Git
```bash
git init
git add .
git commit -m "Setup for Railway deployment"
git push origin main
```

### Step 2: Create Project on Railway
1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click "New Project"
3. Select "Deploy from GitHub"
4. Authorize Railway and select your repository
5. Railway will automatically detect your Python project

### Step 3: Add PostgreSQL Database
1. In your project, click "+ New"
2. Select "PostgreSQL"
3. The database will be automatically connected with `DATABASE_URL` environment variable

### Step 4: Configure Environment Variables
In the Railway project settings, add:

```
SECRET_KEY=your-very-long-random-secret-key-here
RESEND_API_KEY=your-resend-api-key
RESEND_FROM_EMAIL=noreply@uxplores.com
SITE_URL=https://your-railway-domain.railway.app
ADMIN_PASSWORD=your-secure-admin-password
```

### Step 5: Configure Domain
1. Go to "Settings" -> "Domain"
2. Configure a custom domain or use Railway's provided subdomain
3. Deploy is automatic on push to main branch

---

## Environment Variables Explained

| Variable | Description | Required |
|----------|-------------|----------|
| `SECRET_KEY` | Flask session secret (generate a random 32+ char string) | ✅ |
| `DATABASE_URL` | PostgreSQL connection string (auto-set by platform) | ✅ |
| `RESEND_API_KEY` | API key for Resend email service | ✅ |
| `RESEND_FROM_EMAIL` | Sender email address | ✅ |
| `SITE_URL` | Public URL of your deployed application | ✅ |
| `ADMIN_PASSWORD` | Default admin login password | ✅ |

---

## Troubleshooting Deployments

### Issue: Database Connection Error
- **Solution**: Ensure `DATABASE_URL` is set correctly in environment variables
- Check that PostgreSQL database is running on the platform
- Verify username/password are correct

### Issue: Application crashes on startup
- **Solution**: Check deployment logs
- Ensure all environment variables are set
- Verify `requirements.txt` has all dependencies
- Try: `pip install -r requirements.txt` locally to verify

### Issue: Static files not loading
- **Solution**: Ensure `static/` directory is in your repository
- Check that relative paths are correct in templates

### Issue: Email not sending
- **Solution**: Verify `RESEND_API_KEY` is set correctly
- Check Resend dashboard for API key validity
- Ensure `RESEND_FROM_EMAIL` is verified in Resend

---

## Local Development

### Setup
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Run Locally
```bash
python app.py
```

The app will be available at: `http://localhost:5000`

### Database
- Development uses SQLite (stored in `instance/uxplore.db`)
- Production uses PostgreSQL (via `DATABASE_URL`)

---

## Post-Deployment

1. **Set SITE_URL**: Update the `SITE_URL` environment variable with your actual domain
2. **Verify Email**: Test email functionality from the admin panel
3. **Check Newsletter**: Set up newsletter provider credentials in admin dashboard
4. **Setup Admin**: Login with your configured admin password at `/admin/login`

---

## Important Security Notes

🔒 **Before going live:**
- Set a strong `SECRET_KEY` (never use the default)
- Set a secure `ADMIN_PASSWORD`
- Keep API keys (RESEND_API_KEY, etc.) private - only set in deployment platform
- Do NOT commit `.env` or secrets to Git
- Use HTTPS in production (both Render and Railway provide this by default)

---

## Additional Resources

- [Render Documentation](https://render.com/docs)
- [Railway Documentation](https://docs.railway.app)
- [Flask Deployment Guide](https://flask.palletsprojects.com/en/3.0.x/deployment/)
- [Gunicorn Documentation](https://docs.gunicorn.org/)
