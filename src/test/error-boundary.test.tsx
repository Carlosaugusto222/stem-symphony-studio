import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "@/components/error-boundary";

function ProblemChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error("Erro de teste simulado");
  }
  return <div>Conteúdo normal renderizado</div>;
}

describe("ErrorBoundary", () => {
  it("renders children when no error occurs", () => {
    render(
      <ErrorBoundary>
        <ProblemChild shouldThrow={false} />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Conteúdo normal renderizado")).toBeInTheDocument();
  });

  it("catches render errors and displays friendly fallback UI without technical leaks", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ProblemChild shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Algo inesperado aconteceu")).toBeInTheDocument();
    expect(screen.getByText("Tentar de novo")).toBeInTheDocument();
    expect(screen.queryByText("Erro de teste simulado")).not.toBeInTheDocument();

    spy.mockRestore();
  });
});
