"use client";

import { useEffect } from "react";

/**
 * `trigger` değiştiğinde (ör. sunucudan hata döndüğünde) sayfadaki ilk hatalı alana odaklanır.
 * Kullanıcı yazarken odağı çalmamak için yalnızca gönderim sonrası değişen bir değer verilmelidir.
 */
export function useFocusFirstError(trigger: unknown) {
  useEffect(() => {
    if (!trigger) return;
    const el = document.querySelector<HTMLElement>('[aria-invalid="true"]');
    if (el) {
      el.focus({ preventScroll: true });
      el.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [trigger]);
}
