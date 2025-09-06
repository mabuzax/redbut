"use client";

import {
  BarChart2,
  UtensilsCrossed,
  Users,
  Settings,
  type LucideIcon
} from "lucide-react";

export type Section =
  | "Analytics"
  | "Food Menu"
  | "Staff"
  | "Owner Dashboard";

export interface GridProps {
  onSelect: (s: Section) => void;
}

const DashboardGrid = ({ onSelect }: GridProps) => {
  const items: { key: Section; label: string; icon: LucideIcon }[] = [
    { key: "Analytics", label: "Analytics", icon: BarChart2 },
    { key: "Food Menu", label: "Food Menu", icon: UtensilsCrossed },
    { key: "Staff", label: "Staff", icon: Users },
    { key: "Owner Dashboard", label: "Owner Dashboard", icon: Settings },
  ];

  return (
    <div className="flex justify-center">
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-5xl">
        {items.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => onSelect(key)}
            className="bg-white border border-gray-200 rounded-lg py-12 flex flex-col items-center justify-center hover:shadow-lg hover:border-primary-300 transition-all duration-200 cursor-pointer group"
          >
            <Icon className="h-12 w-12 text-primary-500 mb-4 group-hover:text-primary-600 transition-colors" />
            <span className="text-base font-medium text-gray-700 group-hover:text-gray-900">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default DashboardGrid;
