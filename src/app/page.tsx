import UploadForm from "@/components/UploadForm";

export default function Home() {
  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h1 className="text-2xl font-bold leading-tight">You&apos;re paying for things you forgot you have.</h1>
        <p className="text-slate-600">
          Upload 3 to 12 months of statements. We find recurring charges, unmask the ones hidden behind PayPal, Apple or
          Paddle, and show what you could stop paying for.
        </p>
      </section>
      <UploadForm />
    </div>
  );
}
