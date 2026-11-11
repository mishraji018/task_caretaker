import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Login from './components/Login';
import Signup from './components/Signup';
import Insights from './components/Insights';
import PrivateRoute from './components/PrivateRoute';
import AppShell from './components/layout/AppShell';
import TodayPage from './pages/TodayPage';
import UpcomingPage from './pages/UpcomingPage';
import InboxPage from './pages/InboxPage';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <AuthProvider>
          <Routes>
            <Route path="/signup" element={<Signup />} />
            <Route path="/login" element={<Login />} />

            <Route path="/" element={<PrivateRoute><AppShell /></PrivateRoute>}>
              <Route index element={<Navigate to="/today" replace />} />
              <Route path="today" element={<TodayPage />} />
              <Route path="upcoming" element={<UpcomingPage />} />
              <Route path="inbox" element={<InboxPage />} />
              <Route path="insights" element={<Insights />} />
            </Route>

            {/* Unknown routes redirect to default authenticated view */}
            <Route path="*" element={<Navigate to="/today" replace />} />
          </Routes>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
