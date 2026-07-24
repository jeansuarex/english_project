# Shakespeare - English Learning Platform

## What Is Shakespeare?

Shakespeare is a **subscription-based English learning platform** that combines self-study practice tools with direct access to human teachers. It targets Spanish-speaking students (and other non-native speakers) who want to improve their English for work, travel, exams, or personal growth.

The platform operates on a **freemium model**: users get 3 free days to try everything, then choose between a $10/month plan or a $70/year plan. Teachers earn money through per-session payments, creating a two-sided marketplace.

---

## Who Will Use It?

- **Self-study learners** — People who prefer learning at their own pace but want structure and accountability
- **Exam candidates** — Students preparing for IELTS, TOEFL, Cambridge, or other English certifications
- **Professionals** — Business English learners who need vocabulary for meetings, emails, and presentations
- **Conversation seekers** — Learners who have grammar knowledge but lack speaking practice
- **Teachers** — Qualified English instructors who want to monetize their expertise on their own schedule

---

## How It Attracts People

### 1. Zero-friction onboarding
New users get **3 free days** with full access. No credit card required. They can try every feature before deciding. This removes the biggest barrier to entry — purchase anxiety.

### 2. Social proof through public profiles
When a user builds a streak, earns badges, and reaches a high CEFR level, they can **share their profile link**. This turns learners into marketers. Every shared profile is a free ad that shows real, tangible progress.

### 3. Gamification hooks the brain
The heatmap creates **streak addiction** — users don't want to break their chain. Badges trigger achievement hunting. Practice modules feel like games, not homework. This makes daily login automatic.

### 4. AI as an always-available tutor
The English Output feature gives instant feedback on writing. Users don't have to wait for office hours or schedule a class. It's **24/7 availability** that no human teacher can match.

### 5. Human touch differentiates from competitors
Unlike apps like Duolingo or Busuu, Shakespeare connects learners directly to **real, vetted teachers** for conversation practice. This bridges the gap between app-based learning and real communication — a major pain point that competitors miss.

### 6. Word-of-mouth from teachers
Teachers have a financial incentive to recommend Shakespeare to their own students. When a teacher refers a student who subscribes, it validates the platform's credibility in a way that ads never could.

---

## How It Generates Money

### Revenue Stream 1: Subscription Plans

| Plan | Price | Value |
|------|-------|-------|
| Free Trial | $0 | 3 days full access |
| Monthly | $10/month | $0.33/day |
| Annual | $70/year | $0.19/day — save $50 |

Subscriptions are the **primary revenue source**. Stripe handles all payments securely. The annual plan's discount creates a strong upsell incentive once users are engaged.

### Revenue Stream 2: Teacher Session Payments

Teachers set their own availability. Students book 1-on-1 conversation sessions at a price per session (typically $20-$50). Shakespeare takes a **platform fee per transaction**.

- Teacher publishes their schedule
- Student selects a slot and pays via Stripe checkout
- Session happens on the platform
- Teacher gets paid; Shakespeare keeps a percentage

This creates **recurring revenue from both sides** — subscribers pay for access, and teachers pay a transaction fee.

### Revenue Stream 3: IELTS Exam Modules

Included in paid plans. IELTS candidates are **highly motivated and willing to pay** for structured exam practice. Bundling these modules with subscriptions increases perceived value and justifies the price.

### Revenue Stream 4: Scalability Without Cost Scaling

Once the platform is built, serving additional users costs almost nothing — the backend runs on Bun (extremely fast), SQLite is embedded, and Docker containers scale horizontally. This means **margins improve dramatically as the user base grows**.

---

## Why We Built Shakespeare

Shakespeare is an immersive English learning platform designed for students who want to master the language through interactive, game-like practice sessions. Unlike traditional learning methods that feel dry and monotonous, Shakespeare transforms vocabulary building, listening skills, reading comprehension, and grammar practice into engaging activities that users actually enjoy.

The platform addresses a critical pain point: **English learners struggle to find a single, comprehensive tool that combines structured practice with real progress tracking, gamification elements, and direct access to teachers** — all in one place.

---

## Tech Stack

### Frontend
- **React 18** + **TypeScript** — Robust, type-safe UI
- **Vite** — Lightning-fast development and builds
- **Clerk Auth** — Secure authentication with SSO support
- **react-pdf** + **pdfjs-dist** — In-browser PDF viewing and reading practice
- **Lucide React** — Beautiful, consistent iconography
- **React Router** — Client-side routing

### Backend
- **Hono** — Lightweight, ultrafast web framework
- **Bun** — All-in-one JavaScript runtime (faster than Node.js)
- **Clerk Auth** — Server-side auth verification
- **SQLite** — Embedded database for simplicity and speed
- **Zod** — Runtime type validation
- **Resend** — Transactional emails
- **Stripe** — Payments and subscription management

### Infrastructure
- **Docker + Docker Compose** — Containerized deployment
- **Nginx** — Web server and reverse proxy

---

## Cool Features That Drive Purchases

### 1. Gamified Practice Modules

**Reading** — Upload any PDF and read directly in the browser. Click on any word to instantly save it to your vocabulary. No more switching between apps or manually writing words down.

**Listening** — Words are spoken aloud with natural pronunciation. You have 10 seconds to type the exact spelling before time runs out. Builds both comprehension and spelling skills simultaneously.

**Definitions** — Multiple-choice quizzes that match words to their definitions. Adapts to your level and tracks which words you've mastered.

**Transformations** — Practice grammar by transforming sentences between tenses (present → past → future → conditional). Essential for exam preparation.

**Phrasal Verbs** — A notoriously difficult area for English learners. Type the correct phrasal verb based on its definition, building mastery one phrase at a time.

### 2. GitHub-Style Activity Heatmap

Visualize your learning journey with a year-long activity grid. See exactly which days you studied, how long you practiced, and maintain streaks. This creates **accountability and motivates daily usage** — users don't want to break their streak.

### 3. Badge & Milestone System

Earn achievements in bronze, silver, and gold tiers as you hit milestones:
- Words learned targets
- Practice sessions completed
- Streak achievements
- Level progression (CEFR: A1 → C2)

Locked badges show exactly how much more effort is needed to unlock them, creating **clear goals and anticipation**.

### 4. AI-Powered English Output

Write freely in English and receive AI feedback on your level (A1-C2 according to CEFR framework). This feature alone is a **major selling point** — users get personalized evaluation without needing a teacher present.

### 5. Book Classes with Real Teachers

Integrated teacher marketplace with:
- Browse teacher profiles with photos, specialties, and descriptions
- View real-time availability calendar
- Book 1-on-1 conversation sessions
- Stripe-powered checkout for session payments

This transforms Shakespeare from a self-study tool into a **complete learning ecosystem**.

### 6. Public Profile & Social Sharing

Share your profile link to showcase your progress, badges, and level. Great for LinkedIn, resumes, or impressing friends. This **creates organic marketing** as users show off their achievements.

### 7. Light/Dark Theme

Professional, well-designed theming that users can toggle based on preference or time of day. The UI uses carefully crafted CSS variables for a **polished, premium feel**.

### 8. Flexible Subscription Model

- **3 Free Days** for new users — zero friction onboarding
- **30 Days for $10** — low commitment trial
- **365 Days for $70** — annual pass with best value

The free trial eliminates purchase anxiety. The annual plan at $0.19/day is an easy upsell once users are hooked.

---

## Why Users Buy (And Stay)

1. **All-in-one solution** — No need to juggle Duolingo, a vocabulary app, a grammar site, and a tutor. Everything is here.

2. **Visible progress** — The heatmap and badge system make growth tangible. Users see their improvement daily.

3. **AI feedback** — Instant, always-available feedback on writing without waiting for a teacher.

4. **Human connection** — Direct access to qualified teachers for conversation practice bridges the gap between self-study and real communication.

5. **Exam preparation** — Built-in IELTS exam modules target serious learners willing to pay for structured preparation.

6. **Premium feel** — The polished UI, smooth animations, and thoughtful UX justify the price point.

---

*Shakespeare: Making English learning addictive, one session at a time.*
