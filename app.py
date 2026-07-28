import os
import functools
import secrets
import requests
import smtplib
import ssl
import hashlib
import hmac
import json
from datetime import datetime
from email.message import EmailMessage
from urllib.parse import urljoin

from flask import Flask, render_template, request, jsonify, redirect, url_for, session, Response
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "uxplores-dev-secret-change-me")

# Database configuration - use PostgreSQL in production, SQLite in development
database_url = os.environ.get("DATABASE_URL")
if database_url:
    # Fix the database URL format for SQLAlchemy if needed
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)
    app.config["SQLALCHEMY_DATABASE_URI"] = database_url
else:
    # Development: use SQLite
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///" + os.path.join(BASE_DIR, "instance", "uxplore.db")

app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)

DEFAULT_ADMIN_PASSWORD = "uxplore123"

# ---------------------------------------------------------------------------
# Email Configuration (using Resend)
# ---------------------------------------------------------------------------

RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
RESEND_FROM_EMAIL = os.environ.get("RESEND_FROM_EMAIL", "noreply@uxplores.com")
SITE_URL = os.environ.get("SITE_URL", "http://localhost:5000")


def sign(key, msg):
    return hmac.new(key, msg.encode('utf-8'), hashlib.sha256).digest()


def get_signature_key(key, date_stamp, region_name, service_name):
    k_date = sign(('AWS4' + key).encode('utf-8'), date_stamp)
    k_region = sign(k_date, region_name)
    k_service = sign(k_region, service_name)
    return sign(k_service, 'aws4_request')


def send_via_smtp(to_email, subject, html_content, config):
    host = config.get('smtp_host')
    port = int(config.get('smtp_port') or 587)
    username = config.get('smtp_username')
    password = config.get('smtp_password')
    encryption = (config.get('smtp_encryption') or 'TLS').upper()
    from_email = config.get('from_email') or RESEND_FROM_EMAIL

    if not host or not username or not password:
        print('SMTP configuration incomplete.')
        return False

    message = EmailMessage()
    message['From'] = from_email
    message['To'] = to_email
    message['Subject'] = subject
    message.set_content('Please view this email in an HTML-capable client.')
    message.add_alternative(html_content, subtype='html')

    try:
        if encryption == 'SSL':
            context = ssl.create_default_context()
            with smtplib.SMTP_SSL(host, port, context=context, timeout=10) as smtp:
                smtp.login(username, password)
                smtp.send_message(message)
        else:
            with smtplib.SMTP(host, port, timeout=10) as smtp:
                smtp.ehlo()
                smtp.starttls(context=ssl.create_default_context())
                smtp.ehlo()
                smtp.login(username, password)
                smtp.send_message(message)
        return True
    except Exception as e:
        print(f'SMTP send error: {e}')
        return False


def send_via_resend(to_email, subject, html_content, config):
    api_key = config.get('resend_api_key')
    from_email = config.get('from_email') or RESEND_FROM_EMAIL
    if not api_key:
        print('Resend API key is missing.')
        return False
    try:
        resp = requests.post(
            'https://api.resend.com/emails',
            headers={'Authorization': f'Bearer {api_key}'},
            json={
                'from': from_email,
                'to': to_email,
                'subject': subject,
                'html': html_content,
            },
            timeout=10,
        )
        return resp.status_code in [200, 201]
    except Exception as e:
        print(f'Resend send error: {e}')
        return False


def send_via_sendgrid(to_email, subject, html_content, config):
    api_key = config.get('sendgrid_api_key')
    from_email = config.get('from_email') or RESEND_FROM_EMAIL
    if not api_key:
        print('SendGrid API key is missing.')
        return False
    try:
        resp = requests.post(
            'https://api.sendgrid.com/v3/mail/send',
            headers={
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json',
            },
            json={
                'personalizations': [{ 'to': [{ 'email': to_email }] }],
                'from': { 'email': from_email },
                'subject': subject,
                'content': [{ 'type': 'text/html', 'value': html_content }],
            },
            timeout=10,
        )
        return resp.status_code in [200, 202]
    except Exception as e:
        print(f'SendGrid send error: {e}')
        return False


def send_via_ses(to_email, subject, html_content, config):
    access_key = config.get('ses_access_key')
    secret_key = config.get('ses_secret_key')
    region = config.get('ses_region') or 'us-east-1'
    from_email = config.get('from_email') or RESEND_FROM_EMAIL
    if not access_key or not secret_key or not region:
        print('SES configuration incomplete.')
        return False
    service = 'ses'
    host = f'email.{region}.amazonaws.com'
    endpoint = f'https://{host}/v2/email/outbound-emails'
    t = datetime.utcnow()
    amz_date = t.strftime('%Y%m%dT%H%M%SZ')
    date_stamp = t.strftime('%Y%m%d')

    payload = {
        'FromEmailAddress': from_email,
        'Destination': { 'ToAddresses': [to_email] },
        'Content': {
            'Simple': {
                'Subject': { 'Data': subject, 'Charset': 'UTF-8' },
                'Body': { 'Html': { 'Data': html_content, 'Charset': 'UTF-8' } }
            }
        }
    }
    body = json.dumps(payload, separators=(',', ':'))
    canonical_uri = '/v2/email/outbound-emails'
    canonical_querystring = ''
    payload_hash = hashlib.sha256(body.encode('utf-8')).hexdigest()
    canonical_headers = f'content-type:application/json\nhost:{host}\nx-amz-content-sha256:{payload_hash}\nx-amz-date:{amz_date}\n'
    signed_headers = 'content-type;host;x-amz-content-sha256;x-amz-date'
    canonical_request = f'POST\n{canonical_uri}\n{canonical_querystring}\n{canonical_headers}\n{signed_headers}\n{payload_hash}'
    algorithm = 'AWS4-HMAC-SHA256'
    credential_scope = f'{date_stamp}/{region}/{service}/aws4_request'
    string_to_sign = f"{algorithm}\n{amz_date}\n{credential_scope}\n{hashlib.sha256(canonical_request.encode('utf-8')).hexdigest()}"
    signing_key = get_signature_key(secret_key, date_stamp, region, service)
    signature = hmac.new(signing_key, string_to_sign.encode('utf-8'), hashlib.sha256).hexdigest()
    authorization_header = f'{algorithm} Credential={access_key}/{credential_scope}, SignedHeaders={signed_headers}, Signature={signature}'

    headers = {
        'Content-Type': 'application/json',
        'X-Amz-Date': amz_date,
        'X-Amz-Content-Sha256': payload_hash,
        'Authorization': authorization_header,
    }
    try:
        resp = requests.post(endpoint, headers=headers, data=body, timeout=10)
        return resp.status_code in [200, 202]
    except Exception as e:
        print(f'SES send error: {e}')
        return False


def send_email(to_email, subject, html_content):
    config = get_newsletter_config()
    provider = (config.get('provider') or '').strip().lower()
    if provider == 'smtp':
        return send_via_smtp(to_email, subject, html_content, {
            'smtp_host': config['smtp_host'],
            'smtp_port': config['smtp_port'],
            'smtp_username': config['smtp_username'],
            'smtp_password': get_setting('newsletter_smtp_password'),
            'smtp_encryption': config['smtp_encryption'],
            'from_email': config['from_email'],
        })
    if provider == 'sendgrid':
        return send_via_sendgrid(to_email, subject, html_content, {
            'sendgrid_api_key': get_setting('newsletter_sendgrid_api_key'),
            'from_email': config['from_email'],
        })
    if provider == 'amazon ses' or provider == 'ses':
        return send_via_ses(to_email, subject, html_content, {
            'ses_access_key': get_setting('newsletter_ses_access_key'),
            'ses_secret_key': get_setting('newsletter_ses_secret_key'),
            'ses_region': config['ses_region'],
            'from_email': config['from_email'],
        })
    if provider == 'resend':
        return send_via_resend(to_email, subject, html_content, {
            'resend_api_key': get_setting('newsletter_resend_api_key'),
            'from_email': config['from_email'],
        })
    print('Email sending is disabled because no newsletter provider is configured.')
    return False


def send_verification_email(subscriber_email, token):
    """Send email verification link to new subscriber."""
    site_url = get_setting("newsletter_site_url") or SITE_URL
    verification_link = urljoin(site_url, f"/newsletter/verify?token={token}")
    html = f"""
    <div style="max-width:600px; margin:0 auto; font-family:Arial,sans-serif; color:#333;">
        <div style="background:#f8f9fa; padding:20px; border-radius:10px; margin-bottom:30px;">
            <h2 style="color:#1fa2ff; margin:0;">UXPLORES Newsletter</h2>
            <p style="color:#999; margin:5px 0 0 0; font-size:12px;">Verify your email address</p>
        </div>
        
        <h3 style="color:#333; font-size:18px;">Please Confirm Your Subscription</h3>
        <p style="color:#666; line-height:1.6; margin-bottom:20px;">
            Thanks for subscribing to the UXPLORES newsletter. Please click the button below to verify your email address and receive updates on new blog posts and insights.
        </p>
        
        <a href="{verification_link}" style="display:inline-block; background:#1fa2ff; color:white; padding:12px 30px; border-radius:5px; text-decoration:none; font-weight:bold; margin:20px 0;">
            Verify My Email
        </a>
        
        <p style="color:#999; font-size:12px; margin-top:30px; border-top:1px solid #eee; padding-top:20px;">
            If the button doesn't work, copy and paste this link in your browser:<br>
            <a href="{verification_link}" style="color:#1fa2ff;">{verification_link}</a>
        </p>
        
        <p style="color:#999; font-size:11px; margin-top:20px;">
            This link expires in 48 hours.
        </p>
    </div>
    """
    return send_email(subscriber_email, "Please confirm your newsletter subscription", html)


def send_blog_notification(subscriber_email, blog_post):
    """Send blog notification email to active subscriber."""
    site_url = get_setting("newsletter_site_url") or SITE_URL
    unsubscribe_link = urljoin(site_url, f"/newsletter/unsubscribe?email={subscriber_email}")
    post_link = urljoin(site_url, f"/blog/{blog_post.id}")
    published_date = getattr(blog_post, 'date_str', '') or ''
    
    html = f"""
    <div style="max-width:600px; margin:0 auto; font-family:Arial,sans-serif; color:#333;">
        <div style="background:#f8f9fa; padding:20px; border-radius:10px; margin-bottom:30px;">
            <h2 style="color:#1fa2ff; margin:0;">UXPLORES Newsletter</h2>
            <p style="color:#999; margin:5px 0 0 0; font-size:12px;">New Blog Post</p>
        </div>
        
        {f'<img src="{blog_post.image}" alt="{blog_post.title}" style="width:100%; max-height:300px; object-fit:cover; border-radius:10px; margin-bottom:20px;">' if blog_post.image else ''}
        
        <h3 style="color:#333; font-size:20px; margin:0 0 10px 0;">{blog_post.title}</h3>
        <p style="color:#999; font-size:13px; margin:0 0 15px 0;">
            By {blog_post.author} • {published_date}
        </p>
        
        <p style="color:#666; line-height:1.6; margin-bottom:20px;">
            {blog_post.excerpt}
        </p>
        
        <a href="{post_link}" style="display:inline-block; background:#1fa2ff; color:white; padding:12px 30px; border-radius:5px; text-decoration:none; font-weight:bold; margin:20px 0;">
            Read Full Article
        </a>
        
        <hr style="border:none; border-top:1px solid #eee; margin:30px 0;">
        
        <p style="color:#999; font-size:11px;">
            <a href="{unsubscribe_link}" style="color:#1fa2ff; text-decoration:none;">Unsubscribe from newsletter</a>
        </p>
    </div>
    """
    return send_email(subscriber_email, f"New Blog Post: {blog_post.title}", html)

# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class Setting(db.Model):
    key = db.Column(db.String(64), primary_key=True)
    value = db.Column(db.Text, nullable=False, default="")


class Service(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    icon = db.Column(db.String(64), nullable=False, default="layout-template")
    title = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text, nullable=False, default="")
    color_from = db.Column(db.String(32), nullable=False, default="#1FA2FF")
    color_to = db.Column(db.String(32), nullable=False, default="#E100FF")
    order_index = db.Column(db.Integer, nullable=False, default=0)

    def to_dict(self):
        return {
            "id": self.id, "icon": self.icon, "title": self.title,
            "description": self.description, "color_from": self.color_from,
            "color_to": self.color_to, "order_index": self.order_index,
        }


class Project(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(150), nullable=False)
    category = db.Column(db.String(40), nullable=False, default="web")  # web, mobile, branding, saas
    description = db.Column(db.Text, nullable=False, default="")
    full_description = db.Column(db.Text, nullable=False, default="")
    tags = db.Column(db.String(255), nullable=False, default="")  # comma separated
    image = db.Column(db.String(500), nullable=False, default="")
    stat1_label = db.Column(db.String(60), default="")
    stat1_value = db.Column(db.String(40), default="")
    stat2_label = db.Column(db.String(60), default="")
    stat2_value = db.Column(db.String(40), default="")
    stat3_label = db.Column(db.String(60), default="")
    stat3_value = db.Column(db.String(40), default="")
    challenge = db.Column(db.Text, default="")
    solution = db.Column(db.Text, default="")
    results = db.Column(db.Text, default="")
    featured = db.Column(db.Boolean, default=False)
    order_index = db.Column(db.Integer, nullable=False, default=0)

    def to_dict(self):
        return {
            "id": self.id, "title": self.title, "category": self.category,
            "description": self.description, "full_description": self.full_description,
            "tags": [t.strip() for t in self.tags.split(",") if t.strip()],
            "image": self.image,
            "stats": [
                {"label": self.stat1_label, "value": self.stat1_value},
                {"label": self.stat2_label, "value": self.stat2_value},
                {"label": self.stat3_label, "value": self.stat3_value},
            ],
            "challenge": self.challenge, "solution": self.solution, "results": self.results,
            "featured": self.featured, "order_index": self.order_index,
        }


class BlogPost(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    excerpt = db.Column(db.Text, nullable=False, default="")
    category = db.Column(db.String(40), nullable=False, default="design")
    author = db.Column(db.String(80), nullable=False, default="")
    date_str = db.Column(db.String(40), nullable=False, default="")
    read_time = db.Column(db.String(40), nullable=False, default="5 min read")
    image = db.Column(db.String(500), nullable=False, default="")
    featured = db.Column(db.Boolean, default=False)
    order_index = db.Column(db.Integer, nullable=False, default=0)

    def to_dict(self):
        return {
            "id": self.id, "title": self.title, "excerpt": self.excerpt,
            "category": self.category, "author": self.author, "date": self.date_str,
            "readTime": self.read_time, "image": self.image, "featured": self.featured,
            "order_index": self.order_index,
        }


class TeamMember(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    role = db.Column(db.String(120), nullable=False, default="")
    image = db.Column(db.String(500), nullable=False, default="")
    description = db.Column(db.Text, nullable=False, default="")
    order_index = db.Column(db.Integer, nullable=False, default=0)

    def to_dict(self):
        return {
            "id": self.id, "name": self.name, "role": self.role,
            "image": self.image, "description": self.description,
            "order_index": self.order_index,
        }


class Review(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    designation = db.Column(db.String(120), nullable=False, default="")
    company = db.Column(db.String(120), nullable=False, default="")
    rating = db.Column(db.Integer, nullable=False, default=0)
    text = db.Column(db.Text, nullable=False, default="")
    image = db.Column(db.String(500), nullable=False, default="")
    order_index = db.Column(db.Integer, nullable=False, default=0)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "designation": self.designation,
            "company": self.company,
            "rating": self.rating,
            "text": self.text,
            "image": self.image,
            "order_index": self.order_index,
        }


class ContactSubmission(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(160), nullable=False)
    company = db.Column(db.String(160), default="")
    budget = db.Column(db.String(60), default="")
    project_type = db.Column(db.String(160), default="")
    message = db.Column(db.Text, nullable=False, default="")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_read = db.Column(db.Boolean, default=False)

    def to_dict(self):
        return {
            "id": self.id, "name": self.name, "email": self.email,
            "company": self.company, "budget": self.budget,
            "project_type": self.project_type, "message": self.message,
            "created_at": self.created_at.strftime("%b %d, %Y at %I:%M %p"),
            "is_read": self.is_read,
        }


class NewsletterSubscriber(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(160), nullable=False, unique=True)
    status = db.Column(db.String(20), nullable=False, default="pending")  # pending, active, unsubscribed
    verification_token = db.Column(db.String(128), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    verified_at = db.Column(db.DateTime, nullable=True)
    unsubscribed_at = db.Column(db.DateTime, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "status": self.status,
            "created_at": self.created_at.strftime("%b %d, %Y at %I:%M %p"),
            "verified_at": self.verified_at.strftime("%b %d, %Y") if self.verified_at else None,
        }


# ---------------------------------------------------------------------------
# Settings helpers
# ---------------------------------------------------------------------------

DEFAULT_SETTINGS = {
    "admin_password_hash": generate_password_hash(DEFAULT_ADMIN_PASSWORD),
    "stat_projects": "2022",
    "stat_clients": "25+",
    "stat_awards": "5+",
    "stat_satisfaction": "100%",
    "contact_email": "business@uxplores.com",
    "contact_phone": "+91 81411 58740",
    "contact_address": "Ahmedabad, INDIA",
    "footer_address": "Ahmedabad, INDIA",
    "site_name": "UXPLORES",
    "newsletter_provider": "",
    "newsletter_smtp_host": "",
    "newsletter_smtp_port": "587",
    "newsletter_smtp_username": "",
    "newsletter_smtp_password": "",
    "newsletter_smtp_encryption": "TLS",
    "newsletter_resend_api_key": "",
    "newsletter_sendgrid_api_key": "",
    "newsletter_ses_access_key": "",
    "newsletter_ses_secret_key": "",
    "newsletter_ses_region": "us-east-1",
    "newsletter_from_email": "noreply@uxplores.com",
    "newsletter_site_url": "http://localhost:5000",
}


def get_setting(key, default=""):
    row = db.session.get(Setting, key)
    return row.value if row else DEFAULT_SETTINGS.get(key, default)


def set_setting(key, value):
    row = db.session.get(Setting, key)
    if row is None:
        row = Setting(key=key, value=value)
        db.session.add(row)
    else:
        row.value = value
    db.session.commit()


def get_newsletter_config():
    return {
        "provider": get_setting("newsletter_provider") or "Resend",
        "smtp_host": get_setting("newsletter_smtp_host"),
        "smtp_port": get_setting("newsletter_smtp_port"),
        "smtp_username": get_setting("newsletter_smtp_username"),
        "smtp_password_present": bool(get_setting("newsletter_smtp_password")),
        "smtp_encryption": get_setting("newsletter_smtp_encryption"),
        "resend_api_key_present": bool(get_setting("newsletter_resend_api_key")),
        "sendgrid_api_key_present": bool(get_setting("newsletter_sendgrid_api_key")),
        "ses_access_key_present": bool(get_setting("newsletter_ses_access_key")),
        "ses_secret_key_present": bool(get_setting("newsletter_ses_secret_key")),
        "ses_region": get_setting("newsletter_ses_region"),
        "from_email": get_setting("newsletter_from_email"),
        "site_url": get_setting("newsletter_site_url") or SITE_URL,
    }


def get_newsletter_setting(key):
    return get_setting(f"newsletter_{key}")


def set_newsletter_setting(key, value):
    set_setting(f"newsletter_{key}", value if value is not None else "")


def all_public_settings():
    keys = ["stat_projects", "stat_clients", "stat_awards", "stat_satisfaction",
            "contact_email", "contact_phone", "contact_address", "footer_address", "site_name"]
    return {k: get_setting(k) for k in keys}


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

def admin_required(view):
    @functools.wraps(view)
    def wrapped(*args, **kwargs):
        if not session.get("is_admin"):
            if request.path.startswith("/admin/api/"):
                return jsonify({"error": "unauthorized"}), 401
            return redirect(url_for("admin_login"))
        return view(*args, **kwargs)
    return wrapped


# ---------------------------------------------------------------------------
# Public routes
# ---------------------------------------------------------------------------

@app.route("/")
def home():
    services = Service.query.order_by(Service.order_index).limit(6).all()
    featured_projects = Project.query.order_by(Project.order_index).limit(3).all()
    reviews = Review.query.order_by(Review.order_index).all()
    return render_template("index.html", services=services, projects=featured_projects,
                            reviews=reviews, settings=all_public_settings())


@app.route("/about")
def about():
    team = TeamMember.query.order_by(TeamMember.order_index).all()
    return render_template("about.html", team=team, settings=all_public_settings())


@app.route("/services")
def services_page():
    services = Service.query.order_by(Service.order_index).all()
    return render_template("services.html", services=services, settings=all_public_settings())


@app.route("/portfolio")
@app.route("/work")
def portfolio():
    projects = Project.query.order_by(Project.order_index).all()
    return render_template("portfolio.html", projects=projects, settings=all_public_settings())


@app.route("/blog")
def blog():
    posts = BlogPost.query.order_by(BlogPost.order_index).all()
    return render_template("blog.html", posts=posts, settings=all_public_settings())


@app.route("/blog/<int:post_id>")
def blog_post(post_id):
    post = BlogPost.query.get_or_404(post_id)
    return render_template("blog_post.html", post=post, settings=all_public_settings())


@app.route("/contact")
def contact():
    return render_template("contact.html", settings=all_public_settings())


@app.route("/api/contact", methods=["POST"])
def api_contact():
    data = request.get_json(silent=True) or request.form
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip()
    message = (data.get("message") or "").strip()
    if not name or not email or not message:
        return jsonify({"ok": False, "error": "Name, email, and message are required."}), 400
    sub = ContactSubmission(
        name=name, email=email,
        company=(data.get("company") or "").strip(),
        budget=(data.get("budget") or "").strip(),
        project_type=(data.get("project_type") or "").strip(),
        message=message,
    )
    db.session.add(sub)
    db.session.commit()
    return jsonify({"ok": True})


@app.route("/api/subscribe", methods=["POST"])
def api_subscribe():
    """Subscribe to newsletter. Sends verification email."""
    data = request.get_json(silent=True) or request.form
    email = (data.get("email") or "").strip().lower()
    
    if not email or "@" not in email:
        return jsonify({"ok": False, "error": "Valid email required"}), 400
    
    # Check if already subscribed
    existing = db.session.query(NewsletterSubscriber).filter_by(email=email).first()
    if existing:
        if existing.status == "active":
            return jsonify({"ok": False, "error": "Already subscribed"}), 400
        # If pending or unsubscribed, send verification email again
    else:
        # Create new subscriber
        token = secrets.token_urlsafe(32)
        subscriber = NewsletterSubscriber(email=email, verification_token=token)
        db.session.add(subscriber)
        db.session.commit()
        existing = subscriber
    
    # Send verification email
    token = existing.verification_token or secrets.token_urlsafe(32)
    if not existing.verification_token:
        existing.verification_token = token
        db.session.commit()
    
    send_verification_email(email, token)
    return jsonify({"ok": True, "message": "Verification email sent"})


@app.route("/newsletter/verify", methods=["GET"])
def newsletter_verify():
    """Verify newsletter subscription link."""
    token = request.args.get("token", "").strip()
    if not token:
        return render_template("404.html", settings=all_public_settings()), 404
    
    subscriber = db.session.query(NewsletterSubscriber).filter_by(verification_token=token).first()
    if not subscriber:
        return render_template("404.html", settings=all_public_settings()), 404
    
    # Mark as active
    subscriber.status = "active"
    subscriber.verified_at = datetime.utcnow()
    subscriber.verification_token = None  # Clear token after use
    db.session.commit()
    
    # Show success page
    return render_template("newsletter_verified.html", settings=all_public_settings())


@app.route("/newsletter/unsubscribe", methods=["GET"])
def newsletter_unsubscribe():
    """Unsubscribe from newsletter."""
    email = request.args.get("email", "").strip().lower()
    if not email:
        return render_template("404.html", settings=all_public_settings()), 404
    
    subscriber = db.session.query(NewsletterSubscriber).filter_by(email=email).first()
    if not subscriber:
        return render_template("404.html", settings=all_public_settings()), 404
    
    subscriber.status = "unsubscribed"
    subscriber.unsubscribed_at = datetime.utcnow()
    db.session.commit()
    
    return render_template("newsletter_unsubscribed.html", settings=all_public_settings())


@app.errorhandler(404)
def not_found(e):
    return render_template("404.html", settings=all_public_settings()), 404


# ---------------------------------------------------------------------------
# Admin auth routes
# ---------------------------------------------------------------------------

@app.route("/admin/login", methods=["GET", "POST"])
def admin_login():
    error = None
    if request.method == "POST":
        password = request.form.get("password", "")
        stored_hash = get_setting("admin_password_hash")
        if stored_hash and check_password_hash(stored_hash, password):
            session["is_admin"] = True
            return redirect(url_for("admin_dashboard"))
        error = "Incorrect password. Please try again."
    if session.get("is_admin"):
        return redirect(url_for("admin_dashboard"))
    return render_template("admin/login.html", error=error)


@app.route("/admin/logout")
def admin_logout():
    session.pop("is_admin", None)
    return redirect(url_for("admin_login"))


@app.route("/admin")
@admin_required
def admin_dashboard():
    counts = {
        "projects": Project.query.count(),
        "services": Service.query.count(),
        "blog": BlogPost.query.count(),
        "team": TeamMember.query.count(),
        "reviews": Review.query.count(),
        "contacts": ContactSubmission.query.count(),
        "unread": ContactSubmission.query.filter_by(is_read=False).count(),
        "newsletter": NewsletterSubscriber.query.count(),
    }
    return render_template("admin/dashboard.html", counts=counts)


# ---------------------------------------------------------------------------
# Admin JSON API — generic CRUD helpers
# ---------------------------------------------------------------------------

def crud_list(model):
    items = model.query.order_by(model.order_index).all() if hasattr(model, "order_index") else model.query.all()
    return jsonify([i.to_dict() for i in items])


def crud_create(model, fields):
    obj = model()
    for f in fields:
        if f in request.json:
            setattr(obj, f, request.json[f])
    db.session.add(obj)
    db.session.commit()
    return jsonify(obj.to_dict()), 201


def crud_update(model, item_id, fields):
    obj = model.query.get_or_404(item_id)
    for f in fields:
        if f in request.json:
            setattr(obj, f, request.json[f])
    db.session.commit()
    return jsonify(obj.to_dict())


def crud_delete(model, item_id):
    obj = model.query.get_or_404(item_id)
    db.session.delete(obj)
    db.session.commit()
    return jsonify({"ok": True})


PROJECT_FIELDS = ["title", "category", "description", "full_description", "tags", "image",
                   "stat1_label", "stat1_value", "stat2_label", "stat2_value",
                   "stat3_label", "stat3_value", "challenge", "solution", "results",
                   "featured", "order_index"]
SERVICE_FIELDS = ["icon", "title", "description", "color_from", "color_to", "order_index"]
BLOG_FIELDS = ["title", "excerpt", "category", "author", "date_str", "read_time", "image",
               "featured", "order_index"]
TEAM_FIELDS = ["name", "role", "image", "description", "order_index"]
REVIEW_FIELDS = ["name", "designation", "company", "rating", "text", "image", "order_index"]


def _tags_to_str(payload):
    """Allow tags to come in as a list from the JS client and store as CSV."""
    if "tags" in payload and isinstance(payload["tags"], list):
        payload["tags"] = ", ".join(payload["tags"])


@app.route("/admin/api/projects", methods=["GET", "POST"])
@admin_required
def api_projects():
    if request.method == "GET":
        return crud_list(Project)
    _tags_to_str(request.json)
    return crud_create(Project, PROJECT_FIELDS)


@app.route("/admin/api/projects/<int:item_id>", methods=["PUT", "DELETE"])
@admin_required
def api_project_detail(item_id):
    if request.method == "DELETE":
        return crud_delete(Project, item_id)
    _tags_to_str(request.json)
    return crud_update(Project, item_id, PROJECT_FIELDS)


@app.route("/admin/api/services", methods=["GET", "POST"])
@admin_required
def api_services():
    if request.method == "GET":
        return crud_list(Service)
    return crud_create(Service, SERVICE_FIELDS)


@app.route("/admin/api/services/<int:item_id>", methods=["PUT", "DELETE"])
@admin_required
def api_service_detail(item_id):
    if request.method == "DELETE":
        return crud_delete(Service, item_id)
    return crud_update(Service, item_id, SERVICE_FIELDS)


@app.route("/admin/api/blog", methods=["GET", "POST"])
@admin_required
def api_blog():
    if request.method == "GET":
        return crud_list(BlogPost)
    
    # Create blog post
    obj = BlogPost()
    for f in BLOG_FIELDS:
        if f in request.json:
            setattr(obj, f, request.json[f])
    db.session.add(obj)
    db.session.commit()
    
    # Send newsletter notifications to active subscribers
    active_subscribers = db.session.query(NewsletterSubscriber).filter_by(status="active").all()
    for subscriber in active_subscribers:
        send_blog_notification(subscriber.email, obj)
    
    return jsonify(obj.to_dict()), 201


@app.route("/admin/api/blog/<int:item_id>", methods=["PUT", "DELETE"])
@admin_required
def api_blog_detail(item_id):
    if request.method == "DELETE":
        return crud_delete(BlogPost, item_id)
    return crud_update(BlogPost, item_id, BLOG_FIELDS)


@app.route("/admin/api/team", methods=["GET", "POST"])
@admin_required
def api_team():
    if request.method == "GET":
        return crud_list(TeamMember)
    return crud_create(TeamMember, TEAM_FIELDS)


@app.route("/admin/api/team/<int:item_id>", methods=["PUT", "DELETE"])
@admin_required
def api_team_detail(item_id):
    if request.method == "DELETE":
        return crud_delete(TeamMember, item_id)
    return crud_update(TeamMember, item_id, TEAM_FIELDS)


@app.route("/admin/api/reviews", methods=["GET", "POST"])
@admin_required
def api_reviews():
    if request.method == "GET":
        return crud_list(Review)
    return crud_create(Review, REVIEW_FIELDS)


@app.route("/admin/api/reviews/<int:item_id>", methods=["PUT", "DELETE"])
@admin_required
def api_review_detail(item_id):
    if request.method == "DELETE":
        return crud_delete(Review, item_id)
    return crud_update(Review, item_id, REVIEW_FIELDS)


@app.route("/admin/api/contacts", methods=["GET"])
@admin_required
def api_contacts():
    items = ContactSubmission.query.order_by(ContactSubmission.created_at.desc()).all()
    return jsonify([i.to_dict() for i in items])


@app.route("/admin/api/contacts/<int:item_id>", methods=["PATCH", "DELETE"])
@admin_required
def api_contact_detail(item_id):
    obj = ContactSubmission.query.get_or_404(item_id)
    if request.method == "DELETE":
        db.session.delete(obj)
        db.session.commit()
        return jsonify({"ok": True})
    if "is_read" in request.json:
        obj.is_read = bool(request.json["is_read"])
        db.session.commit()
    return jsonify(obj.to_dict())


@app.route("/admin/api/settings", methods=["GET", "POST"])
@admin_required
def api_settings():
    if request.method == "GET":
        return jsonify(all_public_settings())
    for key in ["stat_projects", "stat_clients", "stat_awards", "stat_satisfaction",
                "contact_email", "contact_phone", "contact_address", "footer_address", "site_name"]:
        if key in request.json:
            set_setting(key, request.json[key])
    return jsonify(all_public_settings())


@app.route("/admin/api/change-password", methods=["POST"])
@admin_required
def api_change_password():
    current = request.json.get("current_password", "")
    new = request.json.get("new_password", "")
    stored_hash = get_setting("admin_password_hash")
    if not check_password_hash(stored_hash, current):
        return jsonify({"ok": False, "error": "Current password is incorrect."}), 400
    if len(new) < 6:
        return jsonify({"ok": False, "error": "New password must be at least 6 characters."}), 400
    set_setting("admin_password_hash", generate_password_hash(new))
    return jsonify({"ok": True})


@app.route("/admin/api/newsletter/subscribers", methods=["GET"])
@admin_required
def api_newsletter_subscribers():
    """Get newsletter subscribers with pagination."""
    status = request.args.get("status", "")  # 'active', 'pending', 'unsubscribed', or '' for all
    query_text = (request.args.get("q", "") or "").strip()
    page = request.args.get("page", 1, type=int)
    per_page = 20
    
    query = db.session.query(NewsletterSubscriber)
    if status:
        query = query.filter_by(status=status)
    if query_text:
        query = query.filter(NewsletterSubscriber.email.ilike(f"%{query_text}%"))
    
    total = query.count()
    subscribers = query.order_by(NewsletterSubscriber.created_at.desc()).paginate(page=page, per_page=per_page)
    
    return jsonify({
        "ok": True,
        "total": total,
        "active_count": db.session.query(NewsletterSubscriber).filter_by(status="active").count(),
        "pending_count": db.session.query(NewsletterSubscriber).filter_by(status="pending").count(),
        "unsubscribed_count": db.session.query(NewsletterSubscriber).filter_by(status="unsubscribed").count(),
        "subscribers": [s.to_dict() for s in subscribers.items],
        "page": page,
        "total_pages": subscribers.pages,
    })


@app.route("/admin/api/newsletter/send-test", methods=["POST"])
@admin_required
def api_newsletter_send_test():
    """Send test newsletter email."""
    email = request.json.get("email", "").strip()
    if not email:
        return jsonify({"ok": False, "error": "Email required"}), 400
    
    # Create a fake blog post for testing
    class FakeBlogPost:
        id = 1
        title = "Test Blog Post"
        author = "UXPLORES"
        excerpt = "This is a test email to verify your newsletter setup is working correctly."
        image = "https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&h=300&fit=crop"
        date_str = datetime.utcnow().strftime("%b %d, %Y")
    
    success = send_blog_notification(email, FakeBlogPost())
    if success:
        return jsonify({"ok": True, "message": "Test email sent"})
    else:
        return jsonify({"ok": False, "error": "Failed to send email. Check API key configuration."}), 500


@app.route("/admin/api/newsletter/config", methods=["GET", "POST"])
@admin_required
def api_newsletter_config():
    if request.method == "GET":
        config = get_newsletter_config()
        return jsonify({
            "ok": True,
            "provider": config["provider"],
            "smtp_host": config["smtp_host"],
            "smtp_port": config["smtp_port"],
            "smtp_username": config["smtp_username"],
            "smtp_password_present": config["smtp_password_present"],
            "smtp_encryption": config["smtp_encryption"],
            "resend_api_key_present": config["resend_api_key_present"],
            "sendgrid_api_key_present": config["sendgrid_api_key_present"],
            "ses_access_key_present": config["ses_access_key_present"],
            "ses_secret_key_present": config["ses_secret_key_present"],
            "ses_region": config["ses_region"],
            "from_email": config["from_email"],
            "site_url": config["site_url"],
        })

    payload = request.json or {}
    allowed = {
        "provider": "newsletter_provider",
        "smtp_host": "newsletter_smtp_host",
        "smtp_port": "newsletter_smtp_port",
        "smtp_username": "newsletter_smtp_username",
        "smtp_password": "newsletter_smtp_password",
        "smtp_encryption": "newsletter_smtp_encryption",
        "resend_api_key": "newsletter_resend_api_key",
        "sendgrid_api_key": "newsletter_sendgrid_api_key",
        "ses_access_key": "newsletter_ses_access_key",
        "ses_secret_key": "newsletter_ses_secret_key",
        "ses_region": "newsletter_ses_region",
        "from_email": "newsletter_from_email",
        "site_url": "newsletter_site_url",
    }

    for field, setting_key in allowed.items():
        if field not in payload:
            continue
        if field in ["smtp_password", "resend_api_key", "sendgrid_api_key", "ses_access_key", "ses_secret_key"]:
            value = payload[field].strip() if payload[field] and payload[field] != "********" else None
        else:
            value = payload[field].strip() if isinstance(payload[field], str) else payload[field]
        if value is not None:
            set_setting(setting_key, value)

    return jsonify({"ok": True, "message": "Newsletter configuration saved."})


@app.route("/admin/api/newsletter/subscribers/<int:item_id>", methods=["DELETE"])
@admin_required
def api_newsletter_subscriber_delete(item_id):
    subscriber = NewsletterSubscriber.query.get_or_404(item_id)
    db.session.delete(subscriber)
    db.session.commit()
    return jsonify({"ok": True})


@app.route("/admin/api/newsletter/subscribers/export", methods=["GET"])
@admin_required
def api_newsletter_subscribers_export():
    status = request.args.get("status", "")
    query = db.session.query(NewsletterSubscriber)
    if status:
        query = query.filter_by(status=status)
    items = query.order_by(NewsletterSubscriber.created_at.desc()).all()

    csv_lines = ["email,subscription_date,status,verified"]
    for sub in items:
        verified = "Yes" if sub.status == "active" else "No"
        csv_lines.append(
            f'"{sub.email}","{sub.created_at.isoformat()}","{sub.status}","{verified}"'
        )
    csv_data = "\n".join(csv_lines)
    return Response(csv_data, mimetype="text/csv", headers={"Content-Disposition": "attachment; filename=newsletter-subscribers.csv"})


# ---------------------------------------------------------------------------
# DB init + seed
# ---------------------------------------------------------------------------
def seed_if_empty():
    for key, value in DEFAULT_SETTINGS.items():
        if db.session.get(Setting, key) is None:
            db.session.add(Setting(key=key, value=value))
    db.session.commit()

    if Service.query.count() == 0:
        # First 6 (order 0-5) power the Home "What We Do" section.
        # All 9 power the full Services page.
        services = [
            ("pen-tool", "UI/UX Design", "User research, wireframing, prototyping, and usability testing that puts real users at the center of every decision.", "#1FA2FF", "#0B5ED7"),
            ("code", "Web Development", "Custom websites, portals, and web applications built to be fast, scalable, and easy to maintain.", "#38BDF8", "#1FA2FF"),
            ("smartphone", "Mobile App Development", "iOS, Android, and cross-platform applications engineered for smooth, native-feeling experiences.", "#1FA2FF", "#2563EB"),
            ("settings", "Custom Software Development", "Tailored business software solutions built around your exact workflows and requirements.", "#0EA5E9", "#0B5ED7"),
            ("zap", "SaaS Development", "Multi-tenant SaaS platforms and subscription products designed to scale with your business.", "#38BDF8", "#0EA5E9"),
            ("briefcase", "CRM & Enterprise Solutions", "CRM, ERP, HRMS, LMS, POS, and internal systems that keep growing organizations running smoothly.", "#1FA2FF", "#0369A1"),
            ("layers", "Product Design", "End-to-end product strategy and experience design, from concept through to a validated product.", "#60A5FA", "#1FA2FF"),
            ("link-2", "API Development & Integrations", "Third-party integrations, payment gateways, automation, and custom APIs that connect your systems.", "#0B5ED7", "#38BDF8"),
            ("life-buoy", "Maintenance & Support", "Ongoing optimization, monitoring, updates, and technical support after your product goes live.", "#2563EB", "#60A5FA"),
        ]
        for i, (icon, title, desc, cf, ct) in enumerate(services):
            db.session.add(Service(icon=icon, title=title, description=desc, color_from=cf, color_to=ct, order_index=i))

    if TeamMember.query.count() == 0:
        team = [
            ("Trushar Panchal", "Executive Director", "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&q=80", "Leads UXPLORES' vision and client partnerships, driving digital products that scale with real business impact."),
            ("Srishti Kakria", "Creative Director", "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&q=80", "Shapes every product's user experience, blending design thinking with a sharp eye for detail."),
        ]
        for i, (name, role, image, desc) in enumerate(team):
            db.session.add(TeamMember(name=name, role=role, image=image, description=desc, order_index=i))

    if Project.query.count() == 0:
        projects = [
            dict(title="FinTech Revolution", category="mobile",
                 description="A revolutionary mobile banking app that simplifies personal finance",
                 full_description="FinTech Revolution is a comprehensive mobile banking solution designed to make personal finance management intuitive and accessible. We created a seamless user experience that combines powerful features with a beautiful, modern interface.",
                 tags="Mobile App, FinTech, UI/UX",
                 image="https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&q=80",
                 stat1_label="User Growth", stat1_value="+150%", stat2_label="App Rating", stat2_value="4.8/5",
                 stat3_label="Active Users", stat3_value="50K+",
                 challenge="Creating a banking app that feels approachable while maintaining security and trust.",
                 solution="We implemented biometric authentication, real-time notifications, and an intuitive dashboard that gives users complete control over their finances.",
                 results="The app saw 150% user growth in the first 6 months and maintains a 4.8/5 rating.", featured=True),
            dict(title="AI Dashboard Pro", category="saas",
                 description="Next-gen analytics platform powered by artificial intelligence",
                 full_description="AI Dashboard Pro transforms complex data into actionable insights using advanced AI algorithms. The platform provides real-time analytics, predictive modeling, and customizable visualizations.",
                 tags="SaaS, AI, Analytics",
                 image="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80",
                 stat1_label="Uptime", stat1_value="99.9%", stat2_label="Data Points", stat2_value="10M+",
                 stat3_label="Enterprise Clients", stat3_value="200+",
                 challenge="Making complex AI-powered analytics accessible to non-technical users.",
                 solution="We designed an intuitive interface with drag-and-drop functionality and natural language queries.",
                 results="200+ enterprise clients adopted the platform with 99.9% uptime.", featured=True),
            dict(title="EcoMarket", category="web",
                 description="Sustainable e-commerce platform for eco-conscious consumers",
                 full_description="EcoMarket is an e-commerce platform dedicated to sustainable and eco-friendly products. We created a marketplace that makes it easy for consumers to make environmentally responsible choices.",
                 tags="E-commerce, Sustainability, Web",
                 image="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
                 stat1_label="Revenue", stat1_value="$2M+", stat2_label="Products", stat2_value="5K+",
                 stat3_label="Monthly Visitors", stat3_value="100K+",
                 challenge="Building trust in eco-friendly products and creating a seamless shopping experience.",
                 solution="We implemented detailed product sustainability scores, vendor verification, and a smooth checkout process.",
                 results="Generated over $2M in revenue with 100K+ monthly visitors.", featured=True),
            dict(title="Nexus Brand Identity", category="branding",
                 description="Complete brand transformation for a tech startup",
                 full_description="Nexus needed a bold new identity that would position them as leaders in the tech industry. We created a comprehensive brand system that reflects their innovative spirit.",
                 tags="Branding, Identity, Strategy",
                 image="https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?w=800&q=80",
                 stat1_label="Brand Recognition", stat1_value="+85%", stat2_label="Market Position", stat2_value="Top 10",
                 stat3_label="Assets Created", stat3_value="200+",
                 challenge="Differentiating Nexus in a crowded tech market.",
                 solution="We developed a unique visual language with bold colors, dynamic typography, and flexible brand assets.",
                 results="85% increase in brand recognition within 6 months.", featured=False),
            dict(title="MediCare Connect", category="mobile",
                 description="Telemedicine app connecting patients with healthcare providers",
                 full_description="MediCare Connect revolutionizes healthcare access by providing instant virtual consultations, prescription management, and health records in one secure app.",
                 tags="HealthTech, Mobile, UX",
                 image="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80",
                 stat1_label="Consultations", stat1_value="25K+", stat2_label="Response Time", stat2_value="< 5min",
                 stat3_label="Satisfaction", stat3_value="96%",
                 challenge="Ensuring HIPAA compliance while maintaining ease of use.",
                 solution="We implemented end-to-end encryption, secure video calls, and intuitive navigation.",
                 results="25K+ consultations completed with 96% patient satisfaction.", featured=False),
            dict(title="CloudSync Enterprise", category="saas",
                 description="Enterprise file management and collaboration platform",
                 full_description="CloudSync Enterprise provides businesses with secure, scalable cloud storage and real-time collaboration tools designed for modern teams.",
                 tags="SaaS, Enterprise, Collaboration",
                 image="https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80",
                 stat1_label="Storage", stat1_value="1PB+", stat2_label="Teams", stat2_value="500+",
                 stat3_label="File Security", stat3_value="256-bit",
                 challenge="Balancing security with seamless collaboration.",
                 solution="We created granular permission controls, real-time sync, and audit trails.",
                 results="500+ enterprise teams trust CloudSync with their data.", featured=False),
            dict(title="Gourmet Delivery", category="web",
                 description="Premium food delivery platform with real-time tracking",
                 full_description="Gourmet Delivery connects food lovers with the finest restaurants, offering real-time tracking, personalized recommendations, and seamless ordering.",
                 tags="Food Tech, Web App, Mobile",
                 image="https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80",
                 stat1_label="Orders", stat1_value="1M+", stat2_label="Restaurants", stat2_value="5K+",
                 stat3_label="Avg Delivery", stat3_value="30min",
                 challenge="Managing complex logistics while maintaining food quality.",
                 solution="We built an intelligent routing system with real-time updates and temperature monitoring.",
                 results="1M+ orders delivered with 30-minute average delivery time.", featured=False),
            dict(title="Vertex Fitness", category="mobile",
                 description="AI-powered personal training and fitness tracking app",
                 full_description="Vertex Fitness uses AI to create personalized workout plans, track progress, and provide real-time form corrections through your smartphone camera.",
                 tags="Fitness, AI, Mobile",
                 image="https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800&q=80",
                 stat1_label="Active Users", stat1_value="75K+", stat2_label="Workouts", stat2_value="500K+",
                 stat3_label="Retention", stat3_value="82%",
                 challenge="Making professional fitness coaching accessible to everyone.",
                 solution="We integrated computer vision for form analysis and created adaptive AI workout plans.",
                 results="75K+ active users with 82% monthly retention rate.", featured=False),
            dict(title="Quantum Labs", category="branding",
                 description="Scientific brand identity for quantum computing startup",
                 full_description="Quantum Labs needed a brand that conveyed cutting-edge technology while remaining approachable. We created a sophisticated identity system that bridges complexity and clarity.",
                 tags="Branding, Tech, Identity",
                 image="https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&q=80",
                 stat1_label="Investment Raised", stat1_value="$50M", stat2_label="Media Features", stat2_value="100+",
                 stat3_label="Brand Value", stat3_value="+300%",
                 challenge="Conveying cutting-edge technology while remaining approachable.",
                 solution="We created a sophisticated identity system with quantum-inspired visual elements.",
                 results="Raised $50M following rebrand, featured in 100+ media outlets.", featured=False),
        ]
        for i, p in enumerate(projects):
            db.session.add(Project(order_index=i, **p))

    if BlogPost.query.count() == 0:
        posts = [
            dict(title="The Future of UI/UX Design in 2026",
                 excerpt="Exploring emerging trends that will shape the future of digital design, from AI-powered interfaces to immersive 3D experiences.",
                 category="design", author="Alex Rivera", date_str="Jan 25, 2026", read_time="8 min read",
                 image="https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=800&q=80", featured=True),
            dict(title="Building Scalable Design Systems",
                 excerpt="A comprehensive guide to creating design systems that grow with your organization and maintain consistency across products.",
                 category="design", author="Sarah Chen", date_str="Jan 22, 2026", read_time="12 min read",
                 image="https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&q=80", featured=False),
            dict(title="Web Performance Optimization Techniques",
                 excerpt="Proven strategies to improve your website's loading speed and deliver exceptional user experiences.",
                 category="development", author="Marcus Johnson", date_str="Jan 20, 2026", read_time="10 min read",
                 image="https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&q=80", featured=False),
            dict(title="Crafting Compelling Brand Stories",
                 excerpt="Learn how to tell your brand's story in a way that resonates with your audience and builds lasting connections.",
                 category="strategy", author="Emma Wilson", date_str="Jan 18, 2026", read_time="7 min read",
                 image="https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&q=80", featured=False),
            dict(title="Micro-interactions: Small Details, Big Impact",
                 excerpt="Discover how subtle animations and interactions can dramatically improve user engagement and satisfaction.",
                 category="design", author="Alex Rivera", date_str="Jan 15, 2026", read_time="6 min read",
                 image="https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80", featured=False),
            dict(title="The Rise of AI in Design Tools",
                 excerpt="How artificial intelligence is transforming the design workflow and what it means for creative professionals.",
                 category="trends", author="Sarah Chen", date_str="Jan 12, 2026", read_time="9 min read",
                 image="https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=800&q=80", featured=False),
            dict(title="Accessibility in Modern Web Design",
                 excerpt="Best practices for creating inclusive digital experiences that work for everyone, regardless of ability.",
                 category="development", author="Marcus Johnson", date_str="Jan 10, 2026", read_time="11 min read",
                 image="https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&q=80", featured=False),
            dict(title="Color Psychology in Digital Design",
                 excerpt="Understanding how colors influence user behavior and emotions in digital interfaces.",
                 category="design", author="Emma Wilson", date_str="Jan 8, 2026", read_time="8 min read",
                 image="https://images.unsplash.com/photo-1525909002-1b05e0c869d8?w=800&q=80", featured=False),
            dict(title="Building a Strong Digital Brand Presence",
                 excerpt="Strategies for establishing and maintaining a cohesive brand identity across all digital touchpoints.",
                 category="strategy", author="Alex Rivera", date_str="Jan 5, 2026", read_time="10 min read",
                 image="https://images.unsplash.com/photo-1432888622747-4eb9a8efeb07?w=800&q=80", featured=False),
        ]
        for i, p in enumerate(posts):
            db.session.add(BlogPost(order_index=i, **p))

    db.session.commit()


with app.app_context():
    db.create_all()
    seed_if_empty()


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
