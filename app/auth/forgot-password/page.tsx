import { ForgotPasswordForm } from "@/components/forgot-password-form";

export const metadata = {
  title: "Reset Password",
  description: "Reset your National Fund for Women account password.",
};

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
