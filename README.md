# Chronicle - Share Your Stories With The World

Chronicle is a beautiful, modern platform for writers and readers to connect through compelling narratives. It provides a seamless experience for creating, sharing, and discovering stories that inspire.

## Features

- **Rich Text Editor**: Create stunning posts with a powerful Tiptap-based editor supporting formatting, images, and links.
- **User Authentication**: Secure login, registration, and password management powered by Supabase.
- **Interactive Feed**: Discover stories with a responsive and engaging feed layout.
- **Social Engagement**: Follow authors, like posts, bookmark favorites, and receive notifications.
- **User Profiles**: customizable profiles for authors with bio, social links, and post history.
- **Analytics**: Track the performance of your stories with built-in analytics.
- **Modern UI**: Polished interface built with Shadcn UI and Tailwind CSS, featuring dark/light mode support.

## Tech Stack

**Frontend:**
- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Shadcn UI](https://ui.shadcn.com/)
- [TanStack Query](https://tanstack.com/query/latest)

**Backend & Services:**
- [Supabase](https://supabase.com/) (Database, Auth, Storage)

## Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm, yarn, or bun

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd dev-write
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory based on `.env.example`. You will need your Supabase credentials.
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:8080` (or the port shown in your terminal).

## Scripts

- `npm run dev`: Start the development server.
- `npm run build`: Build the application for production.
- `npm run lint`: Run ESLint to check for code quality issues.
- `npm run preview`: Preview the production build locally.

## Project Structure

```
src/
├── components/   # Reusable UI components
├── contexts/     # React Context providers (Auth, Theme)
├── hooks/        # Custom React hooks
├── pages/        # Application routes/views
├── lib/          # Utilities and libraries (utils, Supabase client)
└── integrations/ # Third-party integration logic
```

## License

This project is proprietary.