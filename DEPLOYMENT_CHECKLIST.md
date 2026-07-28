# Deployment Pre-Flight Checklist

## ✅ Code & Repository
- [ ] All files committed to Git
- [ ] `.env` file in `.gitignore`
- [ ] Static files (CSS, JS, images) included
- [ ] Templates included
- [ ] No hardcoded credentials in code

## ✅ Configuration Files Created
- [ ] `Procfile` - ✓ Created
- [ ] `runtime.txt` - ✓ Created  
- [ ] `requirements.txt` - ✓ Updated with gunicorn & psycopg2
- [ ] `render.yaml` - ✓ Created
- [ ] `railway.toml` - ✓ Created
- [ ] `Dockerfile` - ✓ Created
- [ ] `docker-compose.yml` - ✓ Created
- [ ] `.dockerignore` - ✓ Created
- [ ] `.env.example` - ✓ Created

## ✅ Application Code Updates
- [ ] `app.py` - ✓ Updated to handle DATABASE_URL
- [ ] SQLite for dev, PostgreSQL for prod - ✓ Configured
- [ ] `instance/` directory - ✓ Created
- [ ] Database migrations - N/A (auto-managed)

## ✅ Environment Variables to Set
- [ ] `SECRET_KEY` - Must be set
- [ ] `DATABASE_URL` - Auto-set by platform
- [ ] `RESEND_API_KEY` - Get from Resend
- [ ] `RESEND_FROM_EMAIL` - Set to your domain
- [ ] `SITE_URL` - Set to your deployment URL
- [ ] `ADMIN_PASSWORD` - Set to secure password

## ✅ Before First Deployment

### For Render:
- [ ] GitHub account connected to Render
- [ ] Repository pushed to GitHub (main branch)
- [ ] Render account created
- [ ] PostgreSQL plan selected
- [ ] All environment variables set
- [ ] Domain configured (if using custom domain)

### For Railway:
- [ ] GitHub account connected to Railway
- [ ] Repository pushed to GitHub
- [ ] Railway account created
- [ ] PostgreSQL added from marketplace
- [ ] All environment variables set
- [ ] Public domain enabled (if needed)

## ✅ After Deployment

- [ ] Visit homepage - loads without errors
- [ ] Visit `/admin/login` - login page loads
- [ ] Login with ADMIN_PASSWORD - works correctly
- [ ] Newsletter form - appears on homepage
- [ ] Contact form - appears and works
- [ ] Email sending - test from admin panel
- [ ] Database - persists data after restart
- [ ] Logs - check for any warnings/errors

## 📝 Deployment URLs

**Render:**
- App URL: `https://your-service-name.onrender.com`
- Admin: `https://your-service-name.onrender.com/admin/login`

**Railway:**
- App URL: `https://your-railway-domain.railway.app`
- Admin: `https://your-railway-domain.railway.app/admin/login`

## 🆘 If Something Goes Wrong

1. **Check Application Logs**
   - Render: View in Dashboard → Logs
   - Railway: View in Dashboard → Logs

2. **Verify Environment Variables**
   - All required vars set
   - No typos in variable names
   - Values are correct

3. **Test Locally First**
   ```bash
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   python app.py
   ```

4. **Check Database Connection**
   - Ensure DATABASE_URL is valid
   - Verify PostgreSQL is running
   - Try rebuilding and redeploying

5. **Review Requirements**
   - All Python packages installed
   - No version conflicts
   - psycopg2-binary added for PostgreSQL

## 📞 Get Help

- **Render Support**: https://render.com/support
- **Railway Support**: https://railway.app/support
- **Flask Docs**: https://flask.palletsprojects.com/
- **SQLAlchemy Docs**: https://docs.sqlalchemy.org/
