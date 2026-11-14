"use client";
import { Suspense } from "react";
import { ExploreView } from "@/components/ExploreView";
export default function SearchPage() {
  return <Suspense><ExploreView searchMode /></Suspense>;
}
