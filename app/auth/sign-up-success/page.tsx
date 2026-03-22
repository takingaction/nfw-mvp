import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-nfw-dove">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card className="border-nfw-blackberry/10">
            <CardHeader>
              <CardTitle className="text-2xl font-serif text-nfw-blackberry">
                Thank you for signing up!
              </CardTitle>
              <CardDescription className="text-nfw-blackberry/60">Check your email to confirm</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-nfw-blackberry/60">
                You&apos;ve successfully signed up. Please check your email to
                confirm your account before signing in.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
