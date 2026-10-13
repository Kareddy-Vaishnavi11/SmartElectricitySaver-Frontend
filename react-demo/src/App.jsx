// App.jsx — React Router setup with protected routes and layout (Week 1, 5)
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import ErrorBoundary from './ErrorBoundary';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import BillsPage from './pages/BillsPage';
import ComparePage from './pages/ComparePage';
import CalculatorPage from './pages/CalculatorPage';
import RecommendationsPage from './pages/RecommendationsPage';
import ChatbotPage from './pages/ChatbotPage';

// Layout wrapper: sidebar + main content
function AppLayout() {
  return (
    <div className="app-layout">
      <Navbar />
      <main className="main-content">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public route */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected routes — require authentication */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/"               element={<DashboardPage />} />
          <Route path="/bills"          element={<BillsPage />} />
          <Route path="/add-bill"       element={<BillsPage />} />
          <Route path="/compare"        element={<ComparePage />} />
          <Route path="/calculator"     element={<CalculatorPage />} />
          <Route path="/recommendations"element={<RecommendationsPage />} />
          <Route path="/chatbot"        element={<ChatbotPage />} />
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<LoginPage />} />
      </Routes>
    </BrowserRouter>
  );
}