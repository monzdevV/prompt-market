"use client";

import {
  ArrowsClockwise,
  Bell,
  CheckSquare,
  EnvelopeSimple,
  NotePencil,
  Phone,
  UsersThree,
  type Icon,
} from "@phosphor-icons/react";
import type { TipoInteraccion } from "@/lib/b2b";

export const ICONO_INTERACCION: Record<TipoInteraccion, Icon> = {
  llamada: Phone,
  email: EnvelopeSimple,
  reunion: UsersThree,
  nota: NotePencil,
  tarea: CheckSquare,
  seguimiento: Bell,
  cambio_etapa: ArrowsClockwise,
};
