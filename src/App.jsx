import { BrowserRouter, Route, Routes } from "react-router-dom";
import HomePage from "./components/HomePage";
import LiveGraph from "./components/LiveGraph";
import DeviceAdd from "./components/DeviceAdd";
import DeviceList from "./components/DeviceList";

function App() {

  return (
    <>
      <div>
        <BrowserRouter>
          <HomePage />
          <Routes>
            <Route path="/livegraph" element={<LiveGraph />} />
            <Route path="/addDevice" element={<DeviceAdd />} />
            <Route path="/deviceList" element={<DeviceList />} />
          </Routes>
        </BrowserRouter>
      </div>
    </>
  );
}

export default App;
