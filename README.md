# 🕊️ Dove Grants

AI-powered grant management system with a revolutionary split-screen conversational interface.

## Features

- **AI Companion**: Voice/text chat assistant that guides applicants through the application process
- **Live Form Sync**: Form fields auto-populate in real-time based on conversation
- **Smart Categorization**: AI automatically categorizes applications with explanations and confidence scores
- **Ranking System**: Configurable criteria-based ranking with AI-generated reasoning
- **Budget Management**: Track yearly budgets across categories with threshold alerts
- **Admin Dashboard**: Monitor applications, approve/reject with budget impact tracking

## Tech Stack

- **Frontend**: React 18, TypeScript, TailwindCSS, Vite
- **Backend**: Node.js, Express, TypeScript, WebSocket
- **AI**: OpenAI GPT-4 API
- **Voice**: Web Speech API (browser-native)
- **Testing**: Vitest, fast-check (property-based testing)

## Prerequisites

- Node.js 18+ 
- npm 9+
- OpenAI API key (for AI features)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd dove-grants
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the `packages/backend` directory:
   ```bash
   touch packages/backend/.env
   ```
   
   Add your OpenAI API key:
   ```env
   OPENAI_API_KEY=sk-your-openai-api-key-here
   ```
   
   > **Note**: The AI features (chat companion, categorization, ranking) require a valid OpenAI API key. Without it, the app will run but AI features will return mock/error responses.

4. **Build shared package**
   ```bash
   npm run build -w @dove-grants/shared
   ```

## Running the Application

**Development mode** (runs both frontend and backend with hot reload):
```bash
npm run dev
```

This starts:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001

**Run individually**:
```bash
# Frontend only
npm run dev:frontend

# Backend only
npm run dev:backend
```

## Usage

### As an Applicant
1. Open http://localhost:3000
2. Click "New Application" 
3. Use the AI Companion (left panel) to describe your grant request via voice or text
4. Watch the form (right panel) auto-populate as you chat
5. Review and submit your application

### As an Administrator
1. Click "Admin Dashboard" in the navigation
2. View budget status and category breakdowns
3. Filter applications by category or status
4. Click "Rank" on a category to AI-rank applications
5. Approve (✓) or reject (✗) applications

## Project Structure

```
dove-grants/
├── packages/
│   ├── shared/          # Shared types, validation, utilities
│   │   └── src/
│   │       ├── types.ts
│   │       ├── validation.ts
│   │       ├── budget.ts
│   │       ├── ranking.ts
│   │       ├── filtering.ts
│   │       └── serialization.ts
│   ├── backend/         # Express API server
│   │   └── src/
│   │       ├── index.ts
│   │       ├── services/
│   │       │   ├── ai.ts
│   │       │   └── data.ts
│   │       └── routes/
│   │           ├── applications.ts
│   │           ├── budget.ts
│   │           └── criteria.ts
│   └── frontend/        # React application
│       └── src/
│           ├── App.tsx
│           └── components/
│               ├── AICompanion.tsx
│               ├── ApplicationForm.tsx
│               └── AdminDashboard.tsx
└── .kiro/specs/         # Feature specifications
```

## Testing

Run all tests:
```bash
npm test
```

The test suite includes:
- Unit tests for validation, budget calculations, ranking
- Property-based tests (35 properties) using fast-check

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/applications` | List all applications |
| POST | `/api/applications` | Create new application |
| PATCH | `/api/applications/:id` | Update/approve/reject application |
| GET | `/api/budget/status` | Get budget overview |
| POST | `/api/budget/categories` | Create category |
| GET | `/api/criteria` | List ranking criteria |
| POST | `/api/applications/rank/:categoryId` | Rank applications in category |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes* | OpenAI API key for AI features |
| `PORT` | No | Backend port (default: 3001) |

*Required for AI features to work properly

## License

MIT
