# IncuTech Systems

> High-precision automation, IoT telemetry, and incubator control management web platform.

## 🚀 Tech Stack
- **Frontend Framework:** React 18 with TypeScript & Vite
- **Styling:** Tailwind CSS & Shadcn/UI primitives
- **Routing:** React Router v6
- **State Management:** Zustand & TanStack Query (React Query)
- **Auth:** Clerk + Supabase Auth
- **Database & Storage:** Supabase PostgreSQL & Storage
- **Deployment:** Vercel

---

## 🛠️ Local Development

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Setup Environment Variables:**
   Copy `.env.example` to `.env` and fill in your keys:
   ```bash
   cp .env.example .env
   ```

3. **Run Dev Server:**
   ```bash
   npm run dev
   ```

4. **Production Build Check:**
   ```bash
   npm run build
   ```

---

## 🌐 Deploy to Vercel

1. **Push your code to GitHub / GitLab:**
   ```bash
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/your-username/your-repo.git
   git push -u origin main
   ```

2. **Import into Vercel:**
   - Go to [vercel.com](https://vercel.com) and click **"Add New Project"**.
   - Select your GitHub repository.
   - Framework Preset: **Vite**.
   - Build Command: `npm run build`.
   - Output Directory: `dist`.

3. **Add Environment Variables in Vercel:**
   Under **Project Settings > Environment Variables**, add:
   - `VITE_SUPABASE_PROJECT_ID`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_SUPABASE_URL`
   - `VITE_CLERK_PUBLISHABLE_KEY`

4. **Deploy!** 🚀
