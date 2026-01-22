import { Navigate } from "react-router-dom";

const Index = () => {
  // Root route should always land on the auth flow.
  return <Navigate to="/login" replace />;
};

export default Index;
