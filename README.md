# UXPLORES — Flask Rebuild

A pixel-faithful rebuild of the UXPLORES design studio website (originally React/Vite),
converted to **HTML + CSS + vanilla JS + Python (Flask)**, with a full password-protected
**admin panel** for managing site content.

## What's inside

- **Public site** — Home, Services, Portfolio, About, Blog, Contact — UXPLORES' real content,
  logo, and copy, with a blue/white (light) and blue/black (dark) theme toggle (top right of
  the header), plus the original animations (custom cursor, floating gradient orbs,
  scroll-reveal animations, animated counters, logo marquee, portfolio filters + case-study
  modal, blog filters, FAQ accordion, contact form).
- **Admin panel** at `/admin` — password protected, lets you add/edit/delete:
  - Projects (Portfolio page)
  - Services (Home + Services pages)
  - Blog Posts
  - Team Members (About page)
  - View/manage Contact form submissions
  - Edit site-wide stats, contact info, and the admin password
- **Backend** — Flask + SQLAlchemy + SQLite. All content is stored in the database and
  editable from the admin panel — no code changes needed for day-to-day content updates.

## Requirements

- Python 3.9+

## Setup

1. Open a terminal in the `uxplore-flask` folder.
2. Create a Python virtual environment:

   - macOS / Linux:
     ```bash
     python3 -m venv venv
     ```
   - Windows:
     ```powershell
     python -m venv venv
     ```

3. Activate the virtual environment:

   - macOS / Linux:
     ```bash
     source venv/bin/activate
     ```
   - Windows PowerShell:
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
   - Windows Command Prompt:
     ```cmd
     venv\Scripts\activate.bat
     ```

4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

5. Start the app:
   ```bash
   python app.py
   ```

Then open **http://localhost:5000** in your browser.

The database (`instance/uxplore.db`) and all starter content (services, sample projects,
sample blog posts, team members, site settings) are created automatically the first time
you run the app.

## Admin Panel

- URL: **http://localhost:5000/admin**
- Default password: **`uxplore123`**

You can change the password any time from **Admin → Settings → Change Admin Password**.
It's stored as a salted hash in the database, never in plain text.

### What you can manage

| Section  | Controls what shows on |
|----------|------------------------|
| Projects | Portfolio page grid + case-study modal, and the 3 featured projects on Home |
| Services | Home page (first 6) and full Services page |
| Blog Posts | Blog page (mark one "featured" to pin it at the top) |
| Team | About page team grid |
| Messages | Everything submitted through the Contact page form |
| Settings | Home/About stat numbers, contact email/phone/address, site name, and your admin password |

Deleting or editing anything in the admin panel updates the live site immediately.

## Project structure

```
uxplore-flask/
├── app.py                  # Flask app: models, routes, admin API, seed data
├── requirements.txt
├── instance/
│   └── uxplore.db           # created automatically on first run
├── static/
│   ├── css/style.css        # public site styles (design tokens, animations, components)
│   ├── css/admin.css        # admin dashboard styles
│   ├── js/main.js           # public site interactions (cursor, reveal, counters, filters, modal, form)
│   ├── js/admin.js          # admin dashboard (tabs, CRUD, modals, settings)
│   └── images/               # hero background etc.
└── templates/
    ├── base.html             # shared header/footer/cursor shell
    ├── _icons.html           # inline icon macro (no external icon CDN dependency)
    ├── index.html, about.html, services.html, portfolio.html, blog.html, contact.html, 404.html
    └── admin/
        ├── login.html
        └── dashboard.html
```

## Notes for going to production

- Change `SECRET_KEY` in `app.py` (or set the `SECRET_KEY` environment variable) to a
  long random value before deploying publicly.
- Change the default admin password immediately after your first login.
- Run behind a real WSGI server (gunicorn/waitress) instead of `python app.py`, and
  behind HTTPS — the Flask dev server shown above is for local use only.
- Project/blog/team images currently reference external URLs (Unsplash) for the seeded
  demo content — swap these for your own hosted images from the admin panel whenever ready.

## Next steps / things we can add on request

- Image upload (instead of pasting URLs) for projects, blog posts, and team photos
- Full blog post detail pages (currently blog cards show excerpts only, matching the original)
- Email notifications when a new contact form message arrives
- Multiple admin accounts / roles
