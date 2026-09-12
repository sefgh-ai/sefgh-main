"use client";

export function SearchHeader() {
  return (
    <div className="text-center mb-6">
      <h1 className="text-4xl font-bold mb-3 animate-float">
        Search{" "}
        <span className="bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-500 bg-clip-text text-transparent">
          GitHub Repositories
        </span>
      </h1>
      <p className="text-xl text-muted-foreground">
        Find exactly what you need across millions of repositories
      </p>
    </div>
  );
}
