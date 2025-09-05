"use client";

import { ArrowLeft } from "lucide-react";
import type { Section } from "./DashboardGrid"; // Import Section type

export interface SectionPlaceholderProps {
  section: Section;
  onBack: () => void;
}

const SectionPlaceholder = ({ section, onBack }: SectionPlaceholderProps) => (
  <div className="bg-white border border-gray-200 rounded-lg p-8">
    <button
      onClick={onBack}
      className="mb-6 inline-flex items-center text-primary-600 hover:underline"
    >
      <ArrowLeft className="mr-3 text-red-800 hover:text-red-900 transition-colors" />
    </button>
    <h3 className="text-xl font-semibold text-gray-900">{section}</h3>
    <p className="text-gray-500 mt-2">This section is under construction.</p>
  </div>
);

export default SectionPlaceholder;
