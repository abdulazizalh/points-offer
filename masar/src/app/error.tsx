"use client";
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-bg p-6 text-center">
      <div>
        <h1 className="text-[20px] font-semibold text-navy">Something went wrong · حدث خطأ ما</h1>
        <p className="mt-2 text-[14px] text-muted">Please try again in a moment. · يرجى المحاولة بعد قليل.</p>
        <button onClick={reset} className="mt-6 inline-flex h-11 items-center rounded-2xl bg-navy px-5 text-[14px] font-semibold text-white">Try again · حاول مجدداً</button>
      </div>
    </div>
  );
}
