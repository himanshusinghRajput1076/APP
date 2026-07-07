# IDEACON — Product Requirements Document (PRD)

## Vision
IDEACON is a futuristic startup ecosystem mobile app that connects three panels + admin:
1. **Future Founders** (Students with startup ideas)
2. **Future Partners** (Investors)
3. **Growing Startups** (Registered small companies)
4. **Admin Panel** (Platform management)

The design is inspired by DPIIT (Department for Promotion of Industry and Internal Trade, India) with a modern, neon (Saffron + Green) aesthetic — subtle Indian pride.

## Core Features

### Authentication
- JWT-based auth (bcrypt password hashing)
- Signup with role selection (student / investor / growing_startup)
- Login / Logout
- Admin auto-seeded on startup

### KYC / Verification
- Manual KYC form (PAN, Aadhar, Mobile, Institution, ID Photo upload)
- Digilocker placeholder toggle (post-deployment integration)
- Admin approval/rejection workflow

### Digital ID Card
- Auto-generated with QR code (member ID)
- Futuristic glassmorphic card with corner accents
- Pro tier gets Green (secondary) border, standard gets Orange (primary)
- Shows KYC status, credits, tier, expiration

### Subscription (Razorpay - mock mode)
| Plan | Amount | Discovery Limit | Tier |
| --- | --- | --- | --- |
| Founder Basic | ₹205 | 10 investors | basic |
| Founder Pro | ₹549 | 30 investors | pro |
| Partner Basic | ₹549 | 50 founders/startups | basic |
| Startup Basic | ₹549 | 40 investors | basic |
| Startup Pro | ₹749 | 60 investors | pro |
- Credits included with each plan (50–250 depending on tier)
- 24 hrs free trial for all new users (5 discovery profiles)
- Payment methods: UPI, Card, QR (via Razorpay in production)

### Discovery
- Role-based feed (Founders see Investors, Investors see Founders/Startups)
- Sector filter (40+ business sectors)
- Contact details (email/mobile) hidden — only chat allowed
- Profile card shows: photo, sector, investment amount, company, tier

### Idea Pitching
- Founders and Startups can post ideas with title, description, sector, funding ask
- Feed visible to all users
- "Ignite" (like) count

### Portfolio
- Bio, sector, website, LinkedIn, company name
- Photo upload (base64)
- Investors can set investment ticket amount

### Real-time Chat
- WebSocket-based (with HTTP fallback)
- 1-on-1 conversations
- Connection status indicator

### Support & Help
- Category-based ticket creation (Pitching, Company Registration, Investor Intro, KYC, Billing, General)
- Ticket status tracking
- Contact info display

### Admin Panel
- Analytics dashboard: users, revenue, subscriptions, KYC counts, pitches, messages, tickets
- User management: filter by role, view details, approve/reject KYC, toggle active
- Revenue breakdown by plan

## Design System
- **Theme:** Dark (default) + Light mode toggle
- **Palette:** Saffron `#FF6B00` (primary), Neon Green `#00FF66` (secondary) — India-inspired
- **Typography:** Bold Swiss/geometric headings, high contrast
- **Layout:** Asymmetrical bento grids, razor-thin 1px borders
- **Animations:** React Native Reanimated (splash logo, staggered entrances)

## Tech Stack
- **Backend:** FastAPI + MongoDB (Motor) + JWT + WebSockets + Razorpay SDK
- **Frontend:** Expo 54 + React Native 0.81 + Expo Router + Reanimated + react-native-qrcode-svg
- **Storage:** SecureStore for JWT tokens (via `@/src/utils/storage`)

## Environment
- `MONGO_URL`, `DB_NAME=ideacon`
- `JWT_SECRET_KEY`, `ACCESS_TOKEN_EXPIRE_MINUTES=10080`
- `ADMIN_EMAIL=admin@ideacon.in`, `ADMIN_PASSWORD=Admin@Ideacon2026`
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `PAYMENT_MODE=mock|live`

## Roadmap
- Real DigiLocker OAuth integration (post-partnership)
- Live Razorpay after user provides production keys
- Push notifications (Firebase / Emergent Push)
- Email delivery for OTP / KYC updates (SendGrid)
- Advanced admin analytics (charts, revenue trends)
