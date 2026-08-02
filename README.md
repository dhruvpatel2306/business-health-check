# Business Health Check — AI-Powered Financial Dashboard

A small business financial health dashboard that combines real calculation logic with live AI analysis — a lightweight proof-of-concept of an "AI-CFO" tool.

## What it does
Business owners enter monthly revenue, categorized expenses, receivables, and cash balance. The app calculates real financial health metrics, tracks trends across months, and layers in AI-powered insights — diagnostics, a conversational AI-CFO, and auto-generated action plans — all grounded in the owner's actual numbers.

## Features
- **Core financial metrics**: profit margin, burn rate, cash runway, health score (0-100)
- **Multi-month tracking** with local persistence (no login/database needed)
- **Trend chart** — revenue vs expenses over time
- **Expense breakdown** — categorized pie chart (rent, salaries, marketing, other)
- **Industry benchmarking** — compares your margin against typical ranges by business type
- **Reverse goal calculator** — "I want 6 months of runway" → tells you exactly what to change
- **AI Diagnostic** — live AI analysis of your numbers (Claude/GPT via Puter.js, no API key needed)
- **Ask the AI-CFO** — conversational follow-up chat, grounded in your real data
- **AI-generated action checklist** — specific next steps with progress tracking across months
- **What-if simulator** — live sliders to test revenue/expense scenarios instantly
- **Voice-logged expenses** — speak entries directly using the browser's Web Speech API
- **PDF export** — download a full report of any month's data and AI insights
- **Risk flag indicators** — at-a-glance color coding on key metrics

## Tech stack
- HTML, CSS, JavaScript — no frameworks, no backend
- [Puter.js](https://js.puter.com) — free, key-less AI model access
- [Chart.js](https://www.chartjs.org/) — data visualization
- [jsPDF](https://github.com/parallax/jsPDF) — PDF generation
- Browser Web Speech API — voice input
- Browser localStorage — data persistence

## Live demo
[Try it here](https://business-health-checker-phi.vercel.app/)

## Why this project
Built as a small, real-world proof-of-concept exploring what an AI-powered financial advisor tool could look like for small businesses — inspired by the "AI-CFO" concept.
