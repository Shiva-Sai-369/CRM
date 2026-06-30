import { redirect } from "next/navigation";

export default function HomePage() {
  // Middleware will handle the redirect based on auth status and role
  redirect("/login");
}
