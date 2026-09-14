export const PROJECT_TYPE_ICONS = {
  Solar: "/icons/solar.png",
  Wind: "/icons/wind.png",
  TreePlantation: "/icons/tree.png",
  Biogas: "/icons/biogas.png",
};

export function getProjectTypeIcon(projectType) {
  return PROJECT_TYPE_ICONS[projectType] || "/icons/tree.png";
}
