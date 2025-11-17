import { Navigate } from "react-router-dom";

export default function PrivateRoute({ children }) {
  const token = localStorage.getItem("access"); // token guardado al iniciar sesión
  return token ? children : <Navigate to="/login" />;
}
