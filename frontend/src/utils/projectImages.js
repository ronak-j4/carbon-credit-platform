/**
 * Reliable Project Imagery & Category Allocation
 * Provides realistic photography from reliable CDNs with offline/fallback local vector artwork.
 */

export const PROJECT_CATEGORIES = {
  solar: {
    label: "Solar Energy",
    icon: "/icons/solar.png",
    localImage: "/images/projects/solar.jpg",
    photoUrl: "/images/projects/solar.jpg",
    gradient: "linear-gradient(135deg, rgba(2, 132, 199, 0.12), rgba(245, 158, 11, 0.12))",
    badgeColor: "#0284c7",
  },
  wind: {
    label: "Wind Power",
    icon: "/icons/wind.png",
    localImage: "/images/projects/wind.svg",
    photoUrl: "https://images.unsplash.com/photo-1466611653911-95081537e5b7?auto=format&fit=crop&w=900&q=80",
    gradient: "linear-gradient(135deg, rgba(14, 165, 233, 0.12), rgba(34, 197, 94, 0.12))",
    badgeColor: "#0ea5e9",
  },
  forest: {
    label: "Forest & Afforestation",
    icon: "/icons/tree.png",
    localImage: "/images/projects/forest.svg",
    photoUrl: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=900&q=80",
    gradient: "linear-gradient(135deg, rgba(22, 163, 74, 0.15), rgba(5, 150, 105, 0.1))",
    badgeColor: "#16a34a",
  },
  farm: {
    label: "Regenerative Farm & Soil",
    icon: "/icons/tree.png",
    localImage: "/images/projects/farm.svg",
    photoUrl: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=900&q=80",
    gradient: "linear-gradient(135deg, rgba(101, 163, 13, 0.14), rgba(217, 119, 6, 0.1))",
    badgeColor: "#65a30d",
  },
  mangrove: {
    label: "Blue Carbon Mangrove",
    icon: "/icons/tree.png",
    localImage: "/images/projects/mangrove.svg",
    photoUrl: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=900&q=80",
    gradient: "linear-gradient(135deg, rgba(8, 145, 178, 0.16), rgba(22, 163, 74, 0.12))",
    badgeColor: "#0891b2",
  },
  biogas: {
    label: "Biomethane & Waste",
    icon: "/icons/biogas.png",
    localImage: "/images/projects/biogas.svg",
    photoUrl: "https://images.unsplash.com/photo-1532601224476-15c79f2f7a51?auto=format&fit=crop&w=900&q=80",
    gradient: "linear-gradient(135deg, rgba(13, 148, 136, 0.15), rgba(34, 197, 94, 0.1))",
    badgeColor: "#0d9488",
  },
};

/**
 * Automatically allocates the best matching realistic category
 * based on project metadata, name, description, location, or project_type.
 */
export function getProjectCategory(project = {}) {
  const combined = [
    project.project_type || "",
    project.name || "",
    project.location || "",
    project.description || "",
  ]
    .join(" ")
    .toLowerCase();

  // Mangrove & Coastal Blue Carbon detection
  if (
    combined.includes("mangrove") ||
    combined.includes("wetland") ||
    combined.includes("blue carbon") ||
    combined.includes("coastal") ||
    combined.includes("estuary") ||
    combined.includes("tidal")
  ) {
    return "mangrove";
  }

  // Farm & Agricultural Soil Carbon detection
  if (
    combined.includes("farm") ||
    combined.includes("agri") ||
    combined.includes("soil") ||
    combined.includes("crop") ||
    combined.includes("agro") ||
    combined.includes("livestock") ||
    combined.includes("regenerative")
  ) {
    return "farm";
  }

  // Solar detection
  if (
    project.project_type === "Solar" ||
    combined.includes("solar") ||
    combined.includes("photovoltaic") ||
    combined.includes("pv") ||
    combined.includes("sun")
  ) {
    return "solar";
  }

  // Wind detection
  if (
    project.project_type === "Wind" ||
    combined.includes("wind") ||
    combined.includes("turbine") ||
    combined.includes("offshore")
  ) {
    return "wind";
  }

  // Biogas & Waste-to-Energy detection
  if (
    project.project_type === "Biogas" ||
    combined.includes("biogas") ||
    combined.includes("methane") ||
    combined.includes("anaerobic") ||
    combined.includes("digester")
  ) {
    return "biogas";
  }

  // Forest & Afforestation default
  return "forest";
}

/**
 * Returns the primary photography URL and local fallback for a project.
 */
export function getProjectImageData(project = {}) {
  const categoryKey = getProjectCategory(project);
  const category = PROJECT_CATEGORIES[categoryKey] || PROJECT_CATEGORIES.forest;

  return {
    categoryKey,
    label: category.label,
    icon: category.icon,
    photoUrl: category.photoUrl,
    fallbackUrl: category.localImage,
    gradient: category.gradient,
    badgeColor: category.badgeColor,
  };
}
