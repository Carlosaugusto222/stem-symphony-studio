import { useEffect } from "react";

/**
 * Hook leve com IntersectionObserver para entrada suave de seções e cards ao rolar.
 * - Conteúdo acima da dobra aparece imediatamente (sem atrasar a primeira pintura).
 * - Anima estritamente 'opacity' e 'transform: translateY' (sem layout shift).
 * - Desativado automaticamente se o usuário tiver prefers-reduced-motion.
 */
export function useScrollReveal(deps: unknown[] = []) {
  useEffect(() => {
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const elements = document.querySelectorAll<HTMLElement>("[data-reveal]");
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.remove("reveal-pending");
            entry.target.classList.add("reveal-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: "0px 0px -40px 0px",
        threshold: 0.05,
      },
    );

    elements.forEach((el) => {
      // Elementos acima da dobra permanecem visíveis imediatamente
      const rect = el.getBoundingClientRect();
      const isAboveFold = rect.top < window.innerHeight * 0.9;

      if (isAboveFold) {
        el.classList.remove("reveal-pending");
        el.classList.add("reveal-visible");
      } else {
        el.classList.add("reveal-pending");
        observer.observe(el);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, deps);
}
