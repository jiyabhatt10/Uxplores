#!/usr/bin/env python
"""
Deployment Configuration Validator
Checks if all deployment files are correctly configured
"""

import os
import sys

def check_file_exists(filepath, description):
    """Check if a file exists"""
    exists = os.path.isfile(filepath)
    status = "✅" if exists else "❌"
    print(f"{status} {description}: {filepath}")
    return exists

def check_file_content(filepath, content_check, description):
    """Check if file contains expected content"""
    try:
        with open(filepath, 'r') as f:
            content = f.read()
            contains = content_check in content
            status = "✅" if contains else "❌"
            print(f"{status} {description}")
            return contains
    except Exception as e:
        print(f"❌ Error checking {description}: {e}")
        return False

def main():
    print("=" * 60)
    print("🔍 UXplore Flask - Deployment Configuration Validator")
    print("=" * 60)
    print()
    
    checks_passed = 0
    checks_total = 0
    
    # Check deployment files
    print("📦 Deployment Files:")
    files_to_check = [
        ("Procfile", "Procfile"),
        ("runtime.txt", "Python Runtime"),
        ("requirements.txt", "Requirements"),
        ("render.yaml", "Render Config"),
        ("railway.toml", "Railway Config"),
        ("Dockerfile", "Docker Support"),
        ("docker-compose.yml", "Docker Compose"),
        (".dockerignore", "Docker Ignore"),
        ("app.py", "Main Application"),
        ("instance/", "Instance Directory"),
    ]
    
    for filepath, desc in files_to_check:
        if os.path.isdir(filepath):
            exists = os.path.isdir(filepath)
            status = "✅" if exists else "❌"
            print(f"{status} {desc}: {filepath}")
            checks_total += 1
            if exists:
                checks_passed += 1
        else:
            checks_total += 1
            if check_file_exists(filepath, desc):
                checks_passed += 1
    
    print()
    
    # Check file contents
    print("📝 Configuration Content:")
    
    checks = [
        ("Procfile", "gunicorn app:app", "Procfile contains gunicorn entry"),
        ("requirements.txt", "gunicorn", "Requirements has gunicorn"),
        ("requirements.txt", "psycopg2", "Requirements has psycopg2"),
        ("runtime.txt", "3.11", "Runtime specifies Python 3.11"),
        ("app.py", "DATABASE_URL", "App supports DATABASE_URL env var"),
    ]
    
    for filepath, content, desc in checks:
        checks_total += 1
        if check_file_content(filepath, content, desc):
            checks_passed += 1
    
    print()
    
    # Check environment example
    print("🔐 Environment Configuration:")
    env_file = ".env.example"
    checks_total += 1
    if check_file_exists(env_file, "Environment Template"):
        checks_passed += 1
        env_vars = [
            "SECRET_KEY",
            "DATABASE_URL",
            "RESEND_API_KEY",
            "SITE_URL",
        ]
        for var in env_vars:
            checks_total += 1
            with open(env_file, 'r') as f:
                content = f.read()
                if var in content:
                    print(f"✅ Environment template includes {var}")
                    checks_passed += 1
                else:
                    print(f"❌ Environment template missing {var}")
    
    print()
    print("=" * 60)
    print(f"✅ Validation Complete: {checks_passed}/{checks_total} checks passed")
    print("=" * 60)
    print()
    
    if checks_passed == checks_total:
        print("🎉 All systems ready for deployment!")
        print()
        print("📖 Next Steps:")
        print("1. Read QUICKSTART.md for deployment instructions")
        print("2. Push to GitHub: git push origin main")
        print("3. Choose Render or Railway")
        print("4. Follow deployment guide")
        return 0
    else:
        print(f"⚠️  {checks_total - checks_passed} checks failed!")
        print()
        print("❌ Issues to fix:")
        print("- Ensure all files are present")
        print("- Check file permissions")
        print("- Verify file contents are correct")
        return 1

if __name__ == "__main__":
    sys.exit(main())
