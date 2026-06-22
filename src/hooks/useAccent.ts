"use client";

import { useContext } from "react";
import { AccentContext } from "@/components/providers/AccentProvider";

export function useAccent() {
  return useContext(AccentContext);
}
