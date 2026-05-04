"use client";

import { Icon } from "@iconify/react";
import Image from "next/image";
import { formatStandardDate } from "@/utils/formatDate";

type EquipmentStatus = "neuf" | "bon" | "maintenance" | "hors-service";

interface EquipmentCardProps {
  equipement: {
    _id: string;
    designation: string;
    marque: string;
    etat: EquipmentStatus;
    photo: string;
    derniereMaintenance: string | Date;
  };
}

const statusConfig: Record<EquipmentStatus, { label: string; color: string; icon: string }> = {
  neuf: { label: "Neuf", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", icon: "solar:star-bold" },
  bon: { label: "Bon état", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: "solar:check-circle-bold" },
  maintenance: { label: "Maintenance", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: "solar:settings-bold" },
  "hors-service": { label: "Hors-service", color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400", icon: "solar:danger-bold" },
};

export default function EquipmentCard({ equipement }: EquipmentCardProps) {
  const status = statusConfig[equipement.etat];

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
      <div className="relative h-48 w-full">
        <Image
          src={equipement.photo || "/images/blog/blog_1.jpg"}
          alt={equipement.designation}
          fill
          className="object-cover"
        />
        <div className={`absolute left-3 top-3 flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${status.color}`}>
          <Icon icon={status.icon} className="h-3 w-3" />
          {status.label}
        </div>
      </div>
      <div className="p-4">
        <div className="mb-1 flex items-start justify-between">
          <h3 className="font-bold text-midnight_text dark:text-white">{equipement.designation}</h3>
          <span className="text-xs text-gray-400">{equipement.marque}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <Icon icon="solar:calendar-minimalistic-bold" className="h-3.5 w-3.5" />
          Maintenance : {formatStandardDate(equipement.derniereMaintenance)}
        </div>
      </div>
    </div>
  );
}
