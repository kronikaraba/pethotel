import { Bone, HeartPulse, Microscope, PawPrint, Scan, Scissors, Smile, Stethoscope, Syringe, type LucideIcon } from "lucide-react";
import type { ServiceCategory } from "@/lib/constants";

export const CATEGORY_ICONS: Record<ServiceCategory, LucideIcon> = {
  muayene: Stethoscope,
  asi: Syringe,
  checkup: Microscope,
  dis: Smile,
  cerrahi: HeartPulse,
  goruntuleme: Scan,
  bakim: Scissors,
  diger: PawPrint,
};

export const FallbackCategoryIcon = Bone;
