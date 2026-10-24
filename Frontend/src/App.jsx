import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Landing from "./screens/Landing";
import SignIn from "./screens/SignIn";
import Lobby from "./screens/Lobby";
import HopOff from "./screens/HopOff";
import Underdog from "./screens/Underdog";
import Fairness from "./screens/Fairness";
import PlaySafe from "./screens/PlaySafe";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/sign-in" element={<SignIn />} />
        <Route path="/play" element={<Lobby />} />
        <Route path="/play/hop-off" element={<HopOff />} />
        <Route path="/play/underdog" element={<Underdog />} />
        <Route path="/fair" element={<Fairness />} />
        <Route path="/play-safe" element={<PlaySafe />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
