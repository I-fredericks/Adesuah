import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import { Spinner } from './components/ui';

import Home from './pages/Home';
import Login from './pages/Login';
import RegisterSchool from './pages/RegisterSchool';
import Dashboard from './pages/Dashboard';

const Students = lazy(() => import('./pages/Students'));
const StudentDetail = lazy(() => import('./pages/StudentDetail'));
const Academics = lazy(() => import('./pages/Academics'));
const Attendance = lazy(() => import('./pages/Attendance'));
const ScoreEntry = lazy(() => import('./pages/ScoreEntry'));
const ReportCards = lazy(() => import('./pages/ReportCards'));
const Fees = lazy(() => import('./pages/Fees'));
const Announcements = lazy(() => import('./pages/Announcements'));
const Staff = lazy(() => import('./pages/Staff'));
const Settings = lazy(() => import('./pages/Settings'));
const PlatformAdmin = lazy(() => import('./pages/PlatformAdmin'));
const NotFound = lazy(() => import('./pages/NotFound'));

const Loading = () => (
  <div className="flex h-64 items-center justify-center">
    <Spinner />
  </div>
);

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<RegisterSchool />} />

        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/students" element={<Suspense fallback={<Loading />}><Students /></Suspense>} />
          <Route path="/students/:id" element={<Suspense fallback={<Loading />}><StudentDetail /></Suspense>} />
          <Route path="/academics" element={<Suspense fallback={<Loading />}><Academics /></Suspense>} />
          <Route path="/attendance" element={<Suspense fallback={<Loading />}><Attendance /></Suspense>} />
          <Route path="/scores" element={<Suspense fallback={<Loading />}><ScoreEntry /></Suspense>} />
          <Route path="/reports" element={<Suspense fallback={<Loading />}><ReportCards /></Suspense>} />
          <Route path="/fees" element={<Suspense fallback={<Loading />}><Fees /></Suspense>} />
          <Route path="/announcements" element={<Suspense fallback={<Loading />}><Announcements /></Suspense>} />
          <Route path="/staff" element={<Suspense fallback={<Loading />}><Staff /></Suspense>} />
          <Route path="/settings" element={<Suspense fallback={<Loading />}><Settings /></Suspense>} />
          <Route path="/platform" element={<Suspense fallback={<Loading />}><PlatformAdmin /></Suspense>} />
          <Route path="*" element={<Suspense fallback={<Loading />}><NotFound /></Suspense>} />
        </Route>
      </Routes>
    </Router>
  );
}
