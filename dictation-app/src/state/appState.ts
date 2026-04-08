import { useState } from "react";

type Page = "setup" | "settings";

export function useAppState() {
  const [currentPage, setCurrentPage] = useState<Page>("setup");

  return {
    currentPage,
    setCurrentPage,
  };
}
