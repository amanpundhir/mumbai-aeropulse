#!/usr/bin/env python3
"""
scripts/verify_submission_package.py
Comprehensive verification test suite for Milestone 5:
Configuration & Creative Track Competition Package.

Verifies:
1. Root `.env.example` and `dashboard/.env.example` exist, are non-empty, and document:
   - VITE_GOOGLE_MAPS_API_KEY (with GCP console and API links)
   - VITE_GEMINI_API_KEY (with Google AI Studio link)
   - VITE_GEMINI_MODEL=gemini-2.5-flash
   - Zero-dependency Demo Mode guidance (SVG GIS map + synthetic AI simulation)
2. `creative_submission_package.md` exists and contains:
   - Exact 10 Google Form fields (Field 1 to Field 10)
   - Official Form URL (https://forms.gle/uLpzqYfJm9AjTvjT9) & deadline (13 Nov 2026)
   - Project title: "Mumbai AeroPulse: Spatio-Temporal AI Airshed Intelligence & Civic Action Platform"
   - Field 3 elevator pitch word count strictly within 150-250 words
   - All 4 Mumbai stations (Borivali East, Byculla, Malad West, Shivaji Nagar)
   - Coastal airshed dynamics (land-sea breeze, nocturnal thermal inversion, PBLH)
   - Technical methodology (physics-guided coupling, dual models, synthetic engine)
   - Google ecosystem integration (Google Maps Platform, Gemini AI, Colab/Cloud)
   - Dual-perspective civic decision support (BMC Municipal Plan vs Citizen Health Advisory)
3. `README.md` exists and contains:
   - Architecture diagram
   - Quickstart commands (npm run dev, npm run build, npm run preview)
   - Zero-dependency demo mode vs live mode instructions
   - Feature breakdowns, Google ecosystem integration, and verification commands.
"""

import sys
import re
from pathlib import Path

# Paths
REPO_ROOT = Path(__file__).resolve().parent.parent
ROOT_ENV = REPO_ROOT / ".env.example"
DASHBOARD_ENV = REPO_ROOT / "dashboard" / ".env.example"
SUBMISSION_PKG = REPO_ROOT / "creative_submission_package.md"
README_MD = REPO_ROOT / "README.md"

class TestReport:
    def __init__(self):
        self.tests_run = 0
        self.tests_passed = 0
        self.failures = []

    def check(self, condition: bool, test_name: str, detail: str = ""):
        self.tests_run += 1
        if condition:
            self.tests_passed += 1
            print(f"  [PASS] {test_name}")
        else:
            self.failures.append((test_name, detail))
            print(f"  [FAIL] {test_name}: {detail}")

    def summarize(self) -> bool:
        print("\n" + "=" * 70)
        print(f"VERIFICATION SUMMARY: {self.tests_passed}/{self.tests_run} checks passed")
        if self.failures:
            print("\nFAILURES:")
            for name, detail in self.failures:
                print(f"  - {name}: {detail}")
            print("=" * 70 + "\n")
            return False
        else:
            print("ALL SUBMISSION PACKAGE INTEGRITY CHECKS PASSED SUCCESSFULLY.")
            print("=" * 70 + "\n")
            return True


def verify_env_file(env_path: Path, label: str, report: TestReport):
    print(f"\n--- Verifying {label} ({env_path.name}) ---")
    report.check(env_path.exists(), f"{label} exists", f"File not found at {env_path}")
    if not env_path.exists():
        return

    content = env_path.read_text(encoding="utf-8")
    report.check(len(content.strip()) > 100, f"{label} is non-empty", f"Length: {len(content)}")
    
    # Required keys
    report.check("VITE_GOOGLE_MAPS_API_KEY" in content, f"{label} has VITE_GOOGLE_MAPS_API_KEY")
    report.check("VITE_GEMINI_API_KEY" in content, f"{label} has VITE_GEMINI_API_KEY")
    report.check("VITE_GEMINI_MODEL" in content, f"{label} has VITE_GEMINI_MODEL")
    report.check("gemini-2.5-flash" in content, f"{label} sets default gemini-2.5-flash")

    # Documentation links & demo mode
    report.check("console.cloud.google.com" in content, f"{label} links to Google Cloud Console")
    report.check("aistudio.google.com" in content, f"{label} links to Google AI Studio")
    report.check(
        "DEMO MODE" in content or "Demo Mode" in content or "zero-dependency" in content.lower(),
        f"{label} documents Demo Mode fallback"
    )


def verify_creative_submission_package(pkg_path: Path, report: TestReport):
    print(f"\n--- Verifying Creative Track Submission Package ({pkg_path.name}) ---")
    report.check(pkg_path.exists(), "Submission package exists", f"File not found at {pkg_path}")
    if not pkg_path.exists():
        return

    content = pkg_path.read_text(encoding="utf-8")
    report.check(len(content.strip()) > 1000, "Submission package is substantial", f"Length: {len(content)}")

    # Check 10 Google Form fields
    for field_num in range(1, 11):
        field_header = f"Field {field_num}"
        has_field = bool(re.search(rf"Field\s+{field_num}\s*:", content, re.IGNORECASE))
        report.check(has_field, f"Submission package contains {field_header}")

    # Field 1: Project Title
    has_title = "Mumbai AeroPulse: Spatio-Temporal AI Airshed Intelligence & Civic Action Platform" in content
    report.check(has_title, "Field 1 has exact project title")

    # Field 2: Track & Eligibility
    report.check("Most Creative Submission Track" in content, "Field 2 confirms Creative Track")
    report.check("Maharashtra" in content, "Field 2 confirms Maharashtra eligibility compliance")

    # Field 3: Executive Summary Word Count (150-250 words)
    field3_match = re.search(r"###\s*Field\s*3:.*?\n(.*?)(?=\n---|\n###|\Z)", content, re.DOTALL)
    if field3_match:
        text = field3_match.group(1).strip()
        word_count = len(text.split())
        is_in_range = 150 <= word_count <= 250
        report.check(
            is_in_range,
            f"Field 3 word count within 150-250 words (actual: {word_count} words)",
            f"Word count was {word_count}"
        )
    else:
        report.check(False, "Field 3 executive summary extractable", "Could not parse Field 3 section")

    # Field 4: Stations & Meteorology
    stations = ["Borivali East", "Byculla", "Malad West", "Shivaji Nagar"]
    for st in stations:
        report.check(st in content, f"Mentions CAAQMS Station '{st}'")
    
    report.check("land-sea breeze" in content.lower(), "Mentions diurnal land-sea breeze oscillation")
    report.check("thermal inversion" in content.lower(), "Mentions nocturnal thermal inversion")
    report.check("pblh" in content.lower(), "Mentions Planetary Boundary Layer Height (PBLH)")
    report.check("ventilation index" in content.lower(), "Mentions atmospheric Ventilation Index")

    # Field 5 & 6: Technical & Google Ecosystem
    report.check("Google Maps Platform" in content, "Mentions Google Maps Platform")
    report.check("Gemini" in content, "Mentions Google Gemini AI")
    report.check("CatBoost" in content and "LightGBM" in content, "Mentions CatBoost and LightGBM models")
    report.check("synthetic" in content.lower(), "Mentions synthetic simulation fallback")
    report.check("Colab" in content or "Google Cloud" in content, "Mentions Google Colab / Cloud")

    # Field 7: Dual-Perspective Civic Decision Support
    report.check("Brihanmumbai Municipal Corporation" in content or "BMC" in content, "Mentions BMC Municipal Action")
    report.check("Citizen" in content and "Health Advisory" in content, "Mentions Citizen Health Advisory")
    report.check("mist cannon" in content.lower(), "Mentions mist cannon equipment deployment")

    # Form URL and deadline
    report.check("forms.gle/uLpzqYfJm9AjTvjT9" in content, "Contains official Google Form URL")
    report.check("13 November 2026" in content, "Contains official submission deadline")


def verify_readme(readme_path: Path, report: TestReport):
    print(f"\n--- Verifying Project README ({readme_path.name}) ---")
    report.check(readme_path.exists(), "README.md exists", f"File not found at {readme_path}")
    if not readme_path.exists():
        return

    content = readme_path.read_text(encoding="utf-8")
    report.check(len(content.strip()) > 1000, "README.md is comprehensive", f"Length: {len(content)}")

    # Quickstart commands
    report.check("npm run dev" in content, "README documents 'npm run dev'")
    report.check("npm run build" in content, "README documents 'npm run build'")
    report.check("npm run preview" in content, "README documents 'npm run preview'")

    # Architecture & Features
    report.check("ARCHITECTURE" in content.upper(), "README contains system architecture")
    report.check("Google Maps" in content, "README documents Google Maps Platform integration")
    report.check("Gemini" in content, "README documents Google Gemini AI integration")
    report.check("Demo Mode" in content or "demo mode" in content.lower(), "README documents Zero-Dependency Demo Mode")
    report.check("verify_submission_package.py" in content, "README references submission verification script")


def main():
    print("=" * 70)
    print("MUMBAI AEROPULSE — SUBMISSION PACKAGE VERIFICATION")
    print("Milestone 5: Configuration & Creative Track Competition Package")
    print("=" * 70)

    report = TestReport()

    # 1. Environment Configurations
    verify_env_file(ROOT_ENV, "Root .env.example", report)
    verify_env_file(DASHBOARD_ENV, "Dashboard .env.example", report)

    # 2. Creative Submission Package
    verify_creative_submission_package(SUBMISSION_PKG, report)

    # 3. Project Documentation
    verify_readme(README_MD, report)

    success = report.summarize()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
