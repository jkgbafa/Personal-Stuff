# QICKN LABS - AI Agency Roadmap & Execution Plan

**Owner:** You
**Date Created:** March 8, 2026
**Goal:** $10,000/month recurring revenue
**Timeline:** Sprint start this week, scale over 90 days

---

## TABLE OF CONTENTS

1. [Financial Situation & Tax Plan](#1-financial-situation--tax-plan)
2. [Business Overview - QICKN LABS](#2-business-overview---qickn-labs)
3. [Revenue Stream #1: AI Receptionist / Virtual Assistant Service](#3-revenue-stream-1-ai-receptionist--virtual-assistant-service)
4. [Revenue Stream #2: AI Consulting & Audits](#4-revenue-stream-2-ai-consulting--audits)
5. [Lead Generation & Outreach Strategy](#5-lead-generation--outreach-strategy)
6. [Technical Stack & Hosting](#6-technical-stack--hosting)
7. [Week 1 Sprint Plan (Get Your First Client)](#7-week-1-sprint-plan-get-your-first-client)
8. [Automation Playbook](#8-automation-playbook)
9. [Avoiding Scope Creep](#9-avoiding-scope-creep)
10. [Scaling Strategy](#10-scaling-strategy)
11. [Go High Level Domain Issue - Fix](#11-go-high-level-domain-issue---fix)
12. [Resources, Repos, Tools & Links](#12-resources-repos-tools--links)
13. [Weekly Schedule Template](#13-weekly-schedule-template)
14. [Pricing & Packages](#14-pricing--packages)
15. [Path to $10K/Month](#15-path-to-10kmonth)

---

## 1. FINANCIAL SITUATION & TAX PLAN

### Current Situation
- **Owed to IRS:** ~$5,000 (prior year taxes)
- **Income:** Employed (receiving regular paychecks with tax withholding)

### Action Plan
1. **Set up an IRS Payment Plan immediately**
   - Go to https://www.irs.gov/payments/online-payment-agreement-application
   - You can set up a Short-Term Payment Plan (180 days, no setup fee for online) if you can pay within 6 months
   - Or a Long-Term Installment Agreement ($31 setup fee online) for monthly payments
   - Minimum monthly payment is roughly: balance / 72 months, but you want to pay it faster
2. **Monthly allocation strategy:**
   - Your current job withholds taxes for THIS year - that's separate, don't touch it
   - From each paycheck, set aside an additional fixed amount ($500-$800/month) specifically for the IRS debt
   - Set up auto-pay through the IRS Direct Pay portal so you don't miss payments
3. **Important:** Do NOT use this year's withholdings to pay last year's debt. That will just create a new debt for this year. Keep them separate.
4. **Once QICKN LABS revenue starts:** Allocate 30% of all agency income to taxes (self-employment tax is ~15.3% + income tax)
5. **File quarterly estimated taxes** once agency income starts (Form 1040-ES) - due dates: April 15, June 15, September 15, January 15

### Quick Wins
- Call IRS at 1-800-829-1040 or go online to set up the plan THIS WEEK
- Open a separate bank account or sub-account just for taxes
- Use a free tool like Wave (waveapps.com) to track agency income/expenses

---

## 2. BUSINESS OVERVIEW - QICKN LABS

### What QICKN LABS Does
An AI automation agency that helps businesses replace or augment manual tasks (receptionists, virtual assistants, lead follow-up, appointment scheduling) with AI-powered solutions.

### Two Core Service Lines
1. **AI Receptionist/VA Service** - Done-for-you AI phone agents + automation systems
2. **AI Consulting & Audits** - Paid audit + 90-day implementation plan + ongoing retainer

### Target Revenue Breakdown ($10K/month)
| Source | Clients Needed | Price Point | Monthly Revenue |
|--------|---------------|-------------|-----------------|
| AI Receptionist packages | 5 clients | $1,000-$1,500/mo | $5,000-$7,500 |
| AI Audit + Implementation | 1-2 clients | $2,500-$5,000 | $2,500-$5,000 |
| **Total** | **6-7 clients** | | **$7,500-$12,500** |

---

## 3. REVENUE STREAM #1: AI RECEPTIONIST / VIRTUAL ASSISTANT SERVICE

### What You're Building
An AI phone agent that answers calls, books appointments, answers FAQs, routes calls, and integrates with the client's existing tools (Google Calendar, CRM, etc.)

### Core Platform: Bland AI
- **Website:** https://www.bland.ai
- **What it does:** AI phone agents for inbound and outbound calls
- **API:** Yes - full REST API to create agents, make calls, manage phone numbers programmatically
- **Key features:**
  - Inbound call handling (receptionist)
  - Outbound calls (follow-ups, reminders, lead qualification)
  - Custom voices and personas
  - Call transfer to humans
  - Webhook integrations (trigger actions from calls)
  - Knowledge base upload (train on business-specific info)
- **Pricing:** Pay-per-minute model. Check https://www.bland.ai/pricing for current rates
- **API Docs:** https://docs.bland.ai

### Alternatives to Bland AI (Compare Before Committing)
| Platform | Strengths | API | Pricing Model |
|----------|-----------|-----|---------------|
| **Bland AI** | Simple API, good for agencies | Yes | Per-minute |
| **Vapi** (vapi.ai) | Developer-focused, very flexible | Yes | Per-minute |
| **Retell AI** (retellai.com) | Great voice quality, fast | Yes | Per-minute |
| **Synthflow** (synthflow.ai) | No-code, white-label ready | Yes | Monthly plans |
| **Air AI** (air.ai) | Fully autonomous agents | Limited | Enterprise |

**Recommendation:** Start with **Vapi** or **Bland AI**. Both have great APIs. Vapi is more developer-friendly and may give you more control when building with Claude Code.

### How to Build It (Technical Workflow)
1. **Client onboarding call** - Gather their business info, FAQs, hours, services
2. **Configure the AI agent** via Bland/Vapi API:
   - Upload knowledge base (business info, FAQs, pricing)
   - Set up call flows (greeting, routing, booking)
   - Configure voice and persona
3. **Connect integrations:**
   - Google Calendar API for appointment booking
   - Twilio or the platform's built-in phone numbers
   - Webhook to their CRM (or Google Sheets if they're simple)
   - Email notifications via SendGrid or similar
4. **Build a simple dashboard** (optional but impressive):
   - Call logs, transcripts, analytics
   - Next.js + Tailwind app hosted on Vercel
   - Pull data from Bland/Vapi API
5. **Test with the client** - Run test calls, refine the agent
6. **Go live** - Port their number or set up forwarding

### What You Can Build with Claude Code
- The entire backend: API integrations, webhooks, automation scripts
- Client dashboards (Next.js/React)
- Onboarding forms that auto-configure agents
- CRM integrations
- Reporting/analytics scripts

---

## 4. REVENUE STREAM #2: AI CONSULTING & AUDITS

### What an AI Audit Looks Like

#### Phase 1: Discovery Call (30-60 min) - FREE or $97
Ask these questions:
1. What does your business do? Who are your customers?
2. How many employees do you have? What are their roles?
3. Walk me through a typical customer journey (from first contact to payment)
4. What are your biggest bottlenecks or pain points?
5. How do you currently handle: phone calls, emails, scheduling, follow-ups, data entry?
6. What software/tools do you currently use? (CRM, email, scheduling, etc.)
7. How much time per week does your team spend on repetitive tasks?
8. What's your current monthly cost for VAs, receptionists, or admin staff?
9. Have you tried any AI tools before? What was the experience?
10. What would it mean for your business if you could save 20+ hours per week?

#### Phase 2: Audit Report (Deliverable) - $500-$2,500
After the call, produce a professional document that includes:
1. **Executive Summary** - Key findings in 1 paragraph
2. **Current State Assessment** - Map of their current workflows
3. **Identified Opportunities** - Where AI can save time/money (ranked by impact)
4. **Recommended Solutions** - Specific tools and automations
5. **ROI Projection** - "You're spending $X/month on Y, AI can reduce this to $Z"
6. **90-Day Implementation Roadmap** - Phased plan with milestones
7. **Investment Required** - Your pricing for implementation

#### Phase 3: 90-Day Implementation - $2,500-$10,000
| Month | Focus | Deliverables |
|-------|-------|-------------|
| **Month 1** | Foundation | Set up AI receptionist, basic automations, integrate with existing tools |
| **Month 2** | Optimization | Refine AI responses, add outbound follow-ups, build dashboard |
| **Month 3** | Scale | Add advanced workflows, train their team, handoff documentation |

#### After 90 Days: Retainer - $500-$1,500/month
- Ongoing monitoring and optimization
- Monthly performance reports
- Bug fixes and updates
- Priority support

### How People in the Industry Do It

**Key figures to study:**
- **Liam Otley** (YouTube: Liam Otley) - Runs Morningside AI, built School community for AAA (AI Automation Agency)
  - His School community teaches the full agency model
  - YouTube channel has free content on client acquisition, pricing, delivery
- **Moritz Kremb** (YouTube) - AI agency content, technical tutorials
- **Nick Saraev** (YouTube) - Automation-focused, Make.com / n8n workflows
- **Brett Malinowski** (YouTube) - AI business models, monetization strategies

**YouTube searches to do:**
- "AI automation agency audit process"
- "how to sell AI to local businesses"
- "AI receptionist agency setup"
- "bland ai agency tutorial"
- "vapi ai agency"
- "90 day AI implementation plan template"

---

## 5. LEAD GENERATION & OUTREACH STRATEGY

### Strategy A: LinkedIn Prospecting (Your "Low-Hanging Fruit")

#### How to Find Leads
1. **LinkedIn Search queries:**
   - "hiring receptionist remote"
   - "hiring virtual assistant remote"
   - "looking for receptionist"
   - "office manager hiring"
   - Filter by: Posted in last week, Companies with 10-50 employees
2. **LinkedIn Sales Navigator** (free trial available):
   - Filter by industry (medical, dental, legal, real estate)
   - Filter by company size (2-50 employees)
   - Filter by job postings mentioning "receptionist" or "virtual assistant"
3. **Job boards to monitor:**
   - Indeed, ZipRecruiter, Glassdoor - search "receptionist" + "remote"
   - These companies are actively spending money on this problem

#### LinkedIn Automation Tools
| Tool | What It Does | Price |
|------|-------------|-------|
| **Phantombuster** | Scrape LinkedIn profiles, auto-connect, auto-message | $69/mo |
| **Dripify** | LinkedIn automation sequences | $39/mo |
| **Expandi** | Smart LinkedIn outreach | $99/mo |
| **Apollo.io** | Find emails + LinkedIn + outreach sequences | Free tier available |
| **Instantly.ai** | Cold email at scale | $30/mo |

**Recommendation for tight budget:** Start with **Apollo.io** (free tier: 10K leads/month) + manual LinkedIn outreach. Upgrade to Phantombuster or Instantly once you have revenue.

#### LinkedIn Outreach Message Template
```
Hi [Name],

I noticed you're looking for a [receptionist/VA] for [Company Name].

Quick question - have you considered an AI receptionist instead?

It answers calls 24/7, books appointments, and costs a fraction of a
full-time hire. I recently set one up for a [similar business] and
it handles 80%+ of their calls automatically.

Would you be open to a quick 10-min call to see if it might be a fit?

[Your Name]
QICKN LABS
```

### Strategy B: Loom Video Outreach

#### Do Faceless Loom Videos Work?
- Videos WITH your face convert 2-3x better than faceless
- However, faceless screen recordings still work if the content is compelling
- **Best approach:** Screen recording showing their actual website + a quick demo of what the AI receptionist would sound like for their business

#### How to Create Personalized Loom Videos at Scale
1. Pull up their website
2. Paste their business info into Claude/ChatGPT: "Create a sample AI receptionist script for [business]"
3. Record a 60-90 second Loom showing:
   - Their website (so they know it's personalized)
   - The AI receptionist script you generated
   - A quick audio demo (use Bland/Vapi to generate a sample call)
4. Send via LinkedIn DM or email

#### Tools for Video Outreach
- **Loom** (free tier) - Screen recording
- **Sendspark** - Personalized video at scale
- **Vidyard** - Video for sales
- **Weezly** - Video + scheduling combined

### Strategy C: AI Audit Outreach (Cold Email/LinkedIn)
Target: Businesses with 5-50 employees that are clearly not using AI

```
Subject: Quick question about [Company Name]'s workflow

Hi [Name],

I help [industry] businesses save 15-20 hours/week by identifying
where AI can handle repetitive tasks (phones, scheduling, follow-ups).

I recently helped a [similar business] cut their admin costs by 40%.

Would you be open to a free 15-minute AI opportunity assessment?
No pitch - just genuine insights you can use whether we work together or not.

[Your Name]
QICKN LABS
```

---

## 6. TECHNICAL STACK & HOSTING

### Recommended Tech Stack

| Layer | Tool | Why |
|-------|------|-----|
| **Voice AI** | Bland AI or Vapi | API-first, pay-per-use |
| **Backend/Automations** | Claude Code + Python/Node.js | You can build everything here |
| **Client Dashboard** | Next.js + Tailwind CSS | Modern, fast, easy to deploy |
| **Hosting** | Vercel (frontend) + Railway (backend) | Free tiers, easy deploy |
| **Database** | Supabase (free tier) | Postgres + Auth + API built-in |
| **CRM** | Google Sheets (start) or Airtable | Free, clients know it |
| **Automation** | n8n (self-hosted) or Make.com | Connect everything |
| **Email** | Resend or SendGrid | Transactional emails |
| **Scheduling** | Cal.com (open source) | Free, self-hostable |
| **Phone Numbers** | Twilio or platform-provided | Reliable, cheap |

### How to Host Client Dashboards

**Option 1: Vercel (Recommended for starting out)**
- Free tier: unlimited projects, custom domains
- Each client gets their own project/subdomain
- Deploy from GitHub - push code, it's live
- Example: `clientname.qicknlabs.com` (CNAME to Vercel)

**Option 2: Railway**
- Great for backend services, APIs, databases
- $5/month hobby plan
- Good for hosting n8n, APIs, cron jobs

**Option 3: Render**
- Similar to Railway, generous free tier
- Good for web services and background workers

### Managing Multiple Clients
- **Use a monorepo with shared components** (one GitHub repo, different configs per client)
- Or use a **template repo** that you clone for each new client
- Environment variables per client (API keys, business info)
- Each client gets their own Supabase project (free tier per project)

### Workflow with Claude Code
Claude Code is a CLI tool - you work in the terminal. Here's the workflow:
1. You describe what you want to build in conversation
2. Claude Code writes the code, creates files, runs commands
3. Code lives in your local files and GitHub repos
4. You deploy to Vercel/Railway from GitHub
5. To revisit a project: navigate to that repo folder and start a new Claude Code session

**It's not a visual dashboard** - it's a development tool. The dashboards you BUILD with it are what clients see.

---

## 7. WEEK 1 SPRINT PLAN (Get Your First Client)

### Your Schedule Reality
- **Tuesday:** Busy (prayer 4AM, office, meetings) - minimal work
- **Friday:** Similar to Tuesday - minimal work
- **Mon, Wed, Thu, Sat, Sun:** Available - these are your execution days

### Day-by-Day Plan

#### Monday (Day 1) - SETUP DAY
- [ ] Morning (2 hours):
  - Set up IRS payment plan online
  - Create QICKN LABS email (use Google Workspace $6/mo or free Gmail)
  - Set up LinkedIn profile for QICKN LABS positioning
  - Update your personal LinkedIn headline: "I help businesses replace $3K/month receptionists with AI that works 24/7"
- [ ] Afternoon/Evening (3 hours):
  - Sign up for Bland AI or Vapi (free tier/trial)
  - Build ONE demo AI receptionist (use a sample dental office or law firm)
  - Record yourself calling it - save the recording
  - Sign up for Apollo.io (free tier)

#### Tuesday (Day 2) - LIGHT DAY
- [ ] Evening only (1 hour):
  - Use Apollo.io to find 20 businesses hiring receptionists
  - Save them to a Google Sheet: Company, Contact, LinkedIn, Email, Industry

#### Wednesday (Day 3) - OUTREACH DAY
- [ ] Morning (2 hours):
  - Send 10 personalized LinkedIn connection requests with the message template
  - Send 10 cold emails using the audit outreach template
- [ ] Afternoon (2 hours):
  - Record 3-5 personalized Loom videos for the highest-potential leads
  - Each video: pull up their website, show what an AI receptionist could do for them
- [ ] Evening (1 hour):
  - Post on LinkedIn about AI receptionists (educational content)
  - Engage in comments on relevant posts

#### Thursday (Day 4) - FOLLOW-UP + BUILD
- [ ] Morning (1 hour):
  - Follow up on any replies
  - Send 10 more outreach messages
- [ ] Afternoon (3 hours):
  - Build your AI audit template document (use the framework from Section 4)
  - Create a simple one-page QICKN LABS website (use Carrd.co - $19/year)
  - Or build a quick landing page with Claude Code + deploy to Vercel

#### Friday (Day 5) - LIGHT DAY
- [ ] Evening only (1 hour):
  - Check responses, reply to leads
  - Refine your demo based on any feedback

#### Saturday (Day 6) - DEEP WORK
- [ ] Morning (3 hours):
  - Follow up on all outreach from the week
  - Send 20 more outreach messages
  - Record more Loom videos
- [ ] Afternoon (3 hours):
  - If you have an interested lead: prepare a custom demo for their business
  - If no leads yet: post valuable content on LinkedIn, join Facebook groups for small business owners, engage in r/smallbusiness on Reddit

#### Sunday (Day 7) - REVIEW + PLAN
- [ ] Morning (2 hours):
  - Review all metrics: messages sent, replies, calls booked
  - Refine what's working
  - Plan next week's outreach
  - If you have a discovery call booked: prepare your audit questions

---

## 8. AUTOMATION PLAYBOOK

### What Can Be Automated End-to-End

```
LEAD SCRAPING ──> OUTREACH ──> DEMO/CALL ──> CLOSE ──> DELIVERY
   [Auto]         [Semi]       [Manual]     [Manual]   [Semi-Auto]
```

### Level 1: What You Can Automate NOW
| Task | Tool | How |
|------|------|-----|
| Find leads hiring receptionists | Apollo.io API | Search filters, export to sheet |
| Enrich leads with emails | Apollo.io | Built-in email finder |
| Send cold emails at scale | Instantly.ai or Apollo | Email sequences with follow-ups |
| LinkedIn connection requests | Manual (to stay safe) | Use templates, personalize |
| Schedule discovery calls | Cal.com or Calendly | Auto-scheduling link in emails |
| Client onboarding form | Google Forms or Typeform | Collect business info |
| Set up AI receptionist | Bland/Vapi API via script | Python script with client config |

### Level 2: What You Can Automate WITH CLAUDE CODE
- Build a script that takes a company URL, scrapes their info, and generates a custom AI receptionist config
- Auto-generate audit reports from discovery call notes
- Create client dashboards from a template with one command
- Auto-deploy client projects to Vercel

### Level 3: Advanced Automation (After First Few Clients)
- Automated Loom-style videos using AI avatars (HeyGen, Synthesia)
- Outbound AI calls to leads using Bland AI
- Auto-qualify leads with an AI chatbot on your website
- Automated weekly reports to clients

### Voice AI APIs for Automation
| Platform | API Available | Use Case |
|----------|--------------|----------|
| **Bland AI** | Yes - REST API | Build/manage phone agents programmatically |
| **Vapi** | Yes - REST + WebSocket | Most developer-friendly, real-time control |
| **Retell AI** | Yes - REST API | High voice quality |
| **ElevenLabs** | Yes - REST API | Text-to-speech, voice cloning (not full phone agent) |
| **PlayHT** | Yes - REST API | Text-to-speech |
| **Deepgram** | Yes | Speech-to-text (transcription) |

---

## 9. AVOIDING SCOPE CREEP

### Rules for Every Client Engagement

1. **Define scope in writing BEFORE starting work**
   - Use a simple Statement of Work (SOW)
   - List exactly what's included and what's NOT included
   - Specify number of revision rounds (2-3 max)

2. **Simple SOW Template:**
   ```
   QICKN LABS - Statement of Work
   Client: [Name]
   Date: [Date]

   INCLUDED:
   - AI receptionist setup (inbound calls only)
   - Integration with [Google Calendar / their CRM]
   - Up to [20] FAQ responses programmed
   - 2 rounds of revisions
   - 1 week of testing and refinement

   NOT INCLUDED:
   - Outbound calling campaigns
   - Custom dashboard development
   - CRM migration
   - Marketing / lead generation
   - Changes after sign-off

   Timeline: [2 weeks]
   Investment: $[X] setup + $[Y]/month

   Additional work: $150/hour
   ```

3. **When clients ask for extras:**
   - "Great idea! That would be a Phase 2 addition. I can scope that out for you separately."
   - Never say no - just say "yes, and here's what that costs"

4. **Use project milestones:**
   - Milestone 1: Setup complete - client reviews
   - Milestone 2: Integrations connected - client tests
   - Milestone 3: Go live - monitoring period
   - Each milestone needs client sign-off before moving forward

---

## 10. SCALING STRATEGY

### Phase 1: Prove the Model (Month 1-2)
- Land 1-3 clients through manual outreach
- Deliver excellent results
- Document everything you build (for reuse)
- Get testimonials and case studies

### Phase 2: Niche Down (Month 2-3)
Best niches for AI receptionist services (ranked by opportunity):
1. **Dental offices** - High call volume, appointment-heavy, often understaffed
2. **Medical practices** - Same as dental, higher willingness to pay
3. **Law firms** (small/solo) - Need professional call handling, hate missing leads
4. **Real estate agencies** - Lead follow-up is critical, lots of inbound inquiries
5. **Home services** (HVAC, plumbing, electrical) - Miss calls = miss jobs
6. **Med spas / beauty clinics** - Appointment-heavy, growing industry

**Pick ONE.** Build a perfect solution for that niche. Then copy-paste across similar businesses.

### Phase 3: Productize (Month 3-6)
- Turn your custom builds into a repeatable product
- Create a self-service onboarding flow
- Standardize your packages (see Section 14)
- Hire a VA ($5-10/hr from Philippines) to handle outreach while you focus on delivery

### Phase 4: Scale (Month 6+)
- Build a team (freelancers for specific tasks)
- Create content (YouTube, LinkedIn) for inbound leads
- Consider white-labeling: let other agencies resell your tech
- Explore adjacent services (chatbots, email automation, lead gen)

---

## 11. GO HIGH LEVEL DOMAIN ISSUE - FIX

### Your Problem
You had a Go High Level (GHL) sub-account through Liam Otley's School community. Your domain is pointed to that sub-account and you can't access it to disconnect.

### How to Fix It
1. **Log into your domain registrar** (wherever you bought the domain - GoDaddy, Namecheap, Google Domains, Cloudflare, etc.)
2. **Go to DNS settings**
3. **Delete or change the DNS records** that point to Go High Level:
   - Look for A records or CNAME records pointing to GHL IPs/domains
   - GHL typically uses CNAME records pointing to something like `proxy.msgsndr.com` or similar
4. **Point your domain to your new site instead:**
   - If using Vercel: Add a CNAME record pointing to `cname.vercel-dns.com`
   - If using Carrd: Follow their custom domain instructions
5. **If you can't find the DNS records:** Contact your domain registrar's support - they can help you reset the DNS

**You do NOT need access to the GHL sub-account to fix this.** You just need access to where you bought the domain.

---

## 12. RESOURCES, REPOS, TOOLS & LINKS

### YouTube Channels to Study
- **Liam Otley** - AI Automation Agency model, client acquisition
- **Nick Saraev** - Automation workflows (Make.com, n8n)
- **Brett Malinowski** - AI business models
- **Moritz Kremb** - Technical AI agency tutorials
- **Greg Isenberg** - Startup ideas, including AI businesses

### Search These on YouTube
- "AI receptionist agency step by step"
- "bland ai tutorial"
- "vapi ai agency setup"
- "how to do an AI audit for businesses"
- "AI automation agency first client"
- "cold outreach LinkedIn AI agency"
- "n8n AI automation workflows"

### GitHub Repos & Open Source Tools
- **n8n** (https://github.com/n8n-io/n8n) - Self-hosted automation platform (like Zapier but free)
- **Cal.com** (https://github.com/calcom/cal.com) - Open source scheduling (Calendly alternative)
- **Supabase** (https://github.com/supabase/supabase) - Open source Firebase alternative (database + auth)
- **Chatwoot** (https://github.com/chatwoot/chatwoot) - Open source customer support platform
- **Formbricks** (https://github.com/formbricks/formbricks) - Open source survey/form tool
- **Dub.co** (https://github.com/dubinc/dub) - Open source link management
- **Documenso** (https://github.com/documenso/documenso) - Open source DocuSign alternative (for contracts)

### CRM Options for Your Agency
| Tool | Cost | Best For |
|------|------|----------|
| Google Sheets | Free | Starting out, tracking leads |
| Airtable | Free tier | More structured, relational data |
| HubSpot CRM | Free tier | Full CRM, overkill but powerful |
| Folk CRM | $20/mo | Lightweight, great for agencies |
| Notion | Free | All-in-one workspace |

### Key Tools for QICKN LABS
| Need | Tool | Link |
|------|------|------|
| Voice AI | Bland AI | https://bland.ai |
| Voice AI (alt) | Vapi | https://vapi.ai |
| Voice AI (alt) | Retell AI | https://retellai.com |
| Lead scraping | Apollo.io | https://apollo.io |
| Cold email | Instantly.ai | https://instantly.ai |
| Landing page (quick) | Carrd | https://carrd.co |
| Hosting | Vercel | https://vercel.com |
| Backend hosting | Railway | https://railway.app |
| Database | Supabase | https://supabase.com |
| Automation | n8n | https://n8n.io |
| Automation (no-code) | Make.com | https://make.com |
| Scheduling | Cal.com | https://cal.com |
| Video outreach | Loom | https://loom.com |
| Contracts | Documenso | https://documenso.com |
| Payments | Stripe | https://stripe.com |
| AI dev tool | Claude Code | You're already using it |

### Communities to Join (Free)
- r/artificial on Reddit
- r/SaaS on Reddit
- r/Entrepreneur on Reddit
- r/smallbusiness on Reddit
- Facebook groups: "AI Automation Agency", "AI for Business Owners"
- Twitter/X: Follow #AIAgency, #AIAutomation hashtags
- Discord: Search for AI automation communities

---

## 13. WEEKLY SCHEDULE TEMPLATE

Based on your constraints (Tuesday/Friday busy, prayer flow Tuesday 4AM):

| Day | Morning (6-9AM) | Daytime | Evening (7-10PM) |
|-----|-----------------|---------|-------------------|
| **Monday** | Outreach (emails, LinkedIn) | Job | Build/deliver client work |
| **Tuesday** | Prayer flow (4AM+) | Office + meetings | Rest or light admin |
| **Wednesday** | Outreach + follow-ups | Job | Deep work (building) |
| **Thursday** | Content creation (LinkedIn posts) | Job | Client calls / demos |
| **Friday** | Light admin | Similar to Tuesday | Rest or light work |
| **Saturday** | Deep work (building) | Outreach + follow-ups | Content / learning |
| **Sunday** | Weekly review + planning | Batch outreach prep | Rest |

### Weekly Targets
- Send 50+ outreach messages (LinkedIn + email combined)
- Book 2-3 discovery calls
- Create 2 LinkedIn posts (educational content about AI)
- Record 5+ personalized Loom videos
- Spend 4+ hours on delivery/building

---

## 14. PRICING & PACKAGES

### Package 1: AI Receptionist - "Starter"
**$500 setup + $497/month**
- AI phone receptionist (inbound calls)
- Up to 500 minutes/month
- Basic FAQ responses (up to 15 questions)
- Google Calendar integration
- Call transcripts & summaries
- Email notifications for important calls
- Business hours routing

### Package 2: AI Receptionist - "Professional"
**$1,500 setup + $997/month**
- Everything in Starter, plus:
- Up to 2,000 minutes/month
- Advanced call routing
- CRM integration
- Appointment booking with confirmation
- Follow-up text messages
- Custom voice & persona
- Monthly performance report
- Outbound appointment reminders

### Package 3: Full AI Automation Suite - "Enterprise"
**$3,000 setup + $1,997/month**
- Everything in Professional, plus:
- Outbound lead follow-up calls
- Email automation sequences
- Client dashboard with analytics
- Multi-channel (phone + chat + email)
- Priority support
- Quarterly optimization reviews

### AI Audit Pricing
- **Discovery Call:** Free (15-30 min)
- **Full AI Audit Report:** $997 one-time
- **Audit + 90-Day Implementation:** $4,997-$9,997
- **Ongoing Retainer (post-implementation):** $497-$1,497/month

---

## 15. PATH TO $10K/MONTH

### Month 1: Foundation ($0 - $2,000)
- [ ] Get 1 AI receptionist client ($997/mo)
- [ ] Do 1 paid AI audit ($997 one-time)
- [ ] Build your portfolio/case study from these
- **Revenue: ~$2,000**

### Month 2: Momentum ($2,000 - $5,000)
- [ ] Get 2 more receptionist clients ($2,000/mo recurring)
- [ ] Do 1 more audit + start implementation ($2,500)
- [ ] First client referral
- **Revenue: ~$4,500**

### Month 3: Scale ($5,000 - $10,000)
- [ ] 5 total receptionist clients ($5,000/mo recurring)
- [ ] 1 implementation project ($3,000-5,000)
- [ ] Start content marketing (LinkedIn, YouTube)
- [ ] Inbound leads starting to come in
- **Revenue: ~$8,000-$10,000**

### Key Metrics to Track
- Outreach messages sent per week
- Response rate
- Discovery calls booked
- Close rate
- Monthly recurring revenue (MRR)
- Client churn rate
- Average revenue per client

---

## QUICK REFERENCE: YOUR IMMEDIATE NEXT STEPS

1. **TODAY:** Set up IRS payment plan
2. **TODAY:** Sign up for Bland AI or Vapi (free tier)
3. **TODAY:** Sign up for Apollo.io (free tier)
4. **TODAY:** Update your LinkedIn headline
5. **TOMORROW:** Build your first demo AI receptionist
6. **THIS WEEK:** Send 50 outreach messages
7. **THIS WEEK:** Book your first discovery call
8. **THIS WEEK:** Create a simple landing page (Carrd.co or Vercel)

---

*QICKN LABS - Built Different.*
*Document generated March 8, 2026*
