import { useState } from "react";

type Page = "home" | "settings" | "diagnostics";

export function useAppState() {
  const [currentPage, setCurrentPage] = useState<Page>("home");

  return {
    currentPage,
    setCurrentPage,
  };
}
