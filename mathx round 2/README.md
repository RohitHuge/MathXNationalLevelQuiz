# MathX Fastest Fingers First - Round 2

A real-time, WebSocket-powered application designed for a national-level mathematical quiz. Built with a Node.js backend referencing a NeonDB PostgreSQL database, and a React frontend constructed with Tailwind CSS.

## Project Structure

The project has been separated into two distinct environments for better maintainability:

### 1. `backend/`
The backend is an Express server paired with Socket.io to manage real-time question broadcasting and answer processing. It uses Prisma ORM to connect to NeonDB.

- **`index.js`**: The main entry point for the Express/Socket.io server. Handles connections, question broadcasting, and answer validation.
- **`prisma/schema.prisma`**: Defines the database layout and handles NeonDB connections.
- **`seed.js`**: A utility script capable of clearing the database and seeding 10 sample mathematical questions with numerical answers.

### 2. `frontend/`
The frontend is a Vite-powered React application using Tailwind CSS for a premium aesthetic look.

- **`src/App.jsx`**: Manages routing between the `/admin` view and `/client` view.
- **`src/SocketContext.jsx`**: Provides a global WebSocket connection using React Context.
- **`src/components/AdminView.jsx`**: The dashboard where an event host can trigger new questions and view a real-time leaderboard of numeric answers.
- **`src/components/ClientView.jsx`**: The interface where participants view Latex-formatted equations and submit numerical answers.

## Database Schema

We use Prisma with the PostgreSQL adapter to communicate with NeonDB. The two core models are:

### `Question`
Stores the mathematical questions formatted with LaTeX strings and an expected numerical answer.
- **id**: String (UUID)
- **text**: String (Question description)
- **mathText**: String? (The LaTeX equation)
- **correctAnswer**: Float (The expected strict numerical answer)
- **isActive**: Boolean (Indicates if it is currently being asked)

### `Answer`
Tracks individual participant submissions.
- **id**: String (UUID)
- **clientId**: String (The socket UUID or name associated)
- **questionId**: String (Foreign Key)
- **numericAnswer**: Float (What the client submitted)
- **timeTaken**: Float (Seconds taken to lock the answer)
- **isCorrect**: Boolean (Evaluated immediately on submission against the `Question`'s `correctAnswer`)

## How to Run

1. **Environment Variables**: Add a `.env` file to the `backend/` directory with your NeonDB connection string:
   ```env
   DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
   ```

2. **Backend**:
   ```bash
   cd backend
   npm install
   npx prisma db push
   npx prisma generate
   npm run dev
   ```
   *Optional: Run `node seed.js` to populate questions.*

3. **Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. Open `http://localhost:5173/admin` for the control panel, and multiple `http://localhost:5173/client` windows to simulate participants.
