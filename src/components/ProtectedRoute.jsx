import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = () => {
  //const user = JSON.parse(localStorage.getItem('user'));
  const user = localStorage.getItem('user');

  // If no user is logged in, redirect to login page
  return user ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;