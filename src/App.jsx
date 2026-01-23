import { BrowserRouter, Route, Routes, Outlet } from "react-router-dom";
import HomePage from "./components/HomePage";
import LiveGraph from "./components/LiveGraph";
import DeviceAdd from "./components/DeviceAdd";
import DeviceList from "./components/DeviceList";
import PortList from "./components/PortList";
import Navbar from "./components/Navbar"; // Fixed import to match export

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} /> {/* Default route shows HomePage (can be customized as dashboard content) */}
          <Route path="livegraph" element={<LiveGraph />} />
          <Route path="addDevice" element={<DeviceAdd />} />
          <Route path="deviceList" element={<DeviceList />} />
          <Route path="portlist" element={<PortList />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

// Layout component: Handles the overall dashboard structure
const Layout = () => {
  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <Navbar /> {/* Left 15% sidebar (fixed) */}
      <div 
        style={{ 
          marginLeft: '15%', // Account for fixed sidebar width
          width: '85%', // Adjusted to fill remaining space (or keep '83%' if you want a small margin)
          padding: '20px', 
          backgroundColor: '#f5f5f5',
          height: '100vh', // Full height
          overflowY: 'auto' // Enable vertical scrolling for the right side
        }}
      >
        <Outlet /> {/* Right side for routed components */}
      </div>
    </div>
  );
};