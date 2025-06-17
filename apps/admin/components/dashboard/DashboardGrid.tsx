"use client";

import {
  BrainCircuit,
  BarChart2,
  MessageSquare,
  ShoppingCart,
  Star,
  UtensilsCrossed,
  Users,
  CalendarClock,
  Table2,
  Settings,
  type LucideIcon
} from "lucide-react";

export type Section =
  | "AI Analysis"
  | "Analytics"
  | "Requests"
  | "Orders"
  | "Ratings"
  | "Food Menu"
  | "Staff"
  | "Shifts"
  | "Table Allocations"
  | "Owner Dashboard";

export interface GridProps {
  onSelect: (s: Section) => void;
}

const DashboardGrid = ({ onSelect }: GridProps) => {
  const items: { key: Section; label: string; icon: LucideIcon }[] = [
    { key: "AI Analysis", label: "AI Analysis", icon: BrainCircuit },
    { key: "Analytics", label: "Analytics", icon: BarChart2 },
    { key: "Requests", label: "Requests", icon: MessageSquare },
    { key: "Orders", label: "Orders", icon: ShoppingCart },
    { key: "Ratings", label: "Ratings", icon: Star },
    { key: "Food Menu", label: "Food Menu", icon: UtensilsCrossed },
    { key: "Staff", label: "Staff", icon: Users },
    { key: "Shifts", label: "Shifts", icon: CalendarClock },
    { key: "Table Allocations", label: "Table Allocations", icon: Table2 },
    { key: "Owner Dashboard", label: "Owner Dashboard", icon: Settings },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
      {items.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          onClick={() => onSelect(key)}
          className="bg-white border border-gray-200 rounded-lg py-8 flex flex-col items-center justify-center hover:shadow-md transition cursor-pointer"
        >
          <Icon className="h-8 w-8 text-primary-500 mb-2" />
          <span className="text-sm font-medium text-gray-700">{label}</span>
        </button>
      ))}
    </div>
  );
};

export default DashboardGrid;
