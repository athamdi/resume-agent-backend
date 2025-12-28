# Frontend Integration Files

This folder contains TypeScript files for integrating your Lovable (React) frontend with the Resume Agent backend.

## 📁 Files Overview

### 1. `api.ts` - API Configuration
- Defines API base URL and all endpoints
- Contains constants for storage keys and limits
- **Copy to:** `src/config/api.ts`

### 2. `apiService.ts` - API Service Layer
- Handles all HTTP requests to backend
- Includes error handling and token management
- Provides type-safe API methods
- **Copy to:** `src/services/api.ts`

### 3. `useAuth.ts` - Authentication Hook
- Custom React hook for auth state
- Handles login, register, logout
- Manages user session
- **Copy to:** `src/hooks/useAuth.ts`

### 4. `useApplications.ts` - Applications Hook
- Custom React hook for job applications
- Manages application state and statistics
- Provides apply and bulk apply methods
- **Copy to:** `src/hooks/useApplications.ts`

## 🚀 Setup Instructions

### Step 1: Copy Files to Lovable

```bash
# In your Lovable project, create these files:
src/
├── config/
│   └── api.ts          # Copy from api.ts
├── services/
│   └── api.ts          # Copy from apiService.ts
└── hooks/
    ├── useAuth.ts      # Copy from useAuth.ts
    └── useApplications.ts  # Copy from useApplications.ts
```

### Step 2: Add Environment Variable

Create `.env` file in your Lovable project:

```env
VITE_API_URL=http://localhost:3000
```

For production (when deployed):
```env
VITE_API_URL=https://your-backend-url.com
```

### Step 3: Example Usage in Components

#### Login Component Example

```tsx
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading, error } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      console.error('Login failed:', err);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}
```

#### Dashboard Component Example

```tsx
import { useAuth } from '@/hooks/useAuth';
import { useApplications } from '@/hooks/useApplications';

export function Dashboard() {
  const { user, logout } = useAuth();
  const { applications, stats, loading } = useApplications();

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Welcome, {user?.fullName}!</h1>
      
      <div className="stats">
        <div>Total Applications: {stats?.total || 0}</div>
        <div>Completed: {stats?.completed || 0}</div>
        <div>Success Rate: {stats?.successRate || 0}%</div>
        <div>Today: {stats?.todayCount || 0}/20</div>
      </div>

      <div className="applications">
        <h2>Recent Applications</h2>
        {applications.map(app => (
          <div key={app.id} className="application-card">
            <h3>{app.job?.title}</h3>
            <p>{app.job?.company}</p>
            <span className={`status ${app.status}`}>
              {app.status}
            </span>
          </div>
        ))}
      </div>

      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

#### Apply to Job Example

```tsx
import { useState } from 'react';
import { useApplications } from '@/hooks/useApplications';

export function JobCard({ job }: { job: any }) {
  const { applyToJob, loading } = useApplications();
  const [applied, setApplied] = useState(false);

  async function handleApply() {
    try {
      await applyToJob(job.id);
      setApplied(true);
    } catch (err) {
      console.error('Application failed:', err);
    }
  }

  return (
    <div className="job-card">
      <h3>{job.title}</h3>
      <p>{job.company} - {job.location}</p>
      <button 
        onClick={handleApply} 
        disabled={loading || applied}
      >
        {applied ? 'Applied ✓' : 'Apply Now'}
      </button>
    </div>
  );
}
```

## 🔒 Protected Routes

Create a protected route component:

```tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
```

Use it in your router:

```tsx
<Route path="/dashboard" element={
  <ProtectedRoute>
    <Dashboard />
  </ProtectedRoute>
} />
```

## 📝 Notes

- All API calls include automatic JWT token handling
- Errors are properly typed and handled
- Loading states are managed automatically
- Token is stored in localStorage and persists across sessions
- CORS is configured to allow your Lovable domain

## 🐛 Troubleshooting

### CORS Issues
- Make sure backend server.js has your Lovable URL in CORS config
- Check browser console for specific CORS errors

### 401 Unauthorized
- Token may be expired (7 day expiration)
- Try logging out and back in
- Check if token exists: `localStorage.getItem('authToken')`

### Connection Refused
- Ensure backend is running: `node server.js`
- Check API_URL in .env matches backend port
- Verify no firewall blocking localhost:3000

## ✅ Testing

After setting up, test the integration:

1. Start backend: `node server.js`
2. Run integration test: `node test-frontend-integration.js`
3. Start Lovable dev server
4. Try registering a new user
5. Check if dashboard loads with data

## 🎯 Next Steps

1. Copy all 4 files to your Lovable project
2. Add .env with VITE_API_URL
3. Create login/register pages using useAuth
4. Create dashboard using useApplications
5. Add protected routes
6. Style components with your design system

Good luck! 🚀
