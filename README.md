# AI Investigation Room Server

Express and MongoDB API for AI-generated detective mysteries. Gemini creates structured cases; the server validates, stores, localizes, and scores them.

## Folder structure

```text
server/
├── src/
│   ├── config/          # Difficulty settings
│   ├── middleware/      # Error handling
│   ├── models/          # MongoDB schemas
│   ├── routes/          # REST API routes
│   ├── services/        # Gemini, scoring, and serialization
│   ├── validators/      # Generated-content validation
│   ├── app.js           # Express application
│   └── server.js        # Server startup
├── test/                # Node test suite
├── .env.example         # Backend environment template
└── package.json
```

## Setup

Requirements: Node.js 20.19 or later, MongoDB, and a Gemini API key.

```powershell
cd server
Copy-Item .env.example .env
npm install
npm run dev
```

Set these values in `.env`:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/ai_mystery_room
GEMINI_API_KEY=your_gemini_api_key
CLIENT_ORIGIN=http://localhost:5173
```

Check the running API at `http://localhost:5000/api/health`.

## Commands

```powershell
npm run dev    # Start with Nodemon
npm start      # Start the production server
npm test       # Run backend tests
```

## Git workflow

The `server` folder belongs to the shared repository at the project root. Run Git commands from `server` or the project root:

```powershell
git status
git add server/src server/test server/package.json server/package-lock.json server/README.md
git commit -m "Update server API"
git push
```

Do not commit `.env`, `node_modules`, or any API keys and database credentials.

## Vercel deployment

Create a separate Vercel project for the API and set its **Root Directory** to `server`. This deploys `api/index.js` as the serverless entry point and routes API requests through Express.

Add these environment variables in the Vercel project settings:

```text
MONGODB_URI=<your MongoDB Atlas connection string>
GEMINI_API_KEY=<your Gemini API key>
CLIENT_ORIGIN=https://your-frontend.vercel.app
```

After deployment, verify `https://your-server.vercel.app/api/health`. Set the frontend project's `VITE_API_BASE_URL` to `https://your-server.vercel.app/api`, then redeploy the frontend.
