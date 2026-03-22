import { LoginForm } from "@/components/login-form";

export const metadata = {
  title: "Sign In",
  description: "Sign in to your National Fund for Women account.",
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
