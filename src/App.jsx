import { BrowserRouter, Route, Routes } from "react-router-dom";
import HomePage from "./components/HomePage";
import LiveGraph from "./components/LiveGraph";
import DeviceAdd from "./components/DeviceAdd";
import DeviceList from "./components/DeviceList";
import PortList from "./components/PortList";
import Navbar from "./components/Navbar";
import Login from "./components/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import { Outlet } from "react-router-dom";
import BackboneList from "./components/BackboneList";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Route */}
        <Route path="/login" element={<Login />} />

        {/* Protected Dashboard Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="backbonelist" element={<BackboneList />} />
            <Route path="livegraph" element={<LiveGraph />} />
            <Route path="addDevice" element={<DeviceAdd />} />
            <Route path="deviceList" element={<DeviceList />} />
            <Route path="portlist" element={<PortList />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

const Layout = () => {
  const handleLogout = () => {
    localStorage.removeItem('user');
    window.location.reload();
  };

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <Navbar />
      <div style={styles.mainContent}>
        <div style={styles.header}>
          <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
        </div>
        <Outlet />
      </div>
    </div>
  );
};

const styles = {
  mainContent: { 
    marginLeft: '15%', 
    width: '85%', 
    padding: '20px', 
    backgroundColor: '#f5f5f5', 
    height: '100vh', 
    overflowY: 'auto' 
  },
  header: { display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' },
  logoutBtn: { padding: '8px 16px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }
};

export default App;