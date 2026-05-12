export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4">
      {/* Dynamic ambient background orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neon-cyan/20 rounded-full mix-blend-screen filter blur-[100px] animate-glow-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neon-purple/20 rounded-full mix-blend-screen filter blur-[100px] animate-glow-pulse" style={{ animationDelay: '1.5s' }} />
      
      {/* Content */}
      <div className="relative z-10 w-full max-w-md animate-slide-up">
        {children}
      </div>
    </div>
  );
}
