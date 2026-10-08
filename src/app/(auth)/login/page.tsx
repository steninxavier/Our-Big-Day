import Link from "next/link";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <h1 className="text-3xl font-semibold">Welcome back</h1>
      <p className="mt-3 text-[#75655b]">The sign-in form will connect to the authentication API scaffold.</p>
      <Link className="mt-8 text-[#a44932] underline" href="/signup">Create an account</Link>
    </main>
  );
}
