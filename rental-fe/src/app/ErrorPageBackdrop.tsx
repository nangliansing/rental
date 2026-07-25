export function ErrorPageBackdrop() {
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-[linear-gradient(145deg,#e7eef8_0%,#f8fafc_38%,#eef1f8_68%,#e4ebf6_100%)]" />

      <div className="error-page-aurora error-page-aurora--one absolute -left-[16%] top-[-18%] h-[72vmin] w-[72vmin] rounded-full bg-[radial-gradient(circle,rgba(125,165,220,0.55)_0%,rgba(125,165,220,0)_68%)] blur-3xl" />
      <div className="error-page-aurora error-page-aurora--two absolute -right-[12%] top-[4%] h-[64vmin] w-[64vmin] rounded-full bg-[radial-gradient(circle,rgba(164,176,220,0.48)_0%,rgba(164,176,220,0)_70%)] blur-3xl" />
      <div className="error-page-aurora error-page-aurora--three absolute bottom-[-22%] left-[18%] h-[70vmin] w-[70vmin] rounded-full bg-[radial-gradient(circle,rgba(196,181,214,0.42)_0%,rgba(196,181,214,0)_72%)] blur-3xl" />
      <div className="error-page-aurora absolute bottom-[-8%] right-[-8%] h-[52vmin] w-[52vmin] rounded-full bg-[radial-gradient(circle,rgba(151,196,220,0.35)_0%,rgba(151,196,220,0)_68%)] blur-3xl" />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.9),transparent_48%)]" />
      <div className="absolute inset-0 opacity-[0.28] [background-image:radial-gradient(rgba(15,23,42,0.16)_0.55px,transparent_0.55px)] [background-size:20px_20px]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,rgba(255,255,255,0.18)_100%)]" />
    </div>
  )
}
