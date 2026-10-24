import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Lobby from "./screens/Lobby";
import Why from "./screens/Why";
import SignIn from "./screens/SignIn";
import HopOff from "./screens/HopOff";
import Underdog from "./screens/Underdog";
import Fairness from "./screens/Fairness";
import PlaySafe from "./screens/PlaySafe";
import Double from "./screens/Double";
import Seven from "./screens/Seven";
import BigWheel from "./screens/BigWheel";
import LastStanding from "./screens/LastStanding";
import Penalties from "./screens/Penalties";
import Race from "./screens/Race";
import { RACES } from "./lib/races";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Lobby />} />
        <Route path="/play" element={<Navigate to="/" replace />} />
        <Route path="/why" element={<Why />} />
        <Route path="/sign-in" element={<SignIn />} />
        <Route path="/play/hop-off" element={<HopOff />} />
        <Route path="/play/underdog" element={<Underdog />} />
        <Route path="/play/double" element={<Double />} />
        <Route path="/play/seven" element={<Seven />} />
        <Route path="/play/big-wheel" element={<BigWheel />} />
        <Route path="/play/last-standing" element={<LastStanding />} />
        <Route path="/play/mega-jackpot" element={<LastStanding game="mega" />} />
        <Route path="/play/penalties" element={<Penalties />} />
        {RACES.map((r) => (
          <Route key={r.id} path={`/play/${r.id}`} element={<Race key={r.id} id={r.id} />} />
        ))}
        <Route path="/fair" element={<Fairness />} />
        <Route path="/play-safe" element={<PlaySafe />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
