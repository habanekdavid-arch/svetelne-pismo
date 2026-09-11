import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main
      className="flex min-h-[70vh] items-center justify-center px-5 py-16"
      style={{ background: "var(--color-background)" }}
    >
      <SignIn />
    </main>
  );
}
