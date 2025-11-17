import React from "react";
import { useLoading } from "../context/LoadingContext";
import "./loader.css";

export default function GlobalLoader() {
  const { isLoading } = useLoading();

  if (!isLoading) return null;

  return (
    <div className="global-loader">
      <div className="loader-spinner"></div>
    </div>
  );
}
