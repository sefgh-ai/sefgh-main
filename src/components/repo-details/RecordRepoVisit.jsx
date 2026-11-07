"use client";

import { useEffect } from "react";
import { recordRepoVisit } from "@/lib/home/recentRepos";

/** Remembers this repository in the browser for Home's "Continue where you left off". */
export default function RecordRepoVisit({ name, description, language }) {
  useEffect(() => {
    recordRepoVisit({ name, description, language });
  }, [name, description, language]);
  return null;
}
