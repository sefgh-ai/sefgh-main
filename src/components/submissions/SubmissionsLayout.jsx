export default function SubmissionsLayout({ children, title, subtitle }) {
  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-background via-background to-accent/20 p-8">
      <div className="max-w-7xl mx-auto">
        {(title || subtitle) && (
          <div className="mb-8">
            {title && <h1 className="text-3xl font-bold mb-2">{title}</h1>}
            {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
