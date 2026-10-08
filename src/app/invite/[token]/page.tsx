type InvitationPageProps = {
  params: Promise<{ token: string }>;
};

export default async function InvitationPage({ params }: InvitationPageProps) {
  await params;

  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center px-6 py-12 text-center">
      <div className="w-full rounded-3xl border border-[#eadfd7] bg-white p-10 shadow-sm">
        <h1 className="text-3xl font-semibold">You&apos;re invited</h1>
        <p className="mt-4 text-[#75655b]">The token-protected invitation and RSVP experience will render here.</p>
      </div>
    </main>
  );
}
