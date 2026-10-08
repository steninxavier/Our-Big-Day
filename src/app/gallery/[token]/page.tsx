type GalleryPageProps = {
  params: Promise<{ token: string }>;
};

export default async function GalleryPage({ params }: GalleryPageProps) {
  await params;

  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center px-6 py-12 text-center">
      <div className="w-full rounded-3xl border border-[#eadfd7] bg-white p-10 shadow-sm">
        <h1 className="text-3xl font-semibold">Wedding gallery</h1>
        <p className="mt-4 text-[#75655b]">This private token-protected gallery will render photos and upload controls.</p>
      </div>
    </main>
  );
}
