"use client";

import Form from "next/form";
import { useRef, type ComponentProps } from "react";

/**
 * Seçim değişince kendini gönderen GET formu (filtreler için).
 * Şehir değişirse ilçe seçimi sıfırlanır. JS yoksa normal "Filtrele" düğmesiyle çalışır.
 */
export function AutoSubmitForm({ children, ...props }: ComponentProps<typeof Form>) {
  const ref = useRef<HTMLFormElement>(null);
  return (
    <Form
      ref={ref}
      {...props}
      onChange={(e) => {
        const target = e.target as unknown as HTMLInputElement | HTMLSelectElement;
        const isToggle = target instanceof HTMLSelectElement || (target instanceof HTMLInputElement && target.type === "checkbox");
        if (!isToggle) return;
        if (target.name === "sehir") {
          const district = ref.current?.elements.namedItem("ilce") as HTMLSelectElement | null;
          if (district) district.value = "";
        }
        ref.current?.requestSubmit();
      }}
    >
      {children}
    </Form>
  );
}
