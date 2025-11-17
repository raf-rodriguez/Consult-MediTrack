import { useLoading } from "../context/LoadingContext";
import { toast } from "react-toastify";

export const useFetch = () => {
  const { setIsLoading } = useLoading();

  const request = async (url, options = {}) => {
    try {
      setIsLoading(true);

      const token = localStorage.getItem("access");

      const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      };

      const response = await fetch(url, { ...options, headers });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.error || "Error en la operación");
        throw new Error(errorData.error || "Error desconocido");
      }

      return await response.json();
    } catch (error) {
      console.error("[useFetch]", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    get: (url) => request(url),
    post: (url, body) => request(url, { method: "POST", body: JSON.stringify(body) }),
    put: (url, body) => request(url, { method: "PUT", body: JSON.stringify(body) }),
    patch: (url, body) => request(url, { method: "PATCH", body: JSON.stringify(body) }),
    del: (url) => request(url, { method: "DELETE" }),
  };
};
