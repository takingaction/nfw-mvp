import { LoginForm } from "@/components/login-form";

export const metadata = {
  title: "Member Login | National Fund for Women",
  description:
    "Access your National Fund for Women membership account to explore perks, resources, and community programs designed for members.",
};

export default function Page() {
  return (
    <div className="flex min-h-[calc(100svh-4rem)] w-full items-center justify-center p-6 md:p-8 bg-nfw-dove">
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  );
}