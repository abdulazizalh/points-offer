import type { Metadata } from "next";
import { BizShell } from "@/components/biz/BizShell";
export const metadata: Metadata = { title: "Business Dashboard" };
export default function Layout({ children }: { children: React.ReactNode }) {
  return <BizShell>{children}</BizShell>;
}
