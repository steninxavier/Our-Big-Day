type WeddingWebsitePageProps = {
  params: Promise<{ slug: string }>;
};

export default async function WeddingWebsitePage({ params }: WeddingWebsitePageProps) {
  const { slug } = await params;

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-12 text-center">
      <div className="w-full rounded-3xl border border-[#eadfd7] bg-white p-10 shadow-sm">
        <p className="text-sm font-semibold tracking-[0.18em] text-[#a44932] uppercase">Wedding website</p>
        <h1 className="mt-4 text-4xl font-semibold">{slug}</h1>
        <p className="mt-4 text-[#75655b]">Published wedding details will be rendered here.</p>
      </div>
    </main>
  );
}
