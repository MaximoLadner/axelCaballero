import { BrowserRouter, Routes, Route } from "react-router-dom";

import Sorteo from "./pages/Sorteo";
import Terminos from "./pages/Terminos";
import Privacidad from "./pages/Privacidad";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Sorteo />} />
        <Route path="/terminos" element={<Terminos />} />
        <Route path="/privacidad" element={<Privacidad />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;