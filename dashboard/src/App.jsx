import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import AdminLayout from './layouts/AdminLayout';
import ContractorLayout from './layouts/ContractorLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/AdminDashboard';
import ContractorDashboard from './pages/ContractorDashboard';
import SubmitRequest from './pages/SubmitRequest';
import RequestHistory from './pages/RequestHistory';
import WorkOrderDetails from './pages/WorkOrderDetails';
import ContractorRequests from './pages/ContractorRequests';
import Reports from './pages/Reports';
import ViolationsPage from './pages/ViolationsPage';

function App() {
  const { user } = useAuth();

  // If user is not logged in, only allow access to login page
  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // If user is logged in, show appropriate routes based on role
  return (
    <Routes>
      {/* Redirect from login page if already logged in */}
      <Route
        path="/login"
        element={
          <Navigate
            to={user.role === 'admin' ? '/admin/dashboard' : '/contractor/dashboard'}
            replace
          />
        }
      />

      {/* Admin routes */}
      {user.role === 'admin' && (
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="contractors" element={<ContractorRequests />} />
          <Route path="work-order/:id" element={<WorkOrderDetails />} />
          <Route path="reports" element={<Reports />} />
          <Route path="violations" element={<ViolationsPage />} />
        </Route>
      )}

      {/* Contractor routes */}
      {user.role === 'contractor' && (
        <Route path="/contractor" element={<ContractorLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<ContractorDashboard />} />
          <Route path="submit-request" element={<SubmitRequest />} />
          <Route path="request-history" element={<RequestHistory />} />
          <Route path="work-order/:id" element={<WorkOrderDetails />} />
        </Route>
      )}

      {/* Redirect root to appropriate dashboard */}
      <Route
        path="/"
        element={
          <Navigate
            to={user.role === 'admin' ? '/admin/dashboard' : '/contractor/dashboard'}
            replace
          />
        }
      />

      {/* Catch all other routes and redirect to appropriate dashboard */}
      <Route
        path="*"
        element={
          <Navigate
            to={user.role === 'admin' ? '/admin/dashboard' : '/contractor/dashboard'}
            replace
          />
        }
      />
    </Routes>
  );
}

export default App;