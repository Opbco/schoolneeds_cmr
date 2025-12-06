import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import SchoolDetail from './pages/SchoolDetail';
import Personnel from './pages/Personnel';
import CurriculumManager from './pages/CurriculumManager';
import Networks from './pages/Networks';
import NetworkDetail from './pages/NetworkDetail';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="school/:id" element={<SchoolDetail />} />
            <Route path="curricula" element={<CurriculumManager />} />
            <Route path="personnel" element={<Personnel />} />
            <Route path="networks" element={<Networks />} />
            <Route path="networks/:id" element={<NetworkDetail />} />

          </Route>
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
