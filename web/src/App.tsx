import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./components/pages/LandingPage";
import LoginPage from "./components/pages/LoginPage";
import SignupPage from "./components/pages/SignupPage";
import DashboardPage from "./components/pages/DashboardPage";
import SessionPage from "./components/pages/SessionPage";
<<<<<<< HEAD
import ECGCollection from "./components/pages/ECGCollection";
=======
>>>>>>> refs/remotes/origin/main
import TeamsPage from "./components/pages/TeamsPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/session" element={<SessionPage />} />
        <Route path="/sessions" element={<SessionPage />} />
<<<<<<< HEAD
        <Route path="/teams" element={<TeamsPage/>} />
        <Route path="/ecg" element={<ECGCollection />} />
=======
        <Route path="/teams" element={<TeamsPage />} />
>>>>>>> refs/remotes/origin/main
      </Routes>
    </BrowserRouter>
  );
}